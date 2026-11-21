-- ============================================================================
-- BloodLink: Migration 006 — Problem Statement 2.2 Production Engine & Seed
-- ============================================================================
-- Run this directly in your Supabase SQL Editor so your database has the
-- updated RPC functions, verified Pune hospitals, and realistic Pune sample donors.
-- ============================================================================

-- ============================================================================
-- 1. SCHEMA ADDITIONS FOR PS 2.2 READINESS
-- ============================================================================
alter table donors
  add column if not exists campus_or_community text,
  add column if not exists last_lean_reminder_at timestamptz;

alter table requisitions
  add column if not exists fulfilled_at timestamptz;

create table if not exists lean_month_reminders (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references donors(id) on delete cascade,
  season_label text not null,
  sent_at timestamptz not null default now()
);

-- ============================================================================
-- 2. ATOMIC RPC: DISPATCH CAPPED WAVE (EXACT MATCH + NBTC COOLDOWN FILTER)
-- ============================================================================
create or replace function dispatch_donor_wave(
  p_requisition_id uuid,
  p_wave_cap int default 12
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_req requisitions%rowtype;
  v_total_in_radius int := 0;
  v_excluded_cooldown int := 0;
  v_newly_pinged int := 0;
  v_next_wave int;
begin
  select * into v_req from requisitions where id = p_requisition_id for update;

  if not found or v_req.status <> 'VERIFIED_ACTIVE' or v_req.units_accepted >= v_req.units_needed then
    return jsonb_build_object('ok', false, 'reason', 'REQUISITION_NOT_ACTIVE');
  end if;

  -- Count total blood-group compatible donors in current radius (for demo transparency)
  select count(*) into v_total_in_radius
  from donors d
  where (d.blood_group = v_req.blood_group or (v_req.allow_o_neg_substitute and d.blood_group = 'O-'))
    and d.is_available = true
    and st_dwithin(d.location, v_req.hospital_location, v_req.current_radius_meters);

  -- Auto-expand radius if fewer than 3 donors exist in initial 3km radius
  if v_total_in_radius < 3 and v_req.current_radius_meters < 15000 then
    update requisitions
    set current_radius_meters = case when current_radius_meters = 3000 then 7000 else 15000 end
    where id = p_requisition_id
    returning * into v_req;
  end if;

  -- Count how many nearby donors were safely excluded due to NBTC cooldown
  select count(*) into v_excluded_cooldown
  from donors d
  where (d.blood_group = v_req.blood_group or (v_req.allow_o_neg_substitute and d.blood_group = 'O-'))
    and d.is_available = true
    and d.cooldown_until > now()
    and st_dwithin(d.location, v_req.hospital_location, v_req.current_radius_meters);

  v_next_wave := v_req.current_wave + 1;

  with ranked_donors as (
    select
      d.id as donor_id,
      round((st_distance(d.location, v_req.hospital_location) / 1000.0)::numeric, 2) as dist_km
    from donors d
    where (d.blood_group = v_req.blood_group or (v_req.allow_o_neg_substitute and d.blood_group = 'O-'))
      and d.is_available = true
      and d.cooldown_until <= now()
      and st_dwithin(d.location, v_req.hospital_location, v_req.current_radius_meters)
      and not exists (
        select 1 from dispatch_waves dw
        where dw.requisition_id = p_requisition_id and dw.donor_id = d.id
      )
      and not exists (
        select 1 from dispatch_waves dw2
        where dw2.donor_id = d.id
          and dw2.response_status in ('PINGED', 'ACCEPTED')
          and dw2.pinged_at > now() - interval '2 hours'
      )
    order by st_distance(d.location, v_req.hospital_location) asc
    limit p_wave_cap
  ),
  inserted as (
    insert into dispatch_waves (requisition_id, donor_id, wave_number, distance_km, response_status)
    select p_requisition_id, donor_id, v_next_wave, dist_km, 'PINGED'
    from ranked_donors
    returning id
  )
  select count(*) into v_newly_pinged from inserted;

  update requisitions set current_wave = v_next_wave where id = p_requisition_id;

  return jsonb_build_object(
    'ok', true,
    'wave_number', v_next_wave,
    'radius_km', v_req.current_radius_meters / 1000.0,
    'total_compatible_nearby', v_total_in_radius,
    'excluded_by_nbtc_cooldown', v_excluded_cooldown,
    'newly_pinged', v_newly_pinged
  );
end;
$$;

-- ============================================================================
-- 3. ATOMIC RPC: DONOR RESPONSE + INSTANT AUTO-EXPIRATION WHEN NEED IS MET
-- ============================================================================
create or replace function respond_to_wave(
  p_donor_token uuid,
  p_wave_id uuid,
  p_action text -- 'ACCEPTED' or 'SNOOZED'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_donor_id uuid;
  v_wave dispatch_waves%rowtype;
  v_req requisitions%rowtype;
begin
  select id into v_donor_id from donors where donor_token = p_donor_token;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_DONOR_TOKEN');
  end if;

  select * into v_wave from dispatch_waves where id = p_wave_id and donor_id = v_donor_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'WAVE_NOT_FOUND');
  end if;

  select * into v_req from requisitions where id = v_wave.requisition_id for update;

  if v_req.status in ('FULFILLED', 'EXPIRED', 'REJECTED') or v_req.units_accepted >= v_req.units_needed then
    return jsonb_build_object('ok', false, 'reason', 'NEED_ALREADY_MET', 'fulfilled_at', v_req.fulfilled_at);
  end if;

  if p_action = 'ACCEPTED' then
    update dispatch_waves
    set response_status = 'ACCEPTED',
        responded_at = now(),
        arrival_deadline = now() + interval '45 minutes'
    where id = p_wave_id;

    update requisitions
    set units_accepted = units_accepted + 1,
        status = case when (units_accepted + 1) >= units_needed then 'FULFILLED' else status end,
        fulfilled_at = case when (units_accepted + 1) >= units_needed then now() else fulfilled_at end
    where id = v_req.id
    returning * into v_req;

    -- Auto-expire all remaining open pings immediately when need is met
    if v_req.status = 'FULFILLED' then
      update dispatch_waves
      set response_status = 'SNOOZED'
      where requisition_id = v_req.id and response_status = 'PINGED';
    end if;

    return jsonb_build_object('ok', true, 'status', 'ACCEPTED', 'requisition_status', v_req.status);

  elsif p_action = 'SNOOZED' then
    update dispatch_waves
    set response_status = 'SNOOZED', responded_at = now()
    where id = p_wave_id;

    -- Immediate 1-donor backfill from PostGIS queue
    perform dispatch_donor_wave(v_req.id, 1);
    return jsonb_build_object('ok', true, 'status', 'SNOOZED_BACKFILLED');
  end if;

  return jsonb_build_object('ok', false, 'reason', 'INVALID_ACTION');
end;
$$;

-- ============================================================================
-- 4. LEAN-MONTH REGULAR DONATION REMINDER QUERY (SUMMER & FESTIVAL MONTHS)
-- ============================================================================
create or replace function get_lean_month_eligible_donors(p_limit int default 25)
returns table (
  donor_id uuid,
  donor_token uuid,
  full_name text,
  blood_group text,
  campus_or_community text,
  days_since_eligible int,
  season_context text
)
language sql
security definer
as $$
  select
    d.id,
    d.donor_token,
    d.full_name,
    d.blood_group,
    coalesce(d.campus_or_community, d.locality_label),
    greatest(0, extract(day from (now() - d.cooldown_until))::int) as days_since_eligible,
    case
      when extract(month from now()) in (3, 4, 5) then 'Summer Lean Season (Up to 50% donation dip)'
      when extract(month from now()) in (8, 9, 10, 11) then 'Festival Lean Season (Ganpati / Diwali blood bank dip)'
      else 'Post-Cooldown Regular Voluntary Donor Nudge'
    end as season_context
  from donors d
  where d.is_available = true
    and d.cooldown_until <= now()
    and (d.last_lean_reminder_at is null or d.last_lean_reminder_at < now() - interval '30 days')
  order by d.cooldown_until asc
  limit p_limit;
$$;

-- ============================================================================
-- 5. PUNE DEMO SEED DATA (VERIFIED HOSPITALS + SAMPLE B+ & MULTI-GROUP DONORS)
-- ============================================================================
insert into verified_hospitals (name, area_label, official_bloodbank_phone, location) values
  ('Deenanath Mangeshkar Hospital Blood Bank', 'Erandwane / Deccan', '+912040151000', st_setsrid(st_makepoint(73.8327, 18.5023), 4326)::geography),
  ('Sahyadri Super Speciality Hospital', 'Deccan Gymkhana', '+912067213000', st_setsrid(st_makepoint(73.8415, 18.5158), 4326)::geography),
  ('Poona Hospital & Research Centre', 'Sadashiv Peth', '+912066096000', st_setsrid(st_makepoint(73.8475, 18.5065), 4326)::geography),
  ('Jankalyan Raktapedhi (Blood Bank)', 'Sadashiv Peth / Tilak Road', '+912024472288', st_setsrid(st_makepoint(73.8489, 18.5091), 4326)::geography),
  ('Bharati Hospital Blood Bank', 'Dhankawadi / Sinhagad Rd', '+912024371116', st_setsrid(st_makepoint(73.8567, 18.4575), 4326)::geography)
on conflict do nothing;

-- Seed 20 realistic Pune donors (mix of eligible B+, cooldown B+, and other groups around FC Rd / Deccan / Sinhagad Rd)
insert into donors (full_name, whatsapp_phone, biological_sex, blood_group, location, locality_label, campus_or_community, is_available, cooldown_until) values
  ('Aarav Kulkarni', '+919822000101', 'MALE', 'B+', st_setsrid(st_makepoint(73.8390, 18.5195), 4326)::geography, 'FC Road', 'Fergusson College', true, now() - interval '10 days'),
  ('Sneha Deshmukh', '+919822000102', 'FEMALE', 'B+', st_setsrid(st_makepoint(73.8350, 18.5080), 4326)::geography, 'Erandwane', 'Fergusson College', true, now() - interval '45 days'),
  ('Rohan Joshi', '+919822000103', 'MALE', 'B+', st_setsrid(st_makepoint(73.8460, 18.5120), 4326)::geography, 'Deccan Gymkhana', 'SPPU', true, now() - interval '5 days'),
  ('Ananya Patil', '+919822000104', 'FEMALE', 'B+', st_setsrid(st_makepoint(73.8310, 18.4980), 4326)::geography, 'Dattawadi', 'Sinhagad Road', true, now() - interval '20 days'),
  ('Siddharth Gokhale', '+919822000105', 'MALE', 'B+', st_setsrid(st_makepoint(73.8510, 18.5280), 4326)::geography, 'Shivajinagar', 'COEP', true, now() - interval '95 days'),
  ('Priya Nair', '+919822000106', 'FEMALE', 'B+', st_setsrid(st_makepoint(73.8250, 18.5070), 4326)::geography, 'Kothrud', 'MIT-WPU', true, now() - interval '15 days'),
  ('Omkar Shinde', '+919822000107', 'MALE', 'B+', st_setsrid(st_makepoint(73.8380, 18.4850), 4326)::geography, 'Sinhagad Road', 'Sinhagad Road', true, now() - interval '60 days'),
  ('Tanvi Chitale', '+919822000108', 'FEMALE', 'B+', st_setsrid(st_makepoint(73.8490, 18.5040), 4326)::geography, 'Sadashiv Peth', 'SP College', true, now() - interval '2 days'),
  -- Donors currently on active NBTC cooldown (demonstrates automatic exclusion!)
  ('Vikram Bhosale', '+919822000109', 'MALE', 'B+', st_setsrid(st_makepoint(73.8340, 18.5035), 4326)::geography, 'Erandwane', 'Fergusson College', true, now() + interval '52 days'),
  ('Neha Kelkar', '+919822000110', 'FEMALE', 'B+', st_setsrid(st_makepoint(73.8420, 18.5140), 4326)::geography, 'Deccan Gymkhana', 'BMCC', true, now() + interval '88 days'),
  ('Pranav Dixit', '+919822000111', 'MALE', 'B+', st_setsrid(st_makepoint(73.8440, 18.5090), 4326)::geography, 'Tilak Road', 'SP College', true, now() + interval '19 days'),
  -- Additional Blood Groups (O+, O-, A+, AB+)
  ('Aditya Ranade', '+919822000112', 'MALE', 'O+', st_setsrid(st_makepoint(73.8375, 18.5170), 4326)::geography, 'FC Road', 'Fergusson College', true, now() - interval '30 days'),
  ('Kavita More', '+919822000113', 'FEMALE', 'O-', st_setsrid(st_makepoint(73.8330, 18.5050), 4326)::geography, 'Erandwane', 'Fergusson College', true, now() - interval '40 days'),
  ('Harshad Sawant', '+919822000114', 'MALE', 'A+', st_setsrid(st_makepoint(73.8290, 18.4920), 4326)::geography, 'Anand Nagar', 'Sinhagad Road', true, now() - interval '12 days'),
  ('Meera Patwardhan', '+919822000115', 'FEMALE', 'AB+', st_setsrid(st_makepoint(73.8470, 18.5180), 4326)::geography, 'JM Road', 'COEP', true, now() - interval '25 days')
on conflict (whatsapp_phone) do nothing;

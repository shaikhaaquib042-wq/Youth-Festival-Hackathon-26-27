begin;

-- Keep public reads and owner checks. Anonymous Auth accounts can add cooling
-- points but cannot file rain reports or cast votes. Missing claims fail closed.
create policy "anonymous accounts only add cooling points"
  on public.reports as restrictive for insert to authenticated
  with check (type = 'cooling' or (select auth.jwt() ->> 'is_anonymous') = 'false');

create policy "only permanent users cast votes"
  on public.report_votes as restrictive for insert to authenticated
  with check ((select auth.jwt() ->> 'is_anonymous') = 'false');

create policy "only permanent users change votes"
  on public.report_votes as restrictive for update to authenticated
  using ((select auth.jwt() ->> 'is_anonymous') = 'false')
  with check ((select auth.jwt() ->> 'is_anonymous') = 'false');

-- Restrict client write columns even if the project's defaults granted full
-- table writes. Votes go through cast_report_vote below.
revoke insert on public.reports from public, anon, authenticated;
grant insert (city, type, lat, lng, depth, in_underpass, passable_bike,
  passable_car, cause, amenities, name, photo) on public.reports to authenticated;

revoke insert, update, delete on public.report_votes from public, anon, authenticated;

-- Hide account UUIDs from both public and signed-in Data API readers.
revoke select on public.reports, public.report_votes from public, anon, authenticated;
grant select (id, city, type, lat, lng, depth, in_underpass, passable_bike,
  passable_car, cause, amenities, name, photo, created_at)
  on public.reports to anon, authenticated;
grant select (report_id, vote, created_at) on public.report_votes to anon, authenticated;

-- Check new submissions without rewriting existing reports. A JPEG-shaped
-- data URL is not proof that its bytes decode to a JPEG or that a photo is genuine.
alter table public.reports
  add constraint reports_photo_jpeg check (
    photo is null or (
      octet_length(photo) <= 200000
      and photo ~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$'
      and (octet_length(photo) - 23) % 4 = 0
    )
  ) not valid,
  add constraint reports_amenities_count check (cardinality(amenities) <= 6) not valid;

-- Retain successful submissions independently of deletable public reports.
-- The UPSERT takes a per-user row lock, so concurrent submissions are counted
-- together. At steady state each account stores up to five timestamps.
create schema sajag_private;
revoke all on schema sajag_private from public, anon, authenticated;
create table sajag_private.report_submission_quota (
  user_id uuid primary key references auth.users (id) on delete cascade,
  submitted_at timestamptz[] not null
);
alter table sajag_private.report_submission_quota enable row level security;
revoke all on sajag_private.report_submission_quota from public, anon, authenticated;

create function sajag_private.record_report_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_at timestamptz := pg_catalog.clock_timestamp();
  recent_count integer;
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  new.created_at := attempt_at;

  insert into sajag_private.report_submission_quota as quota (user_id, submitted_at)
  values (new.user_id, array[attempt_at])
  on conflict (user_id) do update
    set submitted_at = array(
      select previous_time
      from pg_catalog.unnest(quota.submitted_at) as previous(previous_time)
      where previous_time > attempt_at - interval '30 minutes'
    ) || excluded.submitted_at
  returning pg_catalog.cardinality(submitted_at) into recent_count;

  if recent_count > 5 then
    raise exception 'rate_limited: max 5 reports per 30 minutes' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke execute on function sajag_private.record_report_submission() from public, anon, authenticated;
drop trigger reports_rate_limit on public.reports;
drop function public.reports_rate_limit();
create trigger reports_rate_limit before insert on public.reports
  for each row execute function sajag_private.record_report_submission();

create function sajag_private.guard_report_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_owner uuid;
  report_type text;
begin
  if tg_op = 'UPDATE' and (new.report_id, new.user_id) is distinct from (old.report_id, old.user_id) then
    raise exception 'vote_identity_immutable' using errcode = 'P0001';
  end if;
  select r.user_id, r.type into report_owner, report_type from public.reports r where r.id = new.report_id;
  if not found or report_type not in ('flood', 'clog') then
    raise exception 'votes_only_on_flood_reports' using errcode = 'P0001';
  end if;
  if report_owner = new.user_id then
    raise exception 'cannot_vote_own_report' using errcode = 'P0001';
  end if;
  new.created_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

revoke execute on function sajag_private.guard_report_vote() from public, anon, authenticated;
create trigger report_votes_guard before insert or update on public.report_votes
  for each row execute function sajag_private.guard_report_vote();

-- The caller can only act as their signed-in permanent identity.
create function public.cast_report_vote(target_report_id uuid, vote_value text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  voter uuid := auth.uid();
begin
  if voter is null or (auth.jwt() ->> 'is_anonymous') is distinct from 'false' then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  insert into public.report_votes (report_id, user_id, vote)
    values (target_report_id, voter, vote_value)
    on conflict (report_id, user_id) do update set vote = excluded.vote
    where report_votes.vote <> excluded.vote;
end;
$$;

create function public.my_reports(max_rows integer default 100)
returns setof public.reports
language sql stable security definer
set search_path = ''
as $$
  select r.* from public.reports r
  where r.user_id = (select auth.uid())
  order by r.created_at desc, r.id
  limit least(greatest(coalesce(max_rows, 100), 0), 500)
$$;

-- Keep the distinct-person metric without returning any other account's UUID.
create function public.my_report_votes_received(report_ids uuid[])
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  with owned_reports as (
    select r.id, r.user_id from public.reports r
    where r.user_id = (select auth.uid()) and r.id = any(report_ids)
    order by r.created_at desc, r.id
    limit 500
  )
  select jsonb_build_object(
    'votes', coalesce(jsonb_agg(jsonb_build_object('report_id', v.report_id, 'vote', v.vote)), '[]'::jsonb),
    'helped', count(distinct v.user_id) filter (where v.vote = 'still')
  )
  from owned_reports r join public.report_votes v on v.report_id = r.id and v.user_id <> r.user_id
$$;

revoke execute on function public.cast_report_vote(uuid, text), public.my_reports(integer),
  public.my_report_votes_received(uuid[]) from public, anon, authenticated;
grant execute on function public.cast_report_vote(uuid, text), public.my_reports(integer),
  public.my_report_votes_received(uuid[]) to authenticated;

-- The vote key contains a user UUID. Publish an invalidation row keyed by
-- report instead, so even a Realtime DELETE contains no account UUID.
create table public.report_vote_activity (
  report_id uuid primary key references public.reports (id) on delete cascade,
  city text not null,
  changed_at timestamptz not null
);
alter table public.report_vote_activity enable row level security;
create policy "vote activity is public"
  on public.report_vote_activity for select to anon, authenticated using (true);
revoke all on public.report_vote_activity from public, anon, authenticated;
grant select on public.report_vote_activity to anon, authenticated;

create function sajag_private.notify_report_vote_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := case when tg_op = 'DELETE' then old.report_id else new.report_id end;
begin
  insert into public.report_vote_activity (report_id, city, changed_at)
    select r.id, r.city, pg_catalog.clock_timestamp() from public.reports r where r.id = target
    on conflict (report_id) do update set changed_at = excluded.changed_at;
  return null;
end;
$$;

revoke execute on function sajag_private.notify_report_vote_activity() from public, anon, authenticated;
create trigger report_vote_activity_changed after insert or update or delete on public.report_votes
  for each row execute function sajag_private.notify_report_vote_activity();

alter publication supabase_realtime drop table public.reports, public.report_votes;
alter publication supabase_realtime add table public.reports
  (id, city, type, lat, lng, depth, in_underpass, passable_bike, passable_car,
   cause, amenities, name, photo, created_at), public.report_vote_activity;

commit;

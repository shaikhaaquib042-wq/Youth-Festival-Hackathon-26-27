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
-- table writes. The vote client upserts with both key columns in its payload.
revoke insert on public.reports from public, anon, authenticated;
grant insert (city, type, lat, lng, depth, in_underpass, passable_bike,
  passable_car, cause, amenities, name, photo) on public.reports to authenticated;

revoke insert, update on public.report_votes from public, anon, authenticated;
grant insert (report_id, user_id, vote), update (report_id, user_id, vote)
  on public.report_votes to authenticated;

-- Check new submissions without rewriting existing reports. A JPEG-shaped
-- data URL is not proof that its bytes decode to a JPEG or that a photo is genuine.
alter table public.reports
  add constraint reports_photo_jpeg check (
    photo is null or (
      octet_length(photo) <= 400000
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

commit;

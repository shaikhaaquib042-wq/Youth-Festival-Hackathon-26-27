-- Sajag: citizen reports + votes (PRD §22.4, §22.5)
-- Read: everyone (anon). Write: signed-in users, only as themselves. Rate limit enforced in the DB.

-- ── reports ─────────────────────────────────────────────────────────────────
create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  city          text not null default 'pune' check (city ~ '^[a-z]{2,20}$'),
  type          text not null check (type in ('flood', 'clog', 'cooling')),
  lat           double precision not null check (lat between -90 and 90),
  lng           double precision not null check (lng between -180 and 180),
  depth         text not null default 'none' check (depth in ('none', 'ankle', 'knee', 'above_knee')),
  in_underpass  boolean not null default false,
  passable_bike boolean not null default true,
  passable_car  boolean not null default true,
  cause         text not null default 'unknown'
                check (cause in ('rain', 'clogged_drain', 'nullah_overflow', 'river_dam', 'unknown')),
  amenities     text[] check (amenities is null or amenities <@ array['water', 'shade', 'ors', 'clinic', 'toilet', 'cool_room']),
  name          text check (name is null or length(name) <= 120),          -- nearest landmark
  photo         text check (photo is null or length(photo) <= 400000),     -- small compressed dataURL (prototype)
  created_at    timestamptz not null default now()
);

comment on table public.reports is 'Citizen hazard reports (flood / clog / cooling point). Public read, authenticated insert.';

create index reports_city_created_idx on public.reports (city, created_at desc);
create index reports_user_created_idx on public.reports (user_id, created_at desc);

alter table public.reports enable row level security;

create policy "reports are public"
  on public.reports for select
  to anon, authenticated
  using (true);

create policy "signed-in users report as themselves"
  on public.reports for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "reporters can delete their own report"
  on public.reports for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Rate limit: max 5 reports per user per 30 minutes (PRD §22.3).
create function public.reports_rate_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (
    select count(*) from public.reports r
    where r.user_id = new.user_id
      and r.created_at > now() - interval '30 minutes'
  ) >= 5 then
    raise exception 'rate_limited: max 5 reports per 30 minutes'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger reports_rate_limit
  before insert on public.reports
  for each row execute function public.reports_rate_limit();

-- ── report_votes ("still there" / "cleared") ────────────────────────────────
create table public.report_votes (
  report_id  uuid not null references public.reports (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vote       text not null check (vote in ('still', 'cleared')),
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create index report_votes_report_idx on public.report_votes (report_id);

alter table public.report_votes enable row level security;

create policy "votes are public"
  on public.report_votes for select
  to anon, authenticated
  using (true);

create policy "signed-in users vote as themselves"
  on public.report_votes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users can change their own vote"
  on public.report_votes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── Data API exposure (explicit — newer projects don't auto-grant) ──────────
grant select on public.reports to anon, authenticated;
grant insert, delete on public.reports to authenticated;
grant select on public.report_votes to anon, authenticated;
grant insert, update on public.report_votes to authenticated;
revoke execute on function public.reports_rate_limit() from public, anon, authenticated;

-- ── Realtime: new pins / votes appear on every screen ───────────────────────
alter publication supabase_realtime add table public.reports, public.report_votes;

# Sajag: DB / RLS + auth review (read-only)

Reviewer: Claude (second worker). Scope: `supabase/migrations/20261121084811_reports_and_votes.sql`, `src/backend/reports.js`, `src/backend/auth.js` (`ensureAnonUser`), and `fetchMyReports` in the orchestrator checkout.
**I applied nothing to the hosted DB and wrote no migration.** Codex owns `supabase/migrations/20261121134445_harden_citizen_report_writes.sql`. The SQL below is a recommendation for that file.

Key fact behind most findings: a Supabase **anonymous session uses the `authenticated` role**. Every `to authenticated` policy therefore also applies to anonymous users. Today the only thing stopping an anonymous user from writing flood reports and votes is the UI. The DB does not check.

## Findings

| # | Sev | file:line | Issue | Exploit | Fix (SQL below) |
|---|---|---|---|---|---|
| D1 | **High** | migration:39-42, 98-101 | Anonymous users can insert **flood/clog** reports and **votes**. RLS only checks `auth.uid() = user_id`. | Run `signInAnonymously()` with the publishable key from the bundle, then POST `/rest/v1/reports` with `type:'flood', depth:'knee'`. The result is a RED pin on a real road with no login. | S1: restrictive policies that require `is_anonymous = false` except for `type='cooling'`. |
| D2 | **High** | migration:46-70 | The rate limit is **per identity**, and anonymous identities are free. The rate limit also uses `created_at`, which the client can set. | (a) Make a new anonymous session per 5 reports, which gives unlimited reports. (b) Send `created_at: '2020-01-01'` and the trigger's 30-min count never sees these rows, so there is no limit even for one user. Back-dating or future-dating also breaks the pin lifecycle: a future `created_at` gives a pin that never expires. | S2: a trigger forces `created_at = now()` and `user_id = auth.uid()`, plus a per-user advisory lock against the concurrent-insert race. D1 removes anonymous accounts from flood reports. For cooling, keep the per-user limit and turn on Auth → Rate limits → anonymous sign-ins (default 30/h/IP), plus CAPTCHA (Turnstile) if possible. |
| D3 | **High** | migration:98-108, reports.js:16-24 | **Forged confirmations.** (a) A user can vote `still` on **their own** report. `fetchReports`/`rowToPin` count every `still` vote, so the reporter self-confirms. (b) Together with D1, N anonymous sessions give N confirmations, and an unverified pin turns into a confirmed RED one. (c) `created_at` on votes can be set by the client. (d) The UPDATE policy lets a vote's `report_id` be moved. | A script signs in anonymously 3 times and votes `still` on its own knee-deep pin. The pin shows as confirmed RED and the route verdict becomes AVOID. | S1 (no anonymous votes) + S3 (trigger: no self-vote, only flood/clog reports, forced `created_at`, `report_id` immutable). |
| D4 | **Medium** | migration:31-34 | `reports.user_id` is **publicly readable** (`select using (true)` on all columns, anon included). Realtime INSERT payloads also carry the full row. | Anyone can list every report by one `user_id`. Reports carry precise lat/lng and time, so this rebuilds a person's movements (home, work, commute). The same applies to `report_votes.user_id`. | S4: column grants that hide `user_id`, plus RPCs `my_reports()` / `my_report_votes()` so **My reports keeps working**. `fetchMyReports` uses `.eq('user_id', …)` and selects `report_votes.user_id`; both need the column, so they must switch to the RPCs (client change is shown below S4). Realtime: drop `reports` from the publication and re-add it with a column list. |
| D5 | **Medium** | migration:19 | The `photo` check is only `length <= 400000`. Any string is accepted (an external `https://` URL, `data:image/svg+xml`, `javascript:`), and each row can be 400 KB. Unlimited anonymous identities (D2) mean unlimited storage. | (a) `photo:'https://evil/pixel.gif'` makes every viewer's browser contact the attacker (IP plus timing leak). Codex's 51777a3 now drops non-JPEG photos on the client, which is good, but the DB should refuse them too. (b) Storage and egress: `fetchReports` pulls up to 500 rows × 400 KB = 200 MB per page load. | S5: a CHECK for a `data:image/jpeg;base64,` prefix, a cap of ~200 KB (the client compresses well below that), and no photo on `cooling`. Longer term: Supabase Storage, with a URL column and a lazy-loaded image. |
| D6 | Low | migration:7-10 | `lat`/`lng` only need to be valid on Earth, and `city` is free text. The 300 m "report near your GPS" rule is enforced only on the client. | Pins can be posted anywhere and for any city string. This is inherent to a client-only GPS check. | S5: a bounding box (India: 6–37 N, 68–98 E). Optional: a per-city box from the city packs. |
| D7 | Low | migration:46-61 | `reports_rate_limit` is `security invoker`. Once S4 hides `user_id`, the trigger can no longer read it and every insert would fail. | n/a (ordering hazard) | S2 makes it `security definer` (`search_path=''`, execute revoked). |
| D8 | Info | migration:36-38 | The DELETE policy is correct: a user can delete only their own rows. There is no UPDATE policy on `reports`, so rows are immutable. `source`, `tier`, `status` and `confirmations` are **not columns**: `rowToPin` hard-codes `source.kind='citizen'` and derives the rest. So **"official" cannot be spoofed** and tier/status cannot be set through the DB. Keep it that way: never add a `source`/`status` column that clients can write. | none | n/a |
| D9 | Info | auth settings | Recommended dashboard settings (do not change from code): limit anonymous sign-ins per IP, enable CAPTCHA for anonymous and email OTP, keep "Confirm email" on, restrict the redirect URL allow-list to `https://sajag-app.vercel.app/**` and `http://localhost:5173/**` (no wildcard `*.vercel.app`, which would allow token theft through someone else's Vercel preview). | Open redirect allow-list → OAuth token sent to an attacker's domain. | Dashboard: Auth → URL Configuration / Rate Limits / Bot protection. |

## Recommended SQL (for Codex's migration; not applied)

```sql
-- S1. Anonymous sessions: cooling points only; no flood/clog reports, no votes.
create policy "anonymous users add cooling points only"
  on public.reports as restrictive for insert to authenticated
  with check (type = 'cooling' or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy "anonymous users cannot vote"
  on public.report_votes as restrictive for insert to authenticated
  with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
create policy "anonymous users cannot change votes"
  on public.report_votes as restrictive for update to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

-- S2. Server-owned fields + race-safe rate limit (definer so it still works after S4).
create or replace function public.reports_rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.user_id    := auth.uid();     -- RLS already requires this; set it anyway
  new.created_at := now();          -- client cannot back/forward-date (rate limit + expiry)
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if (select count(*) from public.reports r
      where r.user_id = new.user_id and r.created_at > now() - interval '30 minutes') >= 5 then
    raise exception 'rate_limited: max 5 reports per 30 minutes' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.reports_rate_limit() from public, anon, authenticated;

-- S3. Votes: no self-votes, only on flood/clog, report_id immutable, server time.
create function public.report_votes_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if tg_op = 'UPDATE' and new.report_id <> old.report_id then
    raise exception 'vote_report_immutable' using errcode = 'P0001';
  end if;
  select user_id, type into r from public.reports where id = new.report_id;
  if r.user_id = auth.uid() then
    raise exception 'cannot_vote_own_report' using errcode = 'P0001';
  end if;
  if r.type not in ('flood', 'clog') then
    raise exception 'votes_only_on_flood_reports' using errcode = 'P0001';
  end if;
  new.user_id := auth.uid();
  new.created_at := now();
  return new;
end $$;
revoke execute on function public.report_votes_guard() from public, anon, authenticated;
create trigger report_votes_guard before insert or update on public.report_votes
  for each row execute function public.report_votes_guard();
-- Optional cleanup of existing self-votes:
-- delete from public.report_votes v using public.reports r where r.id = v.report_id and r.user_id = v.user_id;

-- S4. Hide user_id from the public; keep "My reports" working via RPC.
revoke select on public.reports from anon, authenticated;
grant select (id, city, type, lat, lng, depth, in_underpass, passable_bike, passable_car,
              cause, amenities, name, photo, created_at) on public.reports to anon, authenticated;
revoke select on public.report_votes from anon, authenticated;
grant select (report_id, vote, created_at) on public.report_votes to anon, authenticated;
-- NB: the RLS policies may still reference user_id; policy expressions don't need column privileges.
-- NB: votes upsert (on conflict (report_id,user_id) do update) — test after this grant; if PostgREST
--     needs SELECT on user_id for the upsert, replace vote() with an RPC `cast_vote(report_id, vote)`.

create function public.my_reports(max_rows int default 100)
returns setof public.reports language sql stable security definer set search_path = '' as $$
  select * from public.reports where user_id = auth.uid() order by created_at desc limit least(max_rows, 500)
$$;
create function public.my_report_votes_received()
returns table (report_id uuid, vote text) language sql stable security definer set search_path = '' as $$
  select v.report_id, v.vote from public.report_votes v
  join public.reports r on r.id = v.report_id
  where r.user_id = auth.uid() and v.user_id <> auth.uid()
$$;
revoke execute on function public.my_reports(int), public.my_report_votes_received() from public, anon;
grant execute on function public.my_reports(int), public.my_report_votes_received() to authenticated;

-- Realtime: don't broadcast user_id (column-list publication, PG15+). report_votes.user_id is
-- part of its PK (replica identity) so it can't be dropped from the list — accept, or switch
-- votes to a Broadcast "votes changed" ping.
alter publication supabase_realtime drop table public.reports;
alter publication supabase_realtime add table public.reports
  (id, city, type, lat, lng, depth, in_underpass, passable_bike, passable_car, cause, amenities, name, photo, created_at);

-- S5. Photo + location sanity (NOT VALID = don't fail on existing rows; validate after cleanup).
alter table public.reports add constraint reports_photo_jpeg check (
  photo is null or (type <> 'cooling' and length(photo) <= 200000
                    and photo ~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$')) not valid;
alter table public.reports add constraint reports_in_india check (
  lat between 6 and 37 and lng between 68 and 98) not valid;
```

Client change needed with S4 (`src/backend/reports.js`, orchestrator-owned):
```js
// fetchMyReports
const { data: rows } = await supabase.rpc('my_reports', { max_rows: limit });
const { data: votes } = await supabase.rpc('my_report_votes_received'); // already excludes own votes
// rowToPin(r, votes) unchanged (it only reads report_id + vote)
```
`vote()` must also handle the new `cannot_vote_own_report` error: hide the vote buttons on your own pins, or show a toast.

## How to verify (local `supabase start` or a rolled-back transaction, never against prod data)
1. Sign in anonymously and insert `type:'flood'`: expect an RLS error. Insert `type:'cooling'`: expect OK.
2. Insert with `created_at:'2020-01-01'`: the row stores `now()`. The 6th insert within 30 min gives `rate_limited`.
3. Vote `still` on your own report: expect `cannot_vote_own_report`.
4. As anon, `select user_id from reports`: expect a permission error. `select id,lat from reports`: expect OK. `rpc('my_reports')` as the signed-in owner returns only their rows.
5. Insert `photo:'https://x/y.gif'`: expect a check violation.
6. Run the Supabase security advisors: expect no new warnings (security definer functions have `search_path=''` and execute is revoked from anon).

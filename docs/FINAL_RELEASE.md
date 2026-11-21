# SunShield final full-stack release

Deadline: **00:00 IST, 22 November 2026**. Targets: integration 23:00, QA/deployment 23:40, freeze 23:50.

## Git and method

Continue on integration/final-release. Executable milestones: acceptance 5f26712; weather integration 309c84c; compiled Safe Zone integration 8493165; secure configuration b64eb17; dependency security patch 832a277000b35381c659d65dc2c4cf20befbfdb9. Use the branch's latest HEAD, including subsequent evidence/documentation, for final QA.

Developer B's exact commits 8e16ade6aa1735ebb5558aa8e931e2f56f463252 and 5b32a8964c161b15af48fdc4a690deb28b09cbfb were reviewed. Their branch shares ancestor 2c9f8a3, so normal no-fast-forward merge 4ac76a8 was used. No unrelated-history merge or repeated Developer A import occurred. Main, frontend-integration, Developer B's branch and backup/frontend-verified-20261121-2c9f8a3 are unchanged. No force-push; main requires explicit approval.

Database closure also reviewed teammate commit 7830731 from feature/infrastructure-hardening: only stronger read-only database assertions, no application or schema changes. Normal merge 1f24d65 included it; the full opted-in root suite then passed all 23 tests again. Production code remains unchanged from the previously verified application.

The [exact changed-file inventory](release-evidence/changed-files.txt) records the combined changes since the preserved acceptance snapshot 5f26712. It includes Developer B's provider/tests/schema/search corrections; root/backend build manifests and security patch locks; central route/composition/environment/OpenAPI integration and tests; frontend acceptance fixture expectations; and release documentation/evidence. Engine formulas, thresholds and occupational rules are unchanged.

## Application and deployment structure

One [Express app](../backend/src/app.ts), launched by [server.ts](../backend/src/server.ts), shares one provider across weather/assessment/planning. Existing middleware, request IDs, exact CORS, errors, limits, OpenAPI and shutdown are preserved. Loaded database storage is disconnected during shutdown.

Developer B's root infrastructure and generated Prisma compile to root dist/src and dist/generated. Backend compiles to backend/dist and imports these compiled modules. **The backend hosting project must retain the repository-root package, backend package, both production dependency installations and both dist outputs.** Deploying backend/dist alone is incomplete. Runtime uses JavaScript, not tsx. Database services load only on valid Safe Zone operations; startup does not require a successful connection. Connection/query deadlines and sanitized 503s isolate failures.

Fresh Node.js 24 install/build/start from the repository root:

~~~powershell
npm.cmd ci
npm.cmd --prefix backend ci
npm.cmd run build
npm.cmd start
~~~

Build stages need Prisma/TypeScript dev dependencies. Root build invokes backend build, which generates Prisma and compiles root infrastructure first. Preserve both production dependency trees if pruning dev dependencies afterward.

## Environment

| Setting | Purpose/default |
| --- | --- |
| PORT | Platform port; default 8000 |
| FRONTEND_URL | Exact origin; default http://localhost:5173 |
| OPEN_METEO_BASE_URL | https://api.open-meteo.com/v1; HTTPS required |
| WEATHER_CACHE_TTL_SECONDS | Validated 1–3600, default 600 |
| DATABASE_URL | Authorized application/pool connection |
| DIRECT_URL | Authorized direct connection for root Prisma CLI |
| COMMUNITY_WRITES_ENABLED | false by default |
| RUN_DATABASE_INTEGRATION_TESTS | Explicit opt-in to read-only root test |
| VITE_API_BASE_URL | Public API URL only; real HTTPS URL for hosting |
| VITE_USE_MOCKS | false |

Process variables/backend/.env take precedence over an optional ignored root .env fallback shared with Prisma. Keep credentials out of Git, issues, screenshots, frontend and VITE variables. No secrets are in examples. Never enable community writes without reviewed environment/data authorization.

## Actual local verification

Runtime: **Node v24.13.0 / npm 11.4.1**; root installation/build/generation executed on Node 24. Engine restrictions and dependency versions were not relaxed.

Database closure update, 21 November: the user provisioned the ignored root environment file and a manually/externally started compiled application is now running. Actual HTTP verification succeeded against working-tree commit 992b484 for health, weather/cache, assessment, planner, HeatLab, database discovery/details and documentation. The earlier automated production-mode startup remains a historical policy rejection; it was not retried or reclassified as successful. The existing manually started service was preserved, not replaced. See [closure HTTP evidence](release-evidence/closure-http-smoke.json).

| Endpoint | Actual result |
| --- | --- |
| GET /api/v1/health | 200 UP; liveness only |
| GET /api/v1/weather | 200 real Open-Meteo; LIVE then CACHED verified |
| POST /api/v1/heat/assess | 200 for five representative profiles |
| POST /api/v1/protection/plan | 200 using actual hourly forecasts |
| POST /api/v1/simulation/evaluate | 200 independent real engine |
| Safe Zone discovery/details | 200 actual Supabase reads; default excludes DEMO, explicit inclusion returns three DEMO records |
| Both community POST routes | 503 disabled-write guard; no actual write |
| Invalid coordinates/IDs | 422 with matching request IDs |
| /openapi.json and /docs/ | 200 |

[Actual HTTP bodies and screenshots](release-evidence/README.md) support these local claims. Global/community rate limits, malformed JSON/body size, sanitized dependency failures and request IDs also pass backend tests.

Real Pune observation at 22:15 IST: **21.5 C, 51% RH, 5 km/h**; **48 hourly periods**. Cache hits retain retrieval/observation timestamps. Provider tests verify expiry, timeouts including non-settling fetches, malformed/HTTP failures and location separation. No fabricated fallback exists.

Construction, vendor, delivery, agriculture and fixed road-work profiles correctly returned CAUTION under these cool observations, with different occupational factors. Heat index was unavailable outside its reporting envelope; no rule was changed to create a dramatic output. Actual plans retained 09:15–17:45 boundaries for FIXED, FLEXIBLE and EMPLOYER_CONTROLLED schedules. Plans remain estimates, not certified work-rest schedules.

## Non-overlapping regression totals

- **85 backend passed**: includes 64 original, six provider, nine weather-route and six Safe Zone composition/rate-limit checks.
- **23 root tests passed**: 22 infrastructure tests plus one actual authorized read-only database test; the old nine are included. No database test remains skipped in this opted-in run.
- **46 frontend passed**.
- **39 Chromium passed**: original 28 plus eleven acceptance checks.
- **Six focused production-preview cases also passed** with the prepared local CSP: real HeatLab, Hindi/Marathi, reset and UNKNOWN planner prominence. These are repeat checks, not six additional unique cases.
- Root/backend TypeScript and production build, Prisma validation/generation, frontend typecheck/lint/format/build passed. Existing bundle-size/third-party comment warnings remain.

The repository-wide test failure was incorrect discovery: root Vitest ran nested frontend tests without jsdom and ignored diagnostic probes. Root discovery is now limited to root tests, while each package runs its own valid suite. No storage validation or regression was disabled.

Final dependency review found three linked high audit findings through Prisma's Effect 3.20.0 dependency. [GHSA-7589-6fvf-x4pw](https://github.com/advisories/GHSA-7589-6fvf-x4pw) identifies 3.22.1 as patched. Root and backend override only Effect to 3.22.1; Prisma stays 7.10.1 and unrelated versions/platform metadata are preserved. Both Node 24 clean installs, Prisma validation/generation and infrastructure tests passed with the patch. Fresh root and backend production audits each report **zero vulnerabilities** at execution time. This is not a general security guarantee or a new frontend audit.

## Database and Safe Zone status

Reviewed search uses spatial candidate bounds, pagination of all candidates, exact Haversine radius filtering and distance ordering before output limiting. Tests cover a nearby match after the first 500 records, dateline behavior, radius/limits and demo/rejected exclusion. Schema precision/index mappings match committed SQL in database-free generation. No migration was run.

Developer A independently verified the provisioned configuration, application-client connection, current counts (**three facilities, all DEMO; zero reports; zero VERIFIED facilities**), existing details, demo exclusion/inclusion, radius/category/order/limit behavior, one applied migration with up-to-date status, and an **empty read-only database-to-schema diff**. Prisma 7.10.1 validation/generation and the opt-in read-only integration test passed on Node 24. The application and CLI load the intended ignored root environment file, process variables retain precedence, and write configuration remains false. No secret values are recorded. See [database verification](release-evidence/closure-database-verification.json) and [actual browser/API checks](release-evidence/closure-safe-zone-browser.json).

Empty real discovery is valid with only DEMO data. No demo was relabeled or seeded as a verified resource. Reads are mounted; writes remain disabled by default, with ten-per-fifteen-minute/IP shared limiting when explicitly enabled. Submission/report success is fixture-tested only. Actual writes require an authorized isolated environment/data. No reset, truncation, migration or database write occurred.

## Dependable demo

Terminal 1 after installation, from repository root:

~~~powershell
Set-Location D:\codestorm
$env:PORT='8000'
$env:FRONTEND_URL='http://localhost:5173'
$env:COMMUNITY_WRITES_ENABLED='false'
npm.cmd run build
npm.cmd start
~~~

Terminal 2:

~~~powershell
Set-Location D:\codestorm\frontend
$env:VITE_API_BASE_URL='http://localhost:8000/api/v1'
$env:VITE_USE_MOCKS='false'
npm.cmd run dev -- --host localhost --port 5173 --strictPort
~~~

Open http://localhost:5173/heatlab. Evaluate defaults **35 C / 50% / 5 km/h**:
1. Both cards: SIMULATION, identical **40.68 C** heat index.
2. Construction: **CRITICAL**, stop unsafe work and move away from exposure.
3. Vendor: **HIGH**, reduce strenuous activity and coordinate protection.
4. Show every prototype, medical, work-permission and hydration limitation.
5. Edit, evaluate, reset and refresh; saved worker profile stays independent.
6. Switch en/hi/mr and show SOS without placing an emergency call.

HeatLab does not depend on weather/database. Live dashboard/planning can additionally show actual source/cache/observation timestamps while Open-Meteo is reachable. Safe Zones now show a valid empty real-resource result by default; Include demonstration facilities explicitly reveals three DEMO/not-verified records and their real database-backed details. Do not claim these are verified cooling resources. [Physical-phone testing](ANDROID_TESTING.md) remains unexecuted.

## Team handoff and release recommendation

[Issue #1](https://github.com/Madhav-87/sunshield-hackathon/issues/1) shares exact commits and current structure with the repository owner for Developers C/D. Individual C/D identities/private channels and acknowledgment are not assumed.

Developer C owns independent QA/approved hosting. Frontend Vercel root is frontend; retain monorepo fixture access for test TypeScript at build time. Set a real HTTPS API URL, mocks=false, exact CORS and host-specific trusted-proxy policy. Narrow CSP connect-src to real services. Verify public health, simulation and frontend API communication. **No deployment URL is verified.**

Developer D should use actual evidence screenshots and current local live-weather/plan claims. Keep CACHED/SIMULATION labels and prototype limitations. Do not claim verified real facilities, measured impact, medical validation or deployed integration.

Remaining gates: isolated-write authorization (writes stay off), Developer C independent QA/hosting/public verification, qualified translation/occupational review and real-device testing. Database read-only configuration/connectivity/migration-status/schema-alignment gates are resolved locally. Hosting still needs its own securely provisioned configuration; the ignored local file is never deployed through Git. Employer expansion, authentication, PWA, new visuals and optimization remain deferred.

Developer B owns the separate root Vitest/tinypool development-advisory review; no remediation is duplicated here. At the reviewed 7830731 handoff, only the read-only test update was delivered. No five-case isolated live-write suite is present in that commit or the current root test files, and no live-write test was executed or counted as skipped/passed. If those tests are delivered, keep them disabled without explicit isolated-write authorization. Existing mocked unit write checks do not mutate Supabase.

**Local full-stack read-only demonstration ready: manual running-app startup, weather, planning, HeatLab and Supabase reads verified. Community writes remain disabled. Public deployment remains unverified. Freeze by 23:50 and preserve the midnight submission buffer.**

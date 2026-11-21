# SunShield consolidated backend

Node.js 24, Express, strict TypeScript, Zod, Prisma/PostgreSQL. One application composes Developer A's engine and Developer B's provider/Safe Zone services. Health and HeatLab remain independent of external availability.

## Install and build

From repository root:

~~~powershell
npm.cmd ci
npm.cmd --prefix backend ci
npm.cmd run build
npm.cmd start
~~~

Root package owns PostgreSQL adapter/Prisma/Safe Zone dependencies; backend owns application/engine dependencies. Root source and generated Prisma compile to dist/src and dist/generated, with declarations. Backend builds to backend/dist and imports those modules. Deploy both outputs and both production dependency trees. Production starts JavaScript, not tsx; no second Express server exists.

For watch mode, first build infrastructure, then npm run dev inside backend. Frontend starts separately with http://localhost:8000/api/v1 and VITE_USE_MOCKS=false.

## Configuration and failure isolation

[Example without secrets](.env.example). PORT supports platform assignment; FRONTEND_URL is an exact origin. OPEN_METEO_BASE_URL defaults to https://api.open-meteo.com/v1. WEATHER_CACHE_TTL_SECONDS is validated 1–3600, default 600. One factory instance is shared by weather/assessment/planning, with five-second timeout, validated LIVE/CACHED data, original timestamps and no synthetic fallback.

DATABASE_URL is the application/pool connection; DIRECT_URL is used by root Prisma CLI. Process variables and backend/.env win over the optional ignored root .env fallback. Never put secrets in frontend, VITE variables, commits, issues or logs.

Safe Zone services load lazily. Missing/unavailable storage returns sanitized 503 without blocking other APIs. Connection/query/operation bounds and existing graceful shutdown handle storage failures. COMMUNITY_WRITES_ENABLED defaults false; enable only after authorized environment/data review. Community limiting is ten writes per fifteen minutes/IP in addition to the global API limit.

## Endpoints and checks

Health, GET /api/v1/weather, POST /api/v1/heat/assess, POST /api/v1/protection/plan and POST /api/v1/simulation/evaluate are implemented. GET /api/v1/safe-zones and /:id are mounted but require database configuration. Community POST routes are disabled by default. /openapi.json and /docs/ document the routes. Enterprise APIs remain deferred.

UNKNOWN is unsupported, never clearance. No medical validation, safe-duration guarantee, symptom detection or certified work-rest claim exists. Show source/cache age, priorities and limitations.

Root checks: npm run typecheck, npm test, npm run db:validate, npm run db:generate. Root read-only database testing requires RUN_DATABASE_INTEGRATION_TESTS=true and authorized credentials. Backend checks: npm run typecheck, npm test, npm run build. Frontend checks run in frontend with its own configuration; npm run test:e2e owns server startup and requires ports 8000/5173 free.

Current totals: 85 backend, 23 root (22 infrastructure plus one actual read-only Supabase test), 46 frontend, 39 Chromium passing. No database test is skipped in the opted-in closure run. Actual migration status is up to date and the read-only schema diff is empty. Local credentials are configured and remain ignored; hosting needs its own secure configuration. No migration, seed, reset or actual write was performed.

[Release/startup/deployment handoff](../docs/FINAL_RELEASE.md), [HTTP/screenshots](../docs/release-evidence/README.md), [provider contract](../docs/INTEGRATION_HANDOFF.md), [API contract](../docs/API_CONTRACT.md), [safety methodology](../docs/HEAT_RULES.md).

# SunShield database

PostgreSQL on Supabase; Prisma 7 schema and migration history. Worker profiles stay on-device and weather is cached in memory, so neither is persisted here.

## Supabase and environment

Copy `.env.example` to `.env`. Use the Supabase **transaction pooler** URL (port 6543) in `DATABASE_URL` for application connections and the **direct** database URL (port 5432) in `DIRECT_URL` for migrations. Both values are secrets. Require SSL; never expose them or service-role credentials to the browser. Prisma CLI migrations read `DIRECT_URL`; the application adapter reads `DATABASE_URL`.

## Setup and operations

Install runtime/dev dependencies for Prisma 7, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `dotenv`, `typescript`, and `tsx` in the backend package. Then:

```sh
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

The initial migration is `prisma/migrations/202611210001_init/migration.sql`. To verify connectivity, load environment variables and call `verifyDatabaseConnection()` from `src/config/database.ts`; successful verification requires a real configured database connection. In Supabase SQL Editor, execute `database/schema.sql`, then optionally `database/seed.sql`. Do not run both Prisma migration and standalone schema against an existing database without first checking its state.

## Data and integration

`database/schema.sql` is the standalone, repeatable schema. Seed records are synthetic Pune examples, explicitly `DEMO`, `UNKNOWN` availability, and have no verification timestamp. `includeDemo=false` excludes them. Haversine distances are straight-line estimates, never walking distances. Public queries exclude rejected records; community submissions are PENDING and reports never verify a facility.

The mountable router is `src/routes/safezone.routes.ts`. Developer A should register `createSafeZoneRouter(...)` at `/api/v1/safe-zones` from the central router, after JSON body parsing, and pass the existing community-write rate limiter plus the four functions from `src/services/safezone.service.ts` and `src/services/safezone-report.service.ts`. This preserves Developer A's ownership of app bootstrap and shared middleware. The route schemas validate query/body fields, reject attempts to set `verificationStatus`, and return the documented straight-line search shape. Express 5 forwards rejected async route promises to the central error handler.

This repository still does not contain Express initialization, shared cross-feature schemas/enums, central route registration, or the global error handler; the router is implemented but not mounted in a running app. The router uses Prisma-generated enum values until the shared enum module is available. Enterprise data models exist; dashboard aggregation and heat-engine integration remain dependent on the shared app contract. No employer demo rows are seeded.

See [ER_DIAGRAM.md](./ER_DIAGRAM.md) and [DATA_DICTIONARY.md](./DATA_DICTIONARY.md).

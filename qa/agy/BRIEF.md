# Raasta independent QA brief (Antigravity)

You are an independent QA engineer. Repo root is the current directory.

## The app
Raasta helps people in India find which authority handles an everyday dispute and what their first, often free and peaceful, step is.
- `apps/web`: Vite + React static site, prerendered per locale (`/`, `/mr/`, ...). Build: `npm run build -w @raasta/web` -> `apps/web/dist`.
- `apps/api`: Cloudflare Worker (Hono). JSON `/api/*` and server-rendered HTML `/r/*` (all dynamic pages, work without JavaScript). Run: `cd apps/api && npx wrangler dev --local --port 8787 --ip 127.0.0.1` (needs `apps/api/.dev.vars`, already present). POST requests need header `Origin: http://127.0.0.1:8787`.
- `packages/data`: verified registry JSON (platforms.json is the source of truth for URLs, fees, phones, deadlines).
- `packages/rules`: deterministic routing engine `route(slots, geo)`.
- `packages/docs-gen`: letters, PDFs, labels, mailto builders.
- `packages/i18n`: 12 locales (en hi mr bn ta te kn ml gu pa or ur; ur is RTL).
- Contracts: `docs/CONTRACTS.md`, `packages/rules/src/types.ts`. Existing tests: `npx vitest run`.

## Your job
1. Analyse the full program structure first and write `qa/agy/STRUCTURE.md`.
2. Write your own tests ONLY under `qa/agy/tests/` (Vitest; Playwright if it installs) covering:
   - routing correctness against `packages/data/src/platforms.json` for all 19 dispute types (does each route point at a sensible platform, are fee/SLA strings copied from the registry, no invented URLs),
   - guardrails (deposit never routed to police unless cheating, CPGRAMS blocked for RTI/sub-judice/family, RBI CMS blocked before 30 days, emergency first for UPI fraud, no `edaakhil` anywhere),
   - i18n completeness (missing keys per locale vs `packages/i18n/locales/en.json`),
   - responsive layout of the built site at 320, 375, 414, 768, 1024, 1280, 1536, 1920 px (no horizontal scroll),
   - accessibility (one h1 per page, labels on inputs, alt text, landmarks; axe if available),
   - security headers on Worker `/r/*` and `/api/*` responses and in `apps/web/public/_headers`,
   - API abuse: oversized bodies, bad Origin, missing Origin on POST, injection strings in form fields (HTML/script), prompt injection in chat asking for fake URLs, malformed or tampered route tokens.
3. Run them; write findings to `qa/agy/REPORT.md` as a ranked list: id, severity (critical/high/medium/low), file:line, repro, suggested fix.
4. **Do not modify any file outside `qa/agy/`.** Fixes are proposed only.
5. No em dashes in anything you write.

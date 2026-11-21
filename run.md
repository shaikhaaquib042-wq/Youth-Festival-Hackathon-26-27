# Run Raasta

Raasta has two halves that always work as a pair:

| Half | Folder | What it serves | Hosted on | Locally |
|---|---|---|---|---|
| Website | `apps/web` | Every static page, prerendered in 12 languages | Cloudflare **Pages** | Vite (`localhost:4173` or `5173`) |
| API + dynamic pages | `apps/api` | `/api/*` (JSON) and `/r/*` (questions, results, letters, labels, chat) | Cloudflare **Worker** `raasta-api` | wrangler / Miniflare (`127.0.0.1:8787`) |

The website never contains an API address. It always calls `/api/...` and `/r/...` **on its own origin**. That one rule is what keeps the two worlds apart:

```
Hosted                                              Local (your machine)
https://raasta.safalmutha.in                        http://localhost:4173
 ├─ /api/*, /r/*  ─► Worker route ─► raasta-api      ├─ /api/*, /r/*  ─► Vite proxy ─► local Worker 127.0.0.1:8787
 └─ everything else ─► Pages (apps/web/dist)          └─ everything else ─► apps/web/dist (vite preview)
```

So a local run never contacts `raasta.safalmutha.in`, and the hosted site never needs CORS. The local Worker uses `apps/api/wrangler.local.jsonc`: no routes, no workers.dev, no Workers AI, and KV / D1 / rate limits simulated on disk in `apps/api/.wrangler/state`.

---

## 1. Requirements

- **Node.js 22** (20 works) and npm 10
- Git
- Optional: **Ollama** with a small model for local AI understanding (`ollama pull qwen3.5:4b`). Without it the app uses its keyword classifier and still works fully.

No Cloudflare account and no keys are needed to run locally.

## 2. Run everything with one command

From the repo root:

```powershell
npm run local
```

This does, in order:
1. `npm ci` if dependencies are missing
2. creates `apps/api/.dev.vars` with a random `TOKEN_SECRET` if it does not exist (git-ignored)
3. creates the local D1 tables (`wrangler d1 migrations apply --local`)
4. builds the website (`npm run build -w @raasta/web`, prerenders about 670 pages, runs the size and em-dash guards)
5. starts the local Worker on `127.0.0.1:8787` and the built site on **http://localhost:4173**

Press `Ctrl+C` once to stop both.

Other modes:

| Command | What it does |
|---|---|
| `npm run local` | Production build + local Worker (what judges should use) |
| `node scripts/local.mjs --no-build` | Same, reuses the last build |
| `npm run dev:all` | Vite dev server with hot reload on http://localhost:5173 + local Worker |
| `npm run dev:api` | Local Worker only |
| `npm run dev` | Website dev server only (dynamic pages need the Worker) |

If it says a port is in use, an older `wrangler dev` or `vite` is still running. Close it and run again.

### Local AI (optional)

`apps/api/wrangler.local.jsonc` sets `AI_PRIMARY=ollama` and `OLLAMA_URL=http://localhost:11434`. Start Ollama and the intake uses it (first answer can take 20 seconds while the model loads). To try a cloud model locally instead, add a free key to `apps/api/.dev.vars`, for example `GEMINI_API_KEY=...`, and restart. The Worker only accepts Ollama on localhost.

## 3. Check it works

- http://localhost:4173 shows the landing page with the street of doors
- http://localhost:4173/api/health returns `{"ok":true}` (through the proxy, from the local Worker)
- Type "Rs 20000 was taken from my account by UPI fraud just now": you land straight on "Act now, Call 1930"
- Type "my landlord is not returning my deposit": a couple of questions, then the result, letter PDF, postal label and chat

## 4. Tests

```powershell
npm test
```
271 unit tests (data, rules, documents, API, step-by-step guides in every state).

```powershell
npm run typecheck
```
Root, API and web TypeScript checks.

With `npm run local` running:

```powershell
node qa/ollama-intake.mjs
```
Sends 10 real-sounding problems (English, Hindi, Marathi) to the local Worker and checks the route, emergency and no-money rules. Writes `qa/ollama-intake-report.json`.

```powershell
cd qa/agy; npx playwright test
```
Browser journeys, no-JS journeys, accessibility and static pages against `http://localhost:4173` (set `BASE_URL` to test another address).

### Editing the step-by-step guides

Guides are in `packages/data/src/howto.json`: `first` (keyed by the first-step id) and `platform` (keyed by platform id). Links are references (`url:<key>`, `tel:<number>`, `wa:<platform>`, `metro:portal`, `state:slsa`, `app:letter`, `app:offices:police` ...), and `npm test` fails if one does not exist in the registry. To translate new lines: regenerate `qa/i18n/howto-en.json`, translate into `qa/i18n/howto-<lang>.json`, then run `node scripts/merge-i18n.mjs howto` (it keeps a translation only if placeholders and phone numbers survive).

## 5. Deploy (hosted, domain to domain)

Full steps: [docs/DEPLOY.md](docs/DEPLOY.md). In short:

1. **Pages** project from this repo, branch `posterguys`, build `npm ci && npm run build -w @raasta/web`, output `apps/web/dist`, env `NODE_VERSION=22`, custom domain `raasta.safalmutha.in`.
2. **Worker** `raasta-api` from `apps/api/wrangler.jsonc` (Workers Builds from Git, deploy command `npx wrangler deploy --config apps/api/wrangler.jsonc`, or `npm run deploy:api` from a terminal). Its routes `raasta.safalmutha.in/api/*` and `raasta.safalmutha.in/r/*` sit on the same hostname as Pages.
3. Secret `TOKEN_SECRET` on the Worker. Optional: `GEMINI_API_KEY`, `TURNSTILE_SECRET_KEY`, `OSM_ROUTING_API_KEY`, BHASHINI and DIGIT keys.
4. Check `https://raasta.safalmutha.in/api/health` returns `{"ok":true}`.

Production `ALLOWED_ORIGINS` is only `https://raasta.safalmutha.in`; local origins live only in `wrangler.local.jsonc`.

## 6. Where things are

```
apps/web        Website (Vite, React 19 / Preact in production, prerendered per locale)
apps/api        Worker (Hono): /api JSON, /r server-rendered pages; wrangler.jsonc (hosted), wrangler.local.jsonc (local)
packages/data   Verified registry (platforms, disputes, offices, legal aid, states) + schemas
packages/rules  Deterministic routing engine, guardrails, legal-aid check, timers, redaction, signed tokens
packages/i18n   12 languages (ur is right to left)
packages/docs-gen  Letters (PDF and print), postal labels, email and WhatsApp builders
scripts/        local.mjs (this guide), ingest, link checker, env-sync
qa/             Playwright suite (qa/agy), Ollama intake sweep, QA reports
docs/           PRODUCT, DESIGN, CONTRACTS, DEPLOY, SECURITY, PITCH, CHECKLIST, ROADMAP
```

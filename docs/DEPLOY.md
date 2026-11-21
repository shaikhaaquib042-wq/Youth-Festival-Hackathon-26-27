# Deploying Raasta on Cloudflare

Raasta has two parts. Both live on **one hostname**, `raasta.safalmutha.in`, so there is no CORS and no second domain.

| Part | Folder | Cloudflare product | Serves |
|---|---|---|---|
| Website | `apps/web` | **Pages** (project `raasta`) | Every static page: `/`, `/help`, `/offices`, `/legal-aid`, `/emergency`, `/about`, `/privacy`, ... in 12 languages |
| API and dynamic pages | `apps/api` | **Worker** (`raasta-api`) | Only `/api/*` and `/r/*` (questions, results, letters, labels, directions) |

A Worker route on a path wins over Pages, so once both are set up, `/api/*` and `/r/*` go to the Worker and everything else goes to Pages.

Already created on your account (Muthasafal account, `0c962c99e4d3403eb1de133b221eaef7`):
- KV namespace `raasta-cache`, id `7ca18a9f77bc40b08ba2790909cefb2a`
- D1 database `raasta-db`, id `45666e7c-0369-4fa5-b19b-60a9eb0a5f1d` (tables already created)

Both ids are already written into `apps/api/wrangler.jsonc`.

---

## Step 1. Pages (the website)

1. Cloudflare dashboard > **Workers & Pages** > **Create** > **Pages** > **Connect to Git**.
2. Pick the repo `shaikhaaquib042-wq/Youth-Festival-Hackathon-26-27`.
3. Settings:
   - **Production branch:** `posterguys`
   - **Framework preset:** None
   - **Root directory:** leave empty (the repo root; it is an npm workspace)
   - **Build command:** `npm ci && npm run build -w @raasta/web`
   - **Build output directory:** `apps/web/dist`
   - **Environment variable:** `NODE_VERSION` = `22`
4. Save and deploy. The build prerenders about 660 pages and fails on purpose if a page breaks the size or em-dash guards.
5. When it is green: project > **Custom domains** > **Set up a custom domain** > `raasta.safalmutha.in`. Because `safalmutha.in` is already on Cloudflare, the DNS record is created for you.
6. Check: open `https://raasta.safalmutha.in/`. You should see the landing page. `apps/web/public/_headers` (security headers) is applied automatically by Pages.

Do Step 1 before Step 2: the Worker routes need the `raasta.safalmutha.in` DNS record that Pages creates.

## Step 2. Worker (the API)

**Option A (recommended): deploy from Git with Workers Builds.**
Dashboard > **Workers & Pages** > **Create** > **Workers** > **Import a repository**:
- Repository: `muthasafal/raasta` (or the hackathon repo), branch `posterguys`
- Worker name: **`raasta-api`** (must match `wrangler.jsonc`)
- Root directory: `/`
- Build command: `npm ci`
- Deploy command: `npx wrangler deploy --config apps/api/wrangler.jsonc`

**Option B: from a terminal.**

```powershell
npx wrangler login
npm run deploy:api
```

`wrangler.jsonc` already contains the KV, D1, rate-limit and Workers AI bindings, and the two routes `raasta.safalmutha.in/api/*` and `raasta.safalmutha.in/r/*`.

Then set the one required secret `TOKEN_SECRET` (any long random string; it signs the shareable result links). With Option A add it in the Worker > **Settings** > **Variables and Secrets**; from a terminal:

```powershell
npx wrangler secret put TOKEN_SECRET
```

Optional secrets (the app works without them):

| Secret | What it adds |
|---|---|
| `GEMINI_API_KEY` | Better understanding of free-text problems (free tier). Without it, Workers AI (free, no key) is used, then keywords |
| `TURNSTILE_SECRET_KEY` | Bot protection on the feedback forms (create a free Turnstile widget for `raasta.safalmutha.in`) |
| `OSM_ROUTING_API_KEY` | Travel time and distance in "Get there" (OpenRouteService free key). Without it, map links still work |
| `BHASHINI_USER_ID`, `BHASHINI_ULCA_API_KEY` | Government translation for dynamic text |
| `DIGIT_BASE_URL`, `DIGIT_CLIENT_ID`, `DIGIT_CLIENT_SECRET`, `DIGIT_TENANT_ID` | Real filing to a DIGIT/UPYOG city. Without them the demo sandbox is used and clearly labelled |

Or put them in a `.env` file at the repo root (see `.env.example`) and run `node scripts/env-sync.mjs --deploy`.

Check: `https://raasta.safalmutha.in/api/health` returns `{"ok":true}`, and typing a problem on the landing page leads to a result page.

## Updating later

- Website: push to `posterguys`; Pages rebuilds by itself.
- Worker: with Workers Builds, pushing to `posterguys` redeploys it too. From a terminal: `npm run deploy:api`.

## Running locally

See [run.md](../run.md). One command, `npm run local`, builds the site and runs it with a local Worker (`apps/api/wrangler.local.jsonc`). The local run never calls `raasta.safalmutha.in`: the browser talks only to localhost, and Vite forwards `/api` and `/r` to `127.0.0.1:8787`.

## Status (2026-11-21)

- Pages: live at `https://raasta.safalmutha.in`
- Worker: live on the same hostname; `/api/health` returns `{"ok":true}`, `POST /r/ask` and `/r/flow/*` work

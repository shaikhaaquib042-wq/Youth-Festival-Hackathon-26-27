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

From a terminal in the repo:

```powershell
cd apps/api
npx wrangler login
npx wrangler deploy
```

`wrangler.jsonc` already contains the KV, D1, rate-limit and Workers AI bindings, and the two routes `raasta.safalmutha.in/api/*` and `raasta.safalmutha.in/r/*`.

Then set the one required secret (any long random string; it signs the shareable result links):

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
- Worker: `cd apps/api && npx wrangler deploy` after API changes.

## Running locally

```powershell
cd apps/api
npx wrangler dev --local --port 8787
```

and in a second terminal, from the repo root:

```powershell
npm run dev
```

Open `http://localhost:5173`. The dev server forwards `/api` and `/r` to the local Worker. `apps/api/.dev.vars` holds a local `TOKEN_SECRET` (never committed).

# Sajag — guide for coding agents

Hackathon build, **submission before 22:00 IST, 21 Nov 2026; code freeze 21:00**. Spec: `docs/PRD.md` (read §5, §6, §9, §10, §18 before coding; heat = §21; **§22 overrides older sections** — status cards, login, Supabase, trust rules).
Sajag (सजग) = one safety companion for people who cannot stay indoors — commuters, two-wheeler/delivery riders, outdoor workers — in Pune.
- **Flood module (PS 7.3, primary):** live verified map of waterlogged roads — citizen reports + official alerts + radar/weather → route verdict Safe / Caution / AVOID.
- **Heat module (PS 7.2):** hyperlocal heat alerts from public weather data, continuous in-shift checks with work/rest advice, heat-illness signs + help, crowdsourced cooling points (water, shade, ORS), voice alerts in Marathi/Hindi.
Same map, same Pin/report flow, same alert engine for both hazards.

## Run
```
npm install
npm run dev            # http://localhost:5173
```
- Basemap tiles: `public/tiles/pune-region-20261120.pmtiles` is committed (Pune + PCMC + Lonavala + Khadakwasla; no R2 needed for dev). Mumbai/Bengaluru/Hyderabad tiles are local-only (gitignored); open `?city=mumbai` etc. on the orchestrator laptop.
- Routing: `config.js` → `OSRM_URL`. Dev default `http://localhost:5000` (orchestrator laptop). On the worker machine create `.env.local` with
  `VITE_OSRM_URL=https://router.project-osrm.org` unless the orchestrator's OSRM is reachable.
- SACHET alerts go through `/api/sachet` (Vite proxy in dev, Vercel Function `api/sachet.js` in prod). Never call sachet.ndma.gov.in from the browser directly (no CORS).

## Stack (do not swap)
Vanilla JS ES modules + Vite 7. MapLibre GL 5 + pmtiles 4 + @protomaps/basemaps 5. **Supabase** (supabase-js 2.119.0, pinned) for login + shared reports — use the wrappers in `src/backend/`, never `createClient` yourself. No React, no TypeScript, no CSS framework, no own server.
Without Supabase keys in `.env.local` the app still runs (read-only: seed data, no login, no shared reports).

## File ownership (merge-conflict rule, PRD §18)
| Owner | Paths |
|---|---|
| **Worker** | `src/ui/`, `src/map/`, `src/engine/` (except the contract), `src/feeds/openmeteo.js`, `src/feeds/rainviewer.js`, `src/style.css` |
| **Orchestrator** | `src/backend/` (Supabase client, auth, reports), `supabase/` (DB migrations), `src/heat/` (whole heat module, PRD §21), `src/i18n/` (languages + voice), `infra/`, `src/scenario/`, `src/feeds/sachet.js`, `api/`, `config.js`, `citypacks/`, `src/data/`, `index.html`, `src/main.js` |
| **Shared / frozen** | `src/engine/pin.js` — the Pin contract. Do NOT rename fields or enum values. Types: `flood`, `clog`, `hotspot`, `cooling` (cooling pins carry optional `amenities`). |

Need a change in a file you don't own? Leave a `// REQUEST(orchestrator): …` note in your own file, or say so in the commit message. Don't edit theirs.
`src/main.js` is the wiring point: export functions from your modules (e.g. `initReportUI(map, store)`); the orchestrator wires them in. Small, obvious wiring additions to `main.js` are OK if you say so in the commit.

## Git
- Branch: **`team/sajag`**. Never commit to or push `main`.
- Small commits after every working step; `git pull --rebase` before push.
- Never commit `.env*` (except `.env.example`), `node_modules/`, `dist/`.

## Non-negotiable product rules (judges check these)
1. **Every pin shows source + age.** A pin without `source` and `createdAt` is never rendered. Use `makePin()` from `src/engine/pin.js`.
2. **LIVE vs SIMULATED.** Anything injected by Scenario mode has `simulated: true` and must render a visible **SIMULATED** tag. Never draw fake rain as RainViewer tiles.
3. **Grid layers are regional.** Open-Meteo values are drawn as coloured cells (~12 km), never as street-level gradients.
4. **Underpass:** unconfirmed underpass report = ORANGE ("possibly flooded underpass"); confirmed / official / corroborated photo = RED at any depth (PRD §22.3). Rider mode: confirmed ankle-deep → RED. Never advise wading through knee+ water.
5. **All tunables in `config.js`** (expiry, radii, thresholds). Advisory rules live in ONE table file `src/engine/advisory.js`.
6. Engine code is identical in Live and Scenario mode — only the input source differs. Engine functions take `now` as a parameter (never call `Date.now()` inside engine logic) so the scenario clock works.
7. Report flow < 10 s, one hand. **Login is required to report or vote — never to view** (PRD §22.4). Flow: tap Report → `requireUser(openSignInSheet)` from `src/backend/auth.js`; if null, show the sign-in sheet (Google button + email-code fields, text `auth.*` keys) and keep the draft in sessionStorage; after `onAuth` fires with a user, reopen the form. Save with `submitReport(pin)` / `vote(id,'still'|'cleared')` from `src/backend/reports.js`; load with `fetchReports()` + `watchReports()` (Realtime). Handle `err.code === 'rate_limited'`. Report must be within `REPORT_MAX_DISTANCE_M` of the GPS fix. Simulated pins are never submitted.
10. **Disclaimer** `t('disclaimer')` visible on every screen. **Evidence, not scores:** pins show `t('report.evidence', {n, age})` and `t('report.near', {name})` (nearest gazetteer name within 400 m).
9. **No hard-coded user-facing text.** `import { t, onLang } from '../i18n/index.js'` and use `t('action.report')`, `t('pin.ageMin', {n: 12})`. Render inside `onLang(() => …)` (or listen for the `langchange` window event) so text updates when the language changes. Languages: en, mr, hi, kn, te. Need a new string? Add the key to `src/i18n/en.js` only and note it in the commit message — the orchestrator adds the other four. Voice: `speak('heat.water')` from `src/i18n/speak.js` (never call speechSynthesis directly). Official SACHET text is shown as published (not translated).
8. Credits must stay visible: "Protomaps © OpenStreetMap", "Weather data by RainViewer" (when radar on).

## Heat module (PRD §21) — what the worker needs to know
The orchestrator builds `src/heat/` (WBGT estimate, work/rest table, shift mode, "I feel unwell", voice). The worker only:
- renders **`cooling` pins** (water / shade / ORS / clinic) with the same pin layer — seed data in `src/data/pune-cooling.json` (OSM), icon per first amenity, popup lists amenities + source + age;
- adds a **"Cooling point / थंड जागा"** choice to the report form (tick amenities) → `makePin({type:'cooling', amenities, ...})`;
- Layer C heat cells use `CONFIG.HEAT.MAP_BANDS_C` (°C). Fetch `wet_bulb_temperature_2m` and `shortwave_radiation` in the same Open-Meteo call and expose them per grid point — `src/heat/` reads them.

## App structure (PRD §22.1)
**Flood | Heat** toggle at the top; each side = a status card (colour + one action line + 🔊) → its map layers → its report choices. Never merge both hazards into one colour; a RED on the hidden side shows as a banner. Hotspots: 19 seeded (`src/data/pune-hotspots.json`). Helplines per city: `cityPack().helplines`.

## Severity ladder (§9 + §22.3) — implement exactly
GREEN no reports, no heavy rain · YELLOW rain expected or unverified report nearby · ORANGE confirmed ankle-deep on/near route, clog pin + heavy rain, or an unconfirmed underpass report · RED confirmed knee+, confirmed/official underpass report, river/nullah/dam alert for corridor, official road-closed post.

## Routing (§10)
OSRM `alternatives=3&overview=full&geometries=geojson`. Score each route by RED/ORANGE pins within `ROUTE_BUFFER_M` (300 m). **OSRM frequently returns only ONE route**, so the via-point detour (offset `DETOUR_OFFSET_M` perpendicular to the blocking pin, re-request once) is required, not optional. Still blocked → AVOID "no safe route found — do not travel".

## Build order (who does what, IST)
1 –14:45 Worker: map shell polish + attribution · 2 –15:45 Worker: hotspots, report form, tiers, lifecycle · 3 –16:45 Worker: route check · 4 –17:30 Worker: Open-Meteo cells, RainViewer, severity, advisory, mode switch · 5 –18:15 Orch: SACHET banner + paste-in gazetteer · 6 –19:15 Orch: Scenario player · 7 –20:00 Both: PWA, CSV, WhatsApp share, deploy.
Each step must be demoable on its own. Never cut the Scenario player or the route verdict.

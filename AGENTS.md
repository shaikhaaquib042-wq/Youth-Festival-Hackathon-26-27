# Mausam Mitra — guide for coding agents

Hackathon build, **submission before 22:00 IST, 21 Nov 2026; code freeze 21:00**. Spec: `docs/PRD.md` (read §5, §6, §9, §10, §18 before coding).
Mausam Mitra (मौसम मित्र) = one safety companion for people who cannot stay indoors — commuters, two-wheeler/delivery riders, outdoor workers — in Pune.
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
- SACHET alerts go through `/api/sachet` (Vite proxy in dev, `functions/api/sachet.js` in prod). Never call sachet.ndma.gov.in from the browser directly (no CORS).

## Stack (do not swap)
Vanilla JS ES modules + Vite 7. MapLibre GL 5 + pmtiles 4 + @protomaps/basemaps 5. No React, no TypeScript, no CSS framework, no backend server. Storage = in-memory + localStorage.

## File ownership (merge-conflict rule, PRD §18)
| Owner | Paths |
|---|---|
| **Worker** | `src/ui/`, `src/map/`, `src/engine/` (except the contract), `src/feeds/openmeteo.js`, `src/feeds/rainviewer.js`, `src/style.css` |
| **Orchestrator** | `infra/`, `src/scenario/`, `src/feeds/sachet.js`, `functions/`, `config.js`, `citypacks/`, `src/data/`, `index.html`, `src/main.js` |
| **Shared / frozen** | `src/engine/pin.js` — the Pin contract. Do NOT rename fields or enum values. |

Need a change in a file you don't own? Leave a `// REQUEST(orchestrator): …` note in your own file, or say so in the commit message. Don't edit theirs.
`src/main.js` is the wiring point: export functions from your modules (e.g. `initReportUI(map, store)`); the orchestrator wires them in. Small, obvious wiring additions to `main.js` are OK if you say so in the commit.

## Git
- Branch: **`team/mausam-mitra`**. Never commit to or push `main`.
- Small commits after every working step; `git pull --rebase` before push.
- Never commit `.env*` (except `.env.example`), `node_modules/`, `dist/`.

## Non-negotiable product rules (judges check these)
1. **Every pin shows source + age.** A pin without `source` and `createdAt` is never rendered. Use `makePin()` from `src/engine/pin.js`.
2. **LIVE vs SIMULATED.** Anything injected by Scenario mode has `simulated: true` and must render a visible **SIMULATED** tag. Never draw fake rain as RainViewer tiles.
3. **Grid layers are regional.** Open-Meteo values are drawn as coloured cells (~12 km), never as street-level gradients.
4. **Underpass = RED at any depth.** Rider mode: confirmed ankle-deep → RED (not ORANGE). Never advise wading through knee+ water.
5. **All tunables in `config.js`** (expiry, radii, thresholds). Advisory rules live in ONE table file `src/engine/advisory.js`.
6. Engine code is identical in Live and Scenario mode — only the input source differs. Engine functions take `now` as a parameter (never call `Date.now()` inside engine logic) so the scenario clock works.
7. Report flow < 10 s, one hand, no login. Marathi labels on key actions (e.g. "Report / तक्रार करा").
8. Credits must stay visible: "Protomaps © OpenStreetMap", "Weather data by RainViewer" (when radar on).

## Severity ladder (§9) — implement exactly
GREEN no reports, no heavy rain · YELLOW rain expected or unverified report nearby · ORANGE confirmed ankle-deep on/near route, or clog pin + heavy rain · RED confirmed knee+, any underpass report, river/nullah/dam alert for corridor, official road-closed post.

## Routing (§10)
OSRM `alternatives=3&overview=full&geometries=geojson`. Score each route by RED/ORANGE pins within `ROUTE_BUFFER_M` (300 m). **OSRM frequently returns only ONE route**, so the via-point detour (offset `DETOUR_OFFSET_M` perpendicular to the blocking pin, re-request once) is required, not optional. Still blocked → AVOID "no safe route found — do not travel".

## Build order (who does what, IST)
1 –14:45 Worker: map shell polish + attribution · 2 –15:45 Worker: hotspots, report form, tiers, lifecycle · 3 –16:45 Worker: route check · 4 –17:30 Worker: Open-Meteo cells, RainViewer, severity, advisory, mode switch · 5 –18:15 Orch: SACHET banner + paste-in gazetteer · 6 –19:15 Orch: Scenario player · 7 –20:00 Both: PWA, CSV, WhatsApp share, deploy.
Each step must be demoable on its own. Never cut the Scenario player or the route verdict.

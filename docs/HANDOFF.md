# Sajag — Handoff (21 Nov 2026, updated 15:00 IST)

Hackathon: Naya Bharat 2047 · Code for Bharat (Rotary × Rotaract Youth Festival, Pune). **Code freeze 21:00, submission before 22:00 IST.**
Problem statements: **7.3** "Which road is flooded right now?" (primary) + **7.2** "Too hot to work, too poor to stop".
Product: **Sajag (सजग, "alert")** — one safety companion for people who can't stay indoors (commuters, two-wheeler / delivery riders, outdoor workers). Pune live; Mumbai, Bengaluru, Hyderabad as city packs.

Read in this order: this file → `AGENTS.md` (rules for any coding agent) → `docs/PRD.md` (§22 overrides older sections; heat = §21; Maharashtra SOP = §23).

---

## 1. Where things live

| What | Where |
|---|---|
| Repo (local) | `~/NayaBharat Hackathon/sajag` — branch **`team/sajag`** (24 commits, **nothing pushed yet**) |
| Remote | github.com/shaikhaaquib042-wq/Youth-Festival-Hackathon-26-27 — **we only have READ access**; waiting for organisers to add the team account as collaborator. Never push `main`. Devang handles git (one email per team). |
| Dev server | `npm run dev` → http://localhost:5173 (`?city=pune|mumbai|bengaluru|hyderabad`, `?hazard=flood|heat`) |
| Routing (OSRM) | Docker container `osrm-pune` on **localhost:5000** (Colima on the M1 Mac; `colima start` after reboot). Data in `~/osrm`, rebuild with `npm run osrm`. Covers 73.30–74.50 E, 18.10–19.00 N. |
| Map tiles | `public/tiles/pune-region-20261120.pmtiles` (committed). Mumbai / Bengaluru / Hyderabad `.pmtiles` are local only (gitignored, >25 MiB Cloudflare Pages limit → need R2 for public deploy). |
| Backend | Supabase project **`sajag`** (ref `icknjgvstmvglggqauev`, region Mumbai ap-south-1, org "Devangs Org"). Keys + DB password in **`.env.local`** (gitignored, never commit). |
| agy worktrees (Orca) | `sajag-heat` → `~/orca/workspaces/sajag/sajag-heat` (branch `team/sajag-heat`, **merged**). `sajag-cards` → `~/orca/workspaces/sajag/sajag-cards` (branch `team/sajag-cards`, **merged** 14:54). Both merged. **`sajag-ux`** → `~/orca/workspaces/sajag/sajag-ux` (branch `team/sajag-ux`) — agy's UX pass **in progress** (brief: scratchpad `agy-brief-ux.md`). **`sajag-city`** → `~/orca/workspaces/sajag/sajag-city` (branch `team/sajag-city`) — **Codex, GPT-6 Luna, effort high**: city auto-switch offer (brief: scratchpad `codex-brief-city.md`). Owns `src/ui/citySwitch.js`, `config.js` CITY resolution, `src/store.js` per-city seed data, `src/data/<city>-*.json`, grids in non-Pune packs. Don't edit those until merged. |
| Research inputs | `docs/PRD.md`; teammate's *Sajag Research Report* (`~/Downloads/Sajag Research Report.html`); official PS PDF in the parent folder. |

## 2. Done (verified)

**Foundation**
- Vite 7 + vanilla JS PWA shell; MapLibre 5 + PMTiles + Protomaps basemap; credits shown. Map locked to the city-pack extent (wider Pune region).
- `config.js` holds every tunable; city packs (`citypacks/*.json`) with bounds, tiles, SACHET feed, language lists, helplines.
- **Pin contract** frozen in `src/engine/pin.js` (types flood / clog / hotspot / cooling).
- **SACHET** official alerts live via Vite proxy (prod: `functions/api/sachet.js`); matches Marathi names (पुणे); banner shows only alerts < 24 h old; feed text escaped.
- Local OSRM verified (Pune → Lonavala 63.7 km). OSRM often returns only ONE route → detour via-point logic is required (spec in AGENTS.md).

**Data**
- 19 flood hotspots (`src/data/pune-hotspots.json`): 10 named Traffic Police spots, 7 repeat spots from the research, Ambil Odha (2019) and Ekta Nagar (2024). Hand-placed ones flagged `approx`.
- 45-name gazetteer (English + Marathi aliases) for landmark labels / paste-in matcher.
- 1,862 cooling points from OpenStreetMap (water, pharmacies = ORS, clinics, hospitals, parks = shade).
- Helplines per city (only 112 / 108 confirmed — **call-check the rest**).

**Languages & voice**
- 5 UI languages (en, mr, hi, kn, te), **105 keys each**; picker shows the city's languages first, all five available.
- Voice: per-state voice languages (MH: mr, hi · KA: kn, te · TG: te, hi). macOS has **no Marathi voice** → Marathi text read by the Hindi voice (Lekha); recorded clips override TTS when present.
- `docs/audio-script.md` — 15 clips × 4 languages to generate in Gemini → drop MP3s in `public/audio/<lang>/`, then add the language to `CONFIG.HEAT.AUDIO_CLIP_LANGS`.

**Login + shared reports (Supabase)**
- Migration applied: `reports`, `report_votes`, RLS (public read; signed-in users write only as themselves), DB rate limit 5 reports / 30 min, Realtime on both tables.
- Verified: anon read OK · anon write refused · authenticated insert + vote OK · 6th report refused `rate_limited` (tested in a rolled-back transaction; DB left empty) · Supabase security advisors: **no issues**.
- `src/backend/`: client (publishable key only), auth (Google + email code, `requireUser` gate), reports (Pin ↔ row, fetch / submit / vote / Realtime watch). App runs read-only if keys are missing.

**Step 2 UI (PRD §18)**
- Pin store (`src/store.js`): seed + live + scenario pins, derived status (unverified → confirmed → stale → cleared), landmark "Near X", known-spot prior; injectable clock for Scenario mode.
- Map layers (`src/map/pins.js`): severity-coloured reports (refined underpass rule, rider rule), SIM tag for simulated pins, hotspot rings, clustered cooling points, popups with evidence / source / expiry countdown / "Still there" + "Cleared" votes.
- Report sheet (`src/ui/report.js`): < 10 s flow (type → depth → underpass / passable → optional photo, compressed), GPS-at-spot check (300 m), rate-limit message.
- Sign-in sheet (`src/ui/signin.js`): Google + email code; resumes the report after the Google redirect; account chip in the top bar.
- **GPS location** (`src/location.js`): 📍 map button asks permission, blue dot + accuracy ring, auto-starts if already granted; shared by report + (next) heat shift.
- Flood | Heat toggle (layers switch per side, `?hazard=` deep link, remembered); disclaimer bar on every screen.
- Checked in the browser: both sides render, hotspot popup, sign-in gate opens on Report.

**Step 3 — route check (done 14:38)** — `src/engine/route.js` (score pins within 300 m, OSRM alternatives, ±1 km detour via-point, verdict safe/caution/avoid/noSafe) + `src/ui/route.js` (panel: demo route "Sinhagad Rd → Shivajinagar", gazetteer / My location / pick-on-map inputs, saved routes, verdict with reason + evidence + source + age, red dashed blocked line + green alternate, live re-plan when pins change, WhatsApp share). **Verified:** dry route = Safe 7.6 km; simulated knee-deep pin at Swargate → AVOID + green alternate 7.1 km automatically.

**H2 — heat shift + I feel unwell (done 14:41)** — `src/heat/ui/shift.js` (work type, new-to-heat, 30-min re-assessment, water every 20 min, work/rest cycle, voice, wake lock, crew share, MH SOP + NDMA lines on orange/red; heat provider pluggable via `setHeatProvider()` — currently falls back to live Open-Meteo at the user's point) + `src/heat/ui/unwell.js` (red flags / warning signs → Call 108 first, 112, first aid / rest advice + nearest clinic or water). **Verified:** live shift = Normal (30 °C, WBGT 22.3); "confusion" → emergency screen.

**Step 4 — status cards, weather grid, radar, advisory (agy, merged + integrated 14:54)** — `src/feeds/openmeteo.js` (12-point regional grid incl. wet-bulb + radiation, `nearestCell`, `setScenarioGrid`), `src/map/weather.js` (rain cells on Flood side, heat cells on Heat side, SIM outline, 📡 RainViewer toggle maxzoom 7 + credit), `src/engine/advisory.js` (PRD §8 rule table, flood/heat card status), `src/ui/cards.js` (Flood + Heat status cards, mini chip for the other side, mode selector, work type, 🔊), `scripts/advisory-selftest.mjs` → ALL ADVISORY TESTS PASSED. Integration: scenario feeds SIMULATED grid cells; shift reads the grid; shared heat prefs (`sajag.workType`, `sajag.newToHeat`); safe-again on the app clock + fixed Maharashtra 16:00 floor; mode selector re-plans the route.

**Step 6 — Scenario player (done 14:50)** — tap the LIVE chip (or `?scenario=pune-2019-09-25` / `?scenario=pune-heat-afternoon`). `src/scenario/player.js` + two JSON scripts; Play/Pause/Reset/speed (30–300×)/scrubber/Back to LIVE; SIMULATED pins, alerts, rain/heat cells; real reports keep their real age during a replay; all times shown in replay time. `src/engine/gazetteer.js` (place matcher EN/MR/HI, reused for step 5). **Verified:** flood 19:30 → AVOID (Ambil Odha knee-deep, green alternate), 21:25 → Caution; heat 12:00 Take care 45/15 → 12:35 30/30 → 13:30 Danger 15/45 + SOP → 16:10 Safe; safe-again 16:00.

**UX pass — orchestrator part (done 14:59)** — per Devang (14:52): "as simple as possible". Top: two picture tabs (🌧 Rain | ☀️ Heat) + ⋯ More. Bottom: 3 big buttons per side (Rain: Is my route safe? · Report · 🆘 Help | Heat: Start work · 💧 Water/shade near me · 🆘 Help). First-run setup (`src/ui/onboarding.js`): language in own scripts → "Who are you?" pictures (`src/ui/profile.js` sets mode + work type) → location; **recommends the local language when location permission is already granted** (city pack containing the fix, or nearest within 150 km; never prompts on screen 1). `?setup=1` re-runs it; skipped for `?scenario=` links. More menu (`src/ui/more.js`): language, who-you-are, helplines, radar / add cooling point, sign in/out, setup again, demo replay. Help sheet (`src/ui/help.js`): tap-to-call, ambulance first. 18 px base font, ≥ 48 px targets. Events: `sajag:mode`, `sajag:profile`, `sajag:show-cooling`, `sajag:route`. **Verified:** setup flow in Marathi + new main screen.

**Heat engine (by agy, merged)** — `src/heat/`: `wbgt.js` (WBGT shade/sun estimate), `workrest.js` (ACGIH-style table), `safeAgain.js` ("safe to work again at HH:MM"), `illness.js` (red flags / warning signs + triage), `scripts/heat-selftest.mjs` → **ALL HEAT TESTS PASSED**.

## 3. Not done / known gaps

| Item | Note |
|---|---|
| End-to-end report submit from the browser | Blocked until a sign-in method works (Google not configured; Supabase's default mailer only emails project-team members, 2/hour). A direct test-user insert into the hosted DB was refused by the safety check — not worked around. |
| Strings | All 180 keys present in all 5 languages. |
| Native-speaker review | All mr / hi / kn / te strings were machine-written — Kannada & Telugu especially need a native read. |
| Work/rest numbers | PRD §21.2 table is simplified from ACGIH — verify before quoting on stage. |
| Helplines | Only 112 / 108 verified. |
| PMC spot count | 120 (TOI, pre-monsoon) vs 201 (Punekar News, 29 Sep) — verify before quoting. 2019 flood: quote the brief (112 mm / ~20 deaths); 106 mm / 17 deaths if asked. |
| Maharashtra heat SOP figures (§23) | From teammate — confirm against the government notification / news source before a slide. |

## 4. Blocked on Devang (accounts)

1. **GitHub collaborator access** (organisers) → then push `team/sajag`.
2. **Google sign-in**: Google Cloud → OAuth client (Web), redirect `https://icknjgvstmvglggqauev.supabase.co/auth/v1/callback` → paste ID/secret in Supabase → Auth → Providers → Google; add judges as test users or publish the consent screen.
3. **Supabase URL config**: Site URL `http://localhost:5173`; redirect URLs `http://localhost:5173/**`, `https://sajag.pages.dev/**`.
4. **Email codes** (optional): custom SMTP (Gmail app password, smtp.gmail.com:465) + magic-link template showing `{{ .Token }}`.
5. **Audio clips**: generate from `docs/audio-script.md` (Marathi first).
6. **R2 / Cloudflare** (for the public URL): `npx wrangler login`.

## 5. Next steps (PRD §18, re-planned — time now ~14:35)

| # | Due | Step | Suggested owner |
|---|---|---|---|
| 3 | — | Route check | ✅ done |
| H2 | — | Heat shift + I feel unwell | ✅ done |
| 4 | — | Status cards, weather grid, radar, advisory | ✅ done (agy) + integrated |
| 5 | 18:00 | Paste-in police post → gazetteer → pins | agy |
| 6 | — | Scenario player | ✅ done |
| City | 16:15 | Offer to switch the whole app to the city the GPS fix is in (once; skip for ?scenario= / ?city=); per-city seed data; grids + gazetteers for Mumbai / Bengaluru / Hyderabad. Then wire `switchCity()` into More as a City picker. | Codex (GPT-6 Luna, high) → Claude merges |
| UX | 16:30 | Simplify UI/UX — orchestrator part ✅; **agy part in progress**: one-answer status cards (big icon + sentence + 🔊, details collapsed), quiet map (soft cells, no labels, cooling only on 💧, hotspots at zoom ≥ 12 or during route check), picture-first report form. Then merge + translate agy's en.js keys. | agy → Claude merges |
| 7 | 20:00 | PWA manifest + service worker + shortcuts, WhatsApp share, CSV for PMC, deploy (Pages + R2) | both |
| 8 | 21:00 | Rehearse ×3, slides, code freeze | team |

Cut rule (18:00): drop paste-in extras, CSV, Pages deploy, co-worker mode, Mumbai humid scenario. Never cut: Scenario player, route verdict, Call 108 path.

## 6. How to resume (any agent)

```
cd "~/NayaBharat Hackathon/sajag" && git checkout team/sajag
colima start                       # if Docker is down; OSRM container restarts itself
npm install && npm run dev         # http://localhost:5173
node scripts/heat-selftest.mjs     # heat engine tests
npx vite build                     # must stay green
```
Supabase CLI (v3: local by default) — hosted commands need `--remote`; load the DB password first: `set -a; . ./.env.local; set +a`. Always dry-run (`supabase db push --remote --dry-run`) before applying.

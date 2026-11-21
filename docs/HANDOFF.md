# Sajag — Handoff (21 Nov 2026, updated 20:40 IST — read §0 first)

Hackathon: Naya Bharat 2047 · Code for Bharat (Rotary × Rotaract Youth Festival, Pune). **Submission deadline moved to 23:59 IST, 21 Nov** (was 22:00; told 20:42). Code freeze: confirm with Devang.
Problem statements: **7.3** "Which road is flooded right now?" (primary) + **7.2** "Too hot to work, too poor to stop".
Product: **Sajag (सजग, "alert")** — one safety companion for people who can't stay indoors (commuters, two-wheeler / delivery riders, outdoor workers). Pune live; Mumbai, Bengaluru, Hyderabad as city packs.

Read in this order: this file → `AGENTS.md` (rules for any coding agent) → `docs/PRD.md` (§22 overrides older sections; heat = §21; Maharashtra SOP = §23).

---

## 0. START HERE — state at 20:40 IST

**21:05 update:** live = `78ed23a`. Replay bar sits below the top bar with ▴ minimise (one slim row: ▶, slider, clock, ▾); intro text hides once the replay starts; cards + banner stack under the bar (measured `--sb-h`), all widths incl. desktop (old 56px desktop offset overlapped the 70px top bar); other-hazard chip hidden during replays; scenario alerts now 'IMD Pune'; mic-blocked hint in 5 languages. Freeze moved with the 23:59 deadline.

**20:40 update:** live = HEAD `051fe73` (deployed 20:39). Since 20:20: `?city=` links skip first-run setup; `mobile-web-app-capable` meta (no Chrome deprecation warning); collapsed status card sits BELOW the top bar on mobile as a clear "▾ <status>" pill (agy fix, verified at 390 px). **Demo video RENDERED**: `~/NayaBharat Hackathon/sajag-video/out/sajag-demo.mp4` (44.8 s, 1080p, stereo VO; route + heat scenes recorded inside the 2019-flood / heat-afternoon replays; end-card QR = `?scenario=pune-2019-09-25`). Click-test worker finished (all 7 areas PASS, 0 console errors) and its worktree + branch are removed — no workers running. `vercel deploy --prod` is allow-listed in `~/NayaBharat Hackathon/.claude/settings.local.json` (Devang, 20:30). Known nit: flood replay banner can show a live Mumbai SACHET line. Remaining: items 2–4 and 6 below.

### State at 20:20 IST (written for the next Claude account)

**Code freeze 21:00, submission before 22:00.** Live: **https://sajag-app.vercel.app** (deployed 20:15 = HEAD `6bf40a8`, everything below is live). Branch `team/sajag` → pushed as **`origin/tokenizers`** (`git push` works; `push.default=upstream`). Repo is in sync, working tree clean.

**Deploys:** `cd sajag && vercel deploy --prod` — the auto-mode safety check blocks it unless Devang approves each deploy in chat ("deploy it"). Verify after deploy (curl the page / run a flow).

### Done since 17:45 (all live)
- Redesign "calm signal" + **dark mode** (`src/theme.js`, tokens at end of `src/style.css`, More → Appearance, `?theme=dark`), design canvas https://claude.ai/artifact/XgZNEenxNd6u8MEeYcXAJY.
- Collapsible status card (docks to the LEFT edge when collapsed). Season default (Feb–May Heat, Jun–Oct Rain). `?setup=0` skips setup.
- **Flood spots 2026-only**: Pune 19 (10 Traffic Police Jul 2026 + 9 from 2026 news), Mumbai 13, Bengaluru 11, Hyderabad 17 — dated source + link in every popup; old/undated ones `archived`.
- Cooling points 2,395 (+533 OSM: bus shelters, stations, shelters, toilets, taps) + 🧭 Directions; OSM link per point.
- 🎤 Voice (Deepgram Nova-3, `/api/transcribe`): help words → Help sheet (no login), else report prefill. Verified with real speech (hi/mr/en).
- **English voiceovers = Deepgram Aura-2 "harmonia"** (`public/audio/en/*.m4a`, `scripts/gen-audio-deepgram.mjs`); English added to every city's voice list. **Deepgram has NO Indian-language TTS** (checked 103 voices).
- 👤 **My reports** (top bar): active + earlier reports, "people helped" = distinct others who confirmed.
- Paste a police/news post → local unverified pins (More menu).
- Heat shift starts instantly (no GPS wait). Route panel compact after a check.
- **Route "safer, not safe"** (`src/engine/route.js`): Vitthalwadi→Shivajinagar always crosses Dandekar Bridge; with the heavy-rain clog rule no route was clean → now offers the less-severe route with a caution naming the hazard. Verified live: 2019 replay T+60 → "⛔ Avoid · Safer route (take care) · 7.1 km — Blocked drain · Dandekar Bridge".
- Google sign-in WORKS (Supabase Google provider ON; OAuth client `522884372191-d0nush…`; secret JSON in `sajag/` is git-ignored + vercel-ignored — delete it any time, it lives in Supabase now). Clean URL **sajag-app.vercel.app** added (old sajag-inky still works).
- Merged workers: QA dark-mode/320px (Antigravity), paste-in, 22 bug fixes, 12 security fixes (Codex). Reports: `docs/SECURITY-REVIEW.md`, `docs/security/claude-db-review.md`.
- Secrets audit: **CLEAN** — no secret ever committed; real values of Deepgram key, DB password, Vercel token, Google client secret absent from git history and live bundle; only the Supabase URL + publishable key are public (by design).
- README rewritten for judges (live links, 60-s demo, screenshots in `docs/screenshots/`).

### Open — in priority order
1. **Demo video (≤45 s)** — Remotion project at **`~/NayaBharat Hackathon/sajag-video`** (NOT in git). Script `docs/demo-video-script.md`. 9 scenes in `src/Scenes.tsx`, timing in `src/Composition.tsx` (1344 frames = 44.8 s, 1920×1080), VO `public/vo/vo1-9.mp3` (Deepgram), **real screen recordings** of the app in `public/rec/<flow>/f0000.jpg…` (30 fps JPEG sequences, frame counts in `src/rec.ts`) recorded by `sajag-video/tools/rec.mjs` (Chrome DevTools screencast; step files `tools/st-*.json`; `node tools/rec.mjs <url> public/rec/<name> 390 844 tools/st-<name>.json`). Studio: `cd sajag-video && npx remotion studio` → http://localhost:3000/SajagDemo. **Waiting for Devang's review; render only when he says "render"**: `npx remotion render SajagDemo out/sajag-demo.mp4`. QR `public/qr.png` may still point to the old -inky URL (still works) — regenerate with `npx qrcode` if time.
2. **DB security migration NOT applied** — `supabase/migrations/20261121134445_harden_citizen_report_writes.sql` (anon can't file flood/votes, server-set created_at, no self-votes, hide user_id, photo cap). Client has fallbacks so the app works either way. Apply only with Devang's OK: `set -a; . ./.env.local; set +a; supabase db push --remote --dry-run` then without `--dry-run`; then run the verify SQL in the migration.
3. **Supabase "Allow anonymous sign-ins" is still OFF** → heat-side "add cooling point" shows "not switched on yet". Devang toggles it in Authentication → Sign In / Providers.
4. **Indian-language voiceovers** — need `SARVAM_API_KEY` (recommended) or `GEMINI_API_KEY` in `.env.local`; Gemini script exists (`scripts/gen-audio.mjs`), Sarvam needs a small adapter. Then `CONFIG.HEAT.AUDIO_CLIP_LANGS` += langs.
5. Worker **`sajag-clicktest`** (Antigravity, terminal `term_1f6144c5…`, REPORT ONLY) still clicking through the live site — read its final table with `orca agent read c85f7098-b2a6-4f4a-a523-a46a89d2f397 --json` or its terminal; fix top items; then `orca worktree rm --worktree path:~/orca/workspaces/sajag/sajag-clicktest --delete-branch`.
6. Rehearse ×3 (`?scenario=pune-2019-09-25` → scrub to 19:30 → route; `?scenario=pune-heat-afternoon` → 12:30 → Start work), slides, submission. After submission: `sudo pmset -a disablesleep 0`.

### Rules learned today (follow them)
- **Codex workers: `--model gpt-6-luna --effort high` + priority mode, NEVER defaults** (Devang was angry when they ran on 6.2 Sol). Priority-mode flag is unknown — Orca CLI has none; ask Devang how he sets it.
- Orca workers: never `--activate`; brief = self-contained; workers commit on their branch only, orchestrator merges + tests + deploys.
- A fresh Claude worker stops at a "Bypass Permissions" prompt — don't click through it yourself; use Codex/Antigravity or ask Devang.
- Never commit `client_secret*.json` / `.env*`. Never write test users / data into the hosted DB.
- MapLibre CSS loads after ours → use `.maplibregl-map .maplibregl-ctrl-*` specificity. Local OSRM (Colima) is down; dev uses `VITE_OSRM_URL=https://router.project-osrm.org npm run dev`.
- Headless screenshots: Chrome `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader`; phone width via a 390-px iframe or CDP device metrics (`sajag-video/tools/cdp.mjs`).

## 1. Where things live

| What | Where |
|---|---|
| Repo (local) | `~/NayaBharat Hackathon/sajag` — local branch **`team/sajag`** tracks **`origin/tokenizers`** (team name: Tokenizers). First push 17:15 IST 21 Nov. Push with `git push` (venue Wi-Fi is slow: if it times out, add `-c http.postBuffer=157286400`). |
| Remote | github.com/shaikhaaquib042-wq/Youth-Festival-Hackathon-26-27 — **push access granted**; our branch is **`tokenizers`**. Never push `main` or other teams' branches. Devang handles git (one email per team). |
| **Live app** | **https://sajag-app.vercel.app** (clean domain added 18:25; old sajag-inky.vercel.app + sajag-pod5.vercel.app still work) — Vercel project `sajag`, team `devang_hobby` (id `pod5`), personal account `ingaledevang-3418`. Deployed from the CLI (no Git link — repo access missing). QR codes: `docs/slides/sajag-qr.png` (app), `docs/slides/sajag-qr-flood-demo.png` (`?scenario=pune-2019-09-25`). |
| Dev server | `npm run dev` → http://localhost:5173 (`?city=pune|mumbai|bengaluru|hyderabad`, `?hazard=flood|heat`) |
| Routing (OSRM) | Docker container `osrm-pune` on **localhost:5000** (Colima on the M1 Mac; `colima start` after reboot). Data in `~/osrm`, rebuild with `npm run osrm`. Covers 73.30–74.50 E, 18.10–19.00 N. |
| Map tiles | `public/tiles/pune-region-20261120.pmtiles` (committed). Mumbai / Bengaluru / Hyderabad `.pmtiles` are local only (gitignored, >25 MiB Cloudflare Pages limit → need R2 for public deploy). |
| Backend | Supabase project **`sajag`** (ref `icknjgvstmvglggqauev`, region Mumbai ap-south-1, org "Devangs Org"). Keys + DB password in **`.env.local`** (gitignored, never commit). |
| Worker worktrees | **Running (launched 18:20, no --activate):** `sajag-paste` (Codex, terminal `term_d98b2cd2…`) — paste-in police/news post → local pins, More menu row; `sajag-qa` (Antigravity, terminal `term_d85b882d…`) — dark-mode + 5-language QA, fixes only in new `src/theme-fixes.css`. Both at ~/orca/workspaces/sajag/<name>, based on team/sajag, commit-only (orchestrator merges). Earlier workers merged + removed at 15:30. |
| Research inputs | `docs/PRD.md`; teammate's *Sajag Research Report* (`~/Downloads/Sajag Research Report.html`); official PS PDF in the parent folder. |

## 2. Done (verified)

**Foundation**
- Vite 7 + vanilla JS PWA shell; MapLibre 5 + PMTiles + Protomaps basemap; credits shown. Map locked to the city-pack extent (wider Pune region).
- `config.js` holds every tunable; city packs (`citypacks/*.json`) with bounds, tiles, SACHET feed, language lists, helplines.
- **Pin contract** frozen in `src/engine/pin.js` (types flood / clog / hotspot / cooling).
- **SACHET** official alerts live via Vite proxy (prod: `functions/api/sachet.js`); matches Marathi names (पुणे); banner shows only alerts < 24 h old; feed text escaped.
- Local OSRM verified (Pune → Lonavala 63.7 km). OSRM often returns only ONE route → detour via-point logic is required (spec in AGENTS.md).

**Data**
- **19 live flood hotspots, all 2026-sourced** (`src/data/pune-hotspots.json`, updated 18:10): 10 Pune Traffic Police spots (list of 26 published 3 Jul 2026, graded from 2025 monsoon calls; only these 10 are named publicly) + 9 places reported waterlogged in the 2026 monsoon (Mitramandal Chowk, Lagad Mala, Kothrud Kachra Depot, Upper Depot, VIT College Rd, Gokul Nagar, Yewalewadi, Wagholi, Tathawade–Punawale underpass; Punekar News 29 Sep, Bridge Chronicle 22 & 30 Sep 2026). Each popup shows the dated source + link. 9 older spots (7 undated news-list spots, Ambil Odha 2019, Ekta Nagar 2024) kept in the file with `archived: true`, not shown live (2019 lives on in the Scenario replay). Coordinates from OSM Nominatim; area-level ones flagged `approx`. Skipped (not found on OSM): Kamthe Nagar, Bodkewadi Phata, Ambethan Temple Road.
- 45-name gazetteer (English + Marathi aliases) for landmark labels / paste-in matcher.
- **2,395 cooling points** from OpenStreetMap (18:40: +533 — 300 bus stops with shelters, 92 bus stations, 42 public shelters, 86 public toilets, 31 drinking-water taps/points; earlier: hospitals/clinics, pharmacies = ORS, parks = shade). Govt water stations / pyaaus are barely mapped in OSM → crowd-add them. Popup: big 🧭 Directions (Google Maps walking) + link to the OSM object (was the OSM licence page).
- **No login on the Heat side** (18:45): adding a cooling point uses a silent Supabase anonymous session (`ensureAnonUser()` in `src/backend/auth.js`). **Needs Devang: Supabase → Authentication → Sign In / Providers → enable “Allow anonymous sign-ins”** (currently OFF → app shows a friendly “not switched on yet”). Anonymous session never counts as signed in for flood reports / votes or the account chip.
- **Route check ready** (18:30): verified on the live site with public OSRM (Safe 7.6 km) and in the 2019 replay at 19:30 (⛔ Avoid, Ambil Odha knee-deep, green alternate 7.3 km). Result panel now compact (✎ to edit) and the map fits the route in the visible area. Local OSRM is down (Colima stopped; port 5000 answered by macOS AirPlay) — dev uses `VITE_OSRM_URL=https://router.project-osrm.org`.
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

**UX pass — agy part (merged 15:22)** — one-answer status cards (big icon + one sentence + big 🔊; details under "More details ▾"; WBGT behind ⓘ; simple other-side chip), quiet map (soft cells, no outlines/labels in LIVE; flood spots at zoom ≥ 12 or during route check; cooling only on 💧), picture-first report (🌊/🚧 tiles, **depth as SVG figures: ankle / knee / waist-torso** in `src/ui/depthIcons.js`, big "📷 Add photo proof" tile, "📷 Proof" badge in popups). ⚠️ The report form itself is **not visually verified** — it only opens after sign-in, which needs Google/SMTP set up.

**City auto-switch — Codex GPT-6 Luna (merged 15:22)** — `src/ui/citySwitch.js`: when the app's GPS fix is in another city pack, banner "You seem to be in {city}. Switch?" (once per pair; skipped for `?scenario=` / `?city=`); city choice: `?city=` → saved `sajag.city` → `VITE_CITY` → Pune; per-city seed data in `store.js` (Mumbai / Bengaluru / Hyderabad gazetteers ~10+ approx places each; hotspots/cooling empty); grids for all 4 packs. City picker added to ⋯ More. **Verified:** simulated Bengaluru fix → banner in Marathi.

**Heat engine (by agy, merged)** — `src/heat/`: `wbgt.js` (WBGT shade/sun estimate), `workrest.js` (ACGIH-style table), `safeAgain.js` ("safe to work again at HH:MM"), `illness.js` (red flags / warning signs + triage), `scripts/heat-selftest.mjs` → **ALL HEAT TESTS PASSED**.

## 3. Not done / known gaps

| Item | Note |
|---|---|
| End-to-end report submit from the browser | Blocked until a sign-in method works (Google not configured; Supabase's default mailer only emails project-team members, 2/hour). A direct test-user insert into the hosted DB was refused by the safety check — not worked around. |
| Strings | All 229 keys present in all 5 languages. |
| Native-speaker review | All mr / hi / kn / te strings were machine-written — Kannada & Telugu especially need a native read. |
| Work/rest numbers | PRD §21.2 table is simplified from ACGIH — verify before quoting on stage. |
| Helplines | Only 112 / 108 verified. |
| PMC spot count | Use **201 waterlogging-prone spots** (PMC, quoted by Punekar News 29 Sep 2026 and Bridge Chronicle 30 Sep 2026); 120 was the May 2026 priority list. 2019 flood: quote the brief (112 mm / ~20 deaths); 106 mm / 17 deaths if asked. |
| Maharashtra heat SOP figures (§23) | From teammate — confirm against the government notification / news source before a slide. |

## 4. Blocked on Devang (accounts)

1. ~~GitHub collaborator access~~ — done; pushed to `tokenizers` 17:15.
2. **Google sign-in**: Google Cloud → OAuth client (Web), redirect `https://icknjgvstmvglggqauev.supabase.co/auth/v1/callback` → paste ID/secret in Supabase → Auth → Providers → Google; add judges as test users or publish the consent screen.
3. **Supabase URL config**: Site URL `https://sajag-app.vercel.app`; redirect URLs `http://localhost:5173/**`, `https://sajag-app.vercel.app/**`, `https://sajag-inky.vercel.app/**`, `https://sajag-*-pod5.vercel.app/**`.
4. **Email codes** (optional): custom SMTP (Gmail app password, smtp.gmail.com:465) + magic-link template showing `{{ .Token }}`.
5. **Audio clips**: generate from `docs/audio-script.md` (Marathi first).
6. **R2 / Cloudflare**: no longer needed if we deploy on Vercel (tiles fit there).
9. **Deepgram API key** ($200 free credit): create in the Deepgram console → put in `sajag/.env.local` as `DEEPGRAM_API_KEY=...` (server-side only — NO `VITE_` prefix, never paste in chat). The agent adds it to Vercel env when deploying.
7. **Vercel** (alternative host): CLI now logged in as personal account `ingaledevang-3418` (team `devang_hobby`). Was `devangingale-4954` / Secura Pod before — don't deploy there.
8. **Mac power (set 21 Nov ~15:10):** `sudo pmset -a disablesleep 1` is ON so OSRM + dev server survive a closed lid. Keep it plugged in; don't press the power button. **After submission undo:** `sudo pmset -a disablesleep 0`.

## 5. Next steps (as of 15:35 — code freeze 21:00, submission by 22:00)

**Done:** steps 0–4, 6, **7 (Vercel deploy, 15:40)**, H2 (heat shift + unwell), City auto-switch, UX simplification. All worker worktrees merged and removed; nothing running.

| # | Due | Step | Owner | Notes |
|---|---|---|---|---|
| A | now | **Google sign-in setup** (§4 items 2–3) | Devang | Unblocks reporting, the report-form visual check, and judges filing reports live. Then test: sign in → Report → picture tiles → send → pin appears on a 2nd device via Realtime. |
| ~~7~~ | done 15:40 | ~~Deploy to Vercel~~ — live at https://sajag-inky.vercel.app. PWA manifest + icons + home-screen shortcuts (Rain check / Heat shift), service worker (network-first app shell; skips /tiles, /api, other origins; prod only), `api/sachet.js` Vercel Function, `vercel.json`, `.vercelignore`, env `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` on all envs. Verified by curl: page, manifest, SW, SACHET proxy (RSS 200), tiles range 206 (all 4 cities shipped), Supabase ref in bundle, public OSRM CORS OK. **Not yet:** browser visual check (Chrome extension was offline); Supabase redirect URL `https://sajag-inky.vercel.app/**` still to add (Devang, with Google setup); `DEEPGRAM_API_KEY` to add once it exists. **Redeploy:** `cd sajag && vercel deploy --prod` (note: on this Git-less project even plain `vercel deploy` lands on production). | Claude | (original plan below) |
| 7-orig | 17:00 | **Deploy to Vercel** (personal account `ingaledevang-3418`, team `devang_hobby`) + PWA manifest/service worker/home-screen shortcuts ("Rain check", "Heat shift" via `?hazard=`) | Claude | Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `DEEPGRAM_API_KEY` (server). SACHET proxy → port `functions/api/sachet.js` to a Vercel Function at `/api/sachet`. OSRM in prod = public router (config default). Pune tiles ship in `public/tiles` (Vercel allows the size). Add Vercel URL to Supabase redirect URLs. Make a QR code for the slide. |
| V | 17:30 | **🎤 Voice reporting with Deepgram** (new, 15:30) | worker (agy or Codex) — launch **without `--activate`** | Hold-to-talk mic on the Report screen → MediaRecorder (webm/opus) → **server** function `/api/transcribe` (Vercel Function; Vite dev middleware for localhost) → Deepgram `POST /v1/listen?model=nova-3&language=<mr|hi|kn|te|en-IN>&smart_format=true` (or `language=multi` for code-switching) → transcript → `matchPlaces()` + `classifyPost()` (`src/engine/gazetteer.js`; add Kannada/Telugu depth & type keywords) → report form **pre-filled** (place from GPS / matched landmark, depth, type) + transcript shown → user taps Send. Key never in the browser. Deepgram **TTS has no Indian languages** (checked 21 Nov) → keep browser TTS + recorded clips for alerts. Roadmap slide: WhatsApp voice-note → report; voice "Is my route safe?". |
| V / V+ | built 17:20 | **🎤 Voice + spoken help — code done, NOT live-tested** (needs `DEEPGRAM_API_KEY`). `src/ui/voice.js`: round 🎤 button bottom-left (both sides), tap to talk / tap to stop (auto-stop 12 s) → `/api/transcribe` (`api/transcribe.js` Vercel Function; same handler mounted as Vite dev middleware in `vite.config.js`; tries nova-3+keyterms → nova-3 → nova-2 → nova-3 `multi`; 1.5 MB cap) → `detectHelp()` (`src/engine/sos.js`, generous en/mr/hi/kn/te/Latin word list + 108/112) → **Help sheet with no sign-in** (shows "You said…", Rain side adds "Not an emergency — continue my report") · else Rain side → `openReport({prefill})` with type / depth (only if spoken) / underpass / place (`classifyPost` now has hi/kn/te words + `depthKnown`). Heat side non-help → toast. `window.__voice('मदत करा')` runs it on typed text. Tests: `node scripts/voice-selftest.mjs` → ALL VOICE TESTS PASSED; heat + advisory tests pass; `vite build` green; dev endpoint returns `not_configured` 503 without the key. **Todo:** key in `.env.local` → restart dev → real speech test in mr/hi/en → `vercel env add DEEPGRAM_API_KEY production` → `vercel deploy --prod`; browser visual check (Chrome extension offline 17:15). Not the Deepgram Voice Agent (English-only TTS) — roadmap slide. |
| V-test | 17:40 | **Deepgram verified locally** with macOS-voice test clips: Hindi help → `मदद चाहिए, accident हो गया है, ambulance बुलाओ` (nova-3 + keyterms, first try) → help detected; Marathi → `पुलाखाली गुद्दाभर पाणी आहे स्वारगेट जवळ` → knee + Swargate; English works but slow from venue Wi-Fi (6–12 s for 113 KB WAV; phone opus clips are ~10× smaller). **Todo (Devang): add `DEEPGRAM_API_KEY` to Vercel** (auto-mode refused the agent doing it): `! cd sajag && vercel env add DEEPGRAM_API_KEY production` → then `vercel deploy --prod`. Real-mic test on a phone still pending. | Claude |
| C | 17:45 | **Collapsible status card** (▴/▾ → one-line pill, remembered in `sajag.cardCollapsed`, auto-reopens when level worsens) · **Season default** `CONFIG.SEASON_HAZARD` (Feb–May Heat, Jun–Oct Rain, Nov–Jan = last pick else Rain; manual pick kept only within the season; `?hazard=` wins) — built + pushed, **not visually checked** (Chrome extension offline). | Claude |
| A2 | — | **Gemini audio clips**: `node scripts/gen-audio.mjs [mr hi kn te en]` → `public/audio/<lang>/<id>.m4a` (18 clips incl. card Safe / Be careful / ready). Needs **`GEMINI_API_KEY` in `.env.local`** (not there yet). Then set `CONFIG.HEAT.AUDIO_CLIP_LANGS = ['mr','hi',…]`, listen to a few, commit, deploy. Voice `Kore` (override `GEMINI_VOICE=`). | Claude, waiting on key |
| L | 18:00 | **Layout pass**: wide screens (≥ 760 px) = one 440 px left column (tabs, status card, 🎤 + LIVE, disclaimer, 3 action buttons as a floating panel; route/report sheets open in the same column), map free on the right; zoom/📍 controls fixed (MapLibre CSS was resetting them to top:0 behind the top bar). Phone: LIVE chip moved right of 🎤. `?setup=0` now skips first-run setup (demo links). Checked in headless Chrome at 1440×900 (flood + heat); phone width not reliably screenshot-able headless. **Not deployed yet.** | Claude |
| R | 18:15 | **Redesign + dark mode live** (design canvas https://claude.ai/artifact/XgZNEenxNd6u8MEeYcXAJY): `src/theme.js` (auto/light/dark, `?theme=`, More → Appearance), dark Protomaps basemap swap in `src/map/map.js`, tokens at the end of `src/style.css`, tinted status cards, action bar = primary (route / start work) + Report·Speak·Help grid (🎤 moved into the bar). **City flood spots:** Mumbai 13, Bengaluru 11, Hyderabad 17 (2026 sources, OSM-geocoded, `approx` where area-level). Competitor scan 18:15: only `posterguys` ("Raasta", civic grievance router, 12 locales, AI chat, QA suite, docs) and `Nemesis` (TRINETRA, PS 1.3) have real code; nobody else on 7.2/7.3. | Claude |
| 5 | 18:00 | Paste-in police post → gazetteer → pins (matcher + classifier already exist) | worker | Small textarea in ⋯ More (or Authority tab) → `matchPlaces` → official-tier pins (simulated:false only if a human confirms; label source "Pasted by …"). |
| 7b | 18:30 | WhatsApp share polish, CSV export for PMC (Authority list) | Claude | Cut first if late. |
| T | 19:00 | Native-speaker read of mr / hi / kn / te; audio clips (Marathi first) dropped into `public/audio/mr/` + `CONFIG.HEAT.AUDIO_CLIP_LANGS = ['mr']` | team | `docs/audio-script.md` |
| 8 | 20:00–21:00 | Rehearse ×3 (`?scenario=pune-2019-09-25`, `?scenario=pune-heat-afternoon`), slides (pitch numbers in PRD §22.7 / §23), code freeze 21:00 | team | GitHub push once collaborator access exists. After submission: `sudo pmset -a disablesleep 0`. |

**Cut rule (18:00):** drop paste-in (5), CSV, voice reporting if not working by 18:30 (keep as roadmap slide). **Never cut:** Scenario player, route verdict, Call 108 path, LIVE/SIMULATED labels.

**Rules for the next session:** update this handoff when tasks finish, before starting new work · launch Orca workers without `--activate` · don't create test users directly in the hosted DB (refused by safety check) · Supabase CLI v3 needs `--remote` + dry-run first.

## 6. How to resume (any agent)

```
cd "~/NayaBharat Hackathon/sajag" && git checkout team/sajag
colima start                       # if Docker is down; OSRM container restarts itself
npm install && npm run dev         # http://localhost:5173
node scripts/heat-selftest.mjs     # heat engine tests
npx vite build                     # must stay green
```
Supabase CLI (v3: local by default) — hosted commands need `--remote`; load the DB password first: `set -a; . ./.env.local; set +a`. Always dry-run (`supabase db push --remote --dry-run`) before applying.

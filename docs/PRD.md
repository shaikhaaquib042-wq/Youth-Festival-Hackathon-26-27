# FloodWatch — FINAL PRD (r1, build-ready)
> **Product renamed to Mausam Mitra (मौसम मित्र) on 21 Nov 2026** — scope now covers 7.3 (road flooding, primary) + 7.2 (outdoor-worker heat), one app. "FloodWatch" below = the flood module. Branch: `team/mausam-mitra`.

**Problem statement 7.3, Environment domain, Naya Bharat 2047 / Code for Bharat — Rotary Youth Festival Hackathon, Pune, 21 Nov 2026. Submission: before 22:00 today.**
Consolidates PRD v0.1–v0.4 + FINAL, revised 21 Nov 13:15 after (a) a check against the official problem-statement PDF and (b) a build-feasibility research pass. Decisions by Devang are marked [DEVANG]. Defaults proposed by the research assistant and accepted implicitly are [DEFAULT]. New in r1 is marked [R1]. Recommendations awaiting Devang's yes/no are marked [REC]. Section 14 lists questions that are STILL OPEN — do not silently assume answers while building.

**r1 change log**
1. Official 2019 figures corrected to the PDF (>112 mm in ~3 h, ~20 deaths) — §1, §16.
2. RainViewer free API changed on 1 Jan 2026: no nowcast, max zoom 7 — §7, §12.
3. NEW Live / Scenario mode (§6.6) — November is dry; the demo cannot depend on live rain.
4. NEW §1.1 Competitive landscape — Google Maps India already takes flood reports; we must say why we're different.
5. Prototype routing simplified to "OSRM alternatives + pick the dry one" — §10.
6. Today's scope cuts moved into §15. Q5 answered; Q1/Q7/Q8/Q9 given build defaults — §14.
7. Build order re-timed for today and split for Orca (orchestrator + worker) — §18.
8. NEW §19 Brainstorm (ranked) and §20 Build recipes (exact commands for agents).
9. [R2] Renamed to Mausam Mitra; NEW §21 Heat module (PS 7.2): WBGT estimate, work/rest table, shift mode, heat-illness check, cooling points, voice.

---

## 1. The problem (official statement, paraphrased faithfully)
"During heavy monsoon rain in Pune, Mumbai or Bengaluru, underpasses and low-lying roads can flood within an hour. Commuters, two-wheeler riders and school buses drive into waterlogged streets because there's no reliable, live picture of which roads are safe. Information appears in scattered WhatsApp messages and social media posts — usually too late."
- **Who is affected (official):** daily commuters, two-wheeler riders, delivery workers, school transport, emergency services, and people living in low-lying areas. [R1]
- **Why it matters (official):** driving or walking into floodwater causes accidents, stranded vehicles and sometimes deaths; a shared live map helps people avoid danger **and helps authorities respond faster**. [R1 — use the second half in the Impact slide]
- **Challenge:** create a reliable, real-time picture of waterlogged roads during heavy rain, so people can stay out of danger.
- **Solution directions named:** (1) crowdsourced waterlogging map with photos and timestamps, (2) automatic removal of old reports once water clears, (3) alerts for a user's regular route, (4) a map of flood-prone spots built up from past reports.
- **Prototype note (official):** "No sensors or government data are needed for the prototype" — simulating a heavy-rain evening with sample reports is accepted.
- **Official real-world context [R1]:** on 25 Sep 2019, more than **112 mm** of rain fell on south Pune in about **three hours**; the encroached Ambil Odha stream burst its banks and close to **20 people died** (source cited in the PDF: citizenmatters.in). Use these exact figures — judges hold the PDF.
- **Fresh hook for the Problem slide [R1]:** 29 Sep 2026 — about an hour of heavy rain waterlogged several parts of Pune although PMC had identified **201** waterlogging-prone locations and taken measures (Punekar News, 29 Sep 2026). In July 2026 Pune Traffic Police mapped **26** locations "highly susceptible to waterlogging" and sent the list to PMC (Punekar News, 3 Jul 2026). The spots are known; the live picture is what's missing.
- Judging format: Problem → Idea → Prototype → Impact. Software only.

**Scope clarification (settled by research):** 7.3 is about ROAD waterlogging (rain exceeding drainage where it falls — streets, underpasses, low-lying colonies). River flooding is context and one cause (nullah overflow, dam release on specific corridors), NOT the product. Do not build a river/dam monitoring product.

### 1.1 Competitive landscape — why FloodWatch, if these exist? [R1]
Judges will ask. Have one line ready for each.
- **Google Maps (India):** since Oct 2024 users can report and get alerts on road flooding; Google says India reported the most flood-related alerts on Maps globally. → *Proves demand and that people will report.* Our angle: things a general navigation app isn't built for — trust tier + source + age on every pin, depth-by-vehicle verdicts (ankle-deep is RED for a bike, not a car), a "before you leave" check with gear advice, underpass = RED at any depth, official alerts fused in, a civic work list for PMC, and open data the city can own. **Do not claim on stage what Google lacks unless the team has checked the current Google Maps UI** — claim what we do.
- **Mumbai Flood (IIT Bombay, mumbaiflood.in):** sensors (Mithi River, Vakola Nullah) + crowdsourced reports — Mumbai only, sensor-led. **BMC Disaster Management app:** location-specific flood warnings 6–72 h ahead — forecast-led, Mumbai only. → Our angle: road-level, live, any city via City Packs, no sensors needed.
- **PetaBencana.id (Jakarta) / MIT Urban Risk Lab RiskMap:** the closest global precedent. A chatbot answers people already posting about floods and invites a structured report (location, depth, photo); reports go live on a public map that government agencies validate. Their public map was also embedded in the Uber driver app. → Our validated design pattern for Q4 and the City Pack "built to travel" story.
- **NDMA SACHET, CWC flood app:** district alerts and river levels — we *consume* SACHET; we are not competing with it.

## 2. Product in one line
A live, verified map of which roads are waterlogged right now — built from citizen reports fused with official alerts, rain radar, weather data and news/social reports — that warns everyone before their route takes them into water, and tells them what to carry and when not to go at all.
Working name: **FloodWatch** (final name is Open Question Q6).

## 3. Users [DEVANG: everyone]
ONE app, MODES per user type. Everyone sees the same map and data; modes change (a) safety thresholds, (b) which alert leads the home screen, (c) wording of advisories.
- **Commuter mode** (car/general): route safety check before leaving.
- **Rider mode** (two-wheeler + delivery riders): strictest depth thresholds (ankle-deep = red), rider-specific gear advice.
- **Parent / School transport mode**: fixed school route checked on a schedule (e.g. early morning), alert if any live pin touches it.
- **Pedestrian / Outdoor worker mode**: leads with heat alerts when the heat layer is active (the 7.2 bridge); footwear/water advice.
Supply side: citizens on the road who report; Traffic Police / PMC whose public posts the app amplifies. Emergency services and authorities consume the ward view (§13) — a by-product, not the hero. [R1: named in the pitch, no separate mode]

## 4. Geography — City Packs [DEVANG: India-first, multi-city]
Not Pune-only in vision, not global in claim. Each city is a **City Pack** = config + data, no new code:
1. Map centre + bounds and PMTiles file (§11)
2. OSRM extract for the region (§10)
3. State SACHET alert-feed URL (Maharashtra and Karnataka feeds exist in the same RSS/CAP format)
4. Place-name gazetteer (localities, chowks, bridges, underpasses)
5. Known hotspot seed list
6. Local authority accounts to monitor
7. Weather-API grid points for the region (§7)

- **Launch pack: PUNE** (26 traffic-police spots (Jul 2026), PMC's 201-spot list (2026), Ambil Odha 2019 / Sinhagad Road 2024 history).
- **Pack 2: MUMBAI** — IMD normal ~2,502 mm/yr; same Maharashtra SACHET feed (zero extra alert plumbing). BMC counted 498 waterlogging spots in 2025 (up from 453) — ready-made seed data. [R1]
- **Pack 3: BENGALURU** — named in the problem statement; IMD ranked it the most vulnerable Indian metro to urban flooding (2024); BBMP/KSNDMC: 226 flood-prone locations.
- City selection logic: urban flooding = rainfall INTENSITY × drainage failure, not annual rainfall alone. Normals: Kolkata ~1,813, Chennai ~1,377, Bengaluru ~1,078, Pune ~841 mm.
- **Today [R1]:** Pune is the only working pack. Mumbai and Bengaluru exist as config stubs (centre, bounds, SACHET URL) + one slide.
- **Global: architecture only.** Pitch as "built to travel" (PetaBencana precedent: one platform across South/Southeast Asian cities); do not claim global data.

## 5. Core concept — the Source Fusion Engine
Pitch line: "WhatsApp gives you rumours. FloodWatch gives you a verified live picture."
**Trust tiers (badge on every pin):**
- Tier 1 OFFICIAL — auto-confirmed: Traffic Police post, PMC/District update, SACHET/IMD alert naming the area.
- Tier 2 NEWS — confirmed on one report: Indian Express / TOI / Punekar News / Pune Mirror coverage naming the road.
- Tier 3 CITIZEN WITH PHOTO — live as "Reported — verifying"; confirmed on a 2nd independent report within ~500 m / 30 min, or 3 "still flooded" taps.
- Tier 4 CITIZEN TEXT-ONLY / SOCIAL post — grey "unverified" until corroborated.
- BOOST signals (never a pin alone; raise a zone's risk): heavy rain over the zone + known hotspot (+ optional traffic-speed collapse). Shown as a hatched "likely to flood" zone, never as a pin. [R1 clarification]
Every pin shows: source (link where applicable), age in minutes, water level, photo if any, confirmation count. **A pin without source + age is never shown.**

**Place-name gazetteer matcher:** incoming text is matched against the city gazetteer (Pune target 100+ names; **today's minimum: the 26 traffic-police spots + ~15 demo names** [R1]). One advisory listing 13 junctions → 13 pins. Case-insensitive string match incl. common spellings (e.g. "Sinhgad"/"Sinhagad"); no ML.

## 6. Core flows
1. **Open app** → live map of the selected region: hotspot pins (grey = known-prone, no live report), live report pins by tier, radar toggle, official alert banner if SACHET has an active alert for the district.
2. **Route check (hero flow)** → saved route (Home ↔ Work / School) → live pins within ~300 m of the OSRM route line → verdict **Safe / Caution / AVOID** with reason + age of the deciding report → if AVOID/Caution, an alternate route (§10).
3. **Report (target < 10 s, one hand, no login)** → big Report button → GPS auto-pin (drag to adjust) → photo (Q7) → depth: ankle / knee / above-knee → passable for bikes? cars? → cause if visible (rain / clogged drain / nullah overflow / river-dam / unknown) → submit. Marathi labels on key actions [DEFAULT]; voice-note reporting is a stretch goal.
4. **Pin lifecycle** → Unverified → Confirmed (§5) → Stale after the expiry window (Q8) with visible countdown → Cleared (community "water cleared" taps, or expiry) → "Cleared today" list → feeds the historical hotspot map (direction 4).
5. **Alerts** → a confirmed pin on a saved route surfaces on app open and (demo) as a notification. Parent mode: scheduled morning route check.
6. **Live / Scenario mode [R1 — NEW, demo backbone]**
   - **Live mode:** only real feeds — Open-Meteo, RainViewer, SACHET, OSRM — plus whatever reports have actually been filed. On 21 Nov this will honestly show a dry evening.
   - **Scenario mode:** a scripted, timestamped event file (`scenario/pune-2019-09-25.json`) replayed on an accelerated clock (e.g. 1 real second = 1 scenario minute) with Play / Pause / Reset and a time scrubber. It injects: simulated rain cells, simulated grid values, a sample SACHET-format alert, a Traffic-Police-format post, citizen reports and confirmations, expiries.
   - Everything a scenario injects carries a visible **SIMULATED** tag; a persistent mode chip shows LIVE or SCENARIO. Real feeds keep running underneath, so a judge can see both at once.
   - The engine code (tiers, lifecycle, severity, routing, advisory) is identical in both modes — only the input source differs. That is the honesty story for §17.

## 7. The map — regional rainfall + heat layers [DEVANG]
One MapLibre map, layer switcher:
- **Layer A — Live flood reports** (§5/§6 pins), over a static risk layer from OSM/Overpass (underpasses, bridges, nullahs/streams), fetched once and committed as GeoJSON.
- **Layer B — Rainfall:**
  (a) **RainViewer radar [R1 corrected]:** past ~2 hours of radar frames, refreshed ~10 min. **Since 1 Jan 2026 the free API has no nowcast (future) frames and serves tiles only up to zoom 7** — set the raster source `maxzoom: 7` so MapLibre over-zooms; the layer is therefore regional, consistent with the honesty rule. Required credit: "Weather data by RainViewer" with a link to rainviewer.com. Coverage over Pune not verified — test on the laptop; if empty, the layer still demos "real, quiet today".
  (b) **Open-Meteo grid:** points across the REGION (~10–15 km spacing), precipitation + probability, fetched in ONE multi-coordinate request.
  (c) **Scenario rain cells [R1]:** in Scenario mode, rain is drawn as our own simulated cell polygons (tagged SIMULATED) — never faked as RainViewer tiles.
- **Layer C — Heat (7.2, built in from day one):** same grid, temperature + apparent temperature, IMD-coded thresholds (amber ≥ 37 °C, red ≥ 40 °C, severe ≥ 45 °C; heat-risk function in the starter kit), plus static cooling-point pins (drinking water, shade, ORS, clinics).
- **HONESTY RULE (live test, 21 Nov):** Open-Meteo snaps nearby points to the same model cell (Pune spread only 26.7–27.6 °C). Grid layers are REGIONAL, never street-level. Drawn as cells (Q1 build default).

## 8. Advisory engine — "Before you leave" [DEVANG]
Rule-based strip on the home screen + route result, driven by (a) nearest grid point, (b) live pins on the route, (c) the user's Mode.
RAIN rules (v1):
- Rain probability ≥ 50% or any rain expected → umbrella.
- Rain ≥ 2.5 mm/hr expected, or probability ≥ 80% → raincoat, not just an umbrella; waterproof bag/laptop cover.
- Wind gusts ≥ 40 km/h → raincoat only; riders advised to postpone if possible.
- Any ankle+ pin on/near route → gumboots, spare socks, phone in a waterproof pouch.
- Knee+ confirmed water on route → gear advice REPLACED by the hard warning (§9). Never advise wading through knee+ water.
HEAT rules (Layer C active):
- ≥ 37 °C → water, cap; outdoor workers: extra breaks.
- ≥ 40 °C → water + ORS, light clothing, avoid 11 am–4 pm.
- ≥ 45 °C → stop-work advisory for outdoor workers; health warning replaces gear advice.
Mode changes wording, not rules. Rules live in ONE table file (`engine/advisory.js`) so they can be read out to judges.

## 9. Hard safety warnings [DEVANG]
- GREEN — no live reports, no heavy rain expected.
- YELLOW — rain expected and/or an unverified report nearby: caution + gear advice.
- ORANGE — confirmed ankle-deep water on/near route, OR a clog pin + heavy rain: avoid if possible, alternate offered.
- RED — DO NOT ENTER ("Do not go into this area right now"): confirmed knee+ water; ANY report inside an underpass (red at any depth); river/nullah-overflow or dam-release alert for that corridor (e.g. Sinhagad Road / Ekta Nagar on Khadakwasla discharge); official "road closed/diverted" post.
- Rider mode shifts confirmed ankle-deep from ORANGE to RED.
RED behaviour: full-width red banner, pin pulses, route verdict AVOID with reason + source + age, alternate route auto-shown. Warnings are instructions, not information. Every warning carries its source.

## 10. Routing — OSRM, India-proven
- Engine: **OSRM** (BSD) on OpenStreetMap data (ODbL; attribution required; flood pins remain our own data).
- India evidence: Namma Yatri (OSM + OSRM, ~₹0.75/ride mapping cost), Ola Maps (OSRM routing engine), Cityflo (osrm-backend in production), Shadowfax (OSRM across 500+ cities).
- India data: Geofabrik western-zone extract (Pune + Mumbai), southern-zone (Bengaluru); India-tuned profiles exist (osrm_profiles_india) — **not used today**; stock `car.lua` is fine for the demo. [R1]
- One config value switches `OSRM_URL` between `https://router.project-osrm.org` and `http://localhost:5000`.
- **Prototype flood-aware routing [R1 — simplified, honest]:** request the route with OSRM alternatives (`alternatives=3`, `overview=full`, `geometries=geojson`); score each candidate by RED/ORANGE pins within 300 m; return the first clean candidate. If none is clean, add one via-point offset ~1 km perpendicular to the blocked pin and re-request once; if still blocked, verdict AVOID with "no safe route found — do not travel". Segment blocking via osrm-customize / traffic overrides = roadmap slide.
- **Google Traffic: there is NO open-source Google Traffic API.** Do not plan on it. Commercial fallbacks (TomTom incidents incl. Flooding category; Mappls with a two-wheeler profile) are roadmap only.

## 11. Deployment & hosting [DEVANG]
- **Tiles: Cloudflare R2 + PMTiles.** One PMTiles file per City Pack; browser fetches byte ranges. Build with `pmtiles extract` from Protomaps' daily planet build (§20). Render with **MapLibre GL JS** + pmtiles protocol + the `@protomaps/basemaps` style package.
  - **Glyphs and sprites today [R1]:** use the public Protomaps assets (`protomaps.github.io/basemaps-assets`); copy into R2 only if time allows.
  - R2: CORS must allow the `Range` header and expose `ETag`; versioned file names; r2.dev public URL acceptable for today, custom domain for production.
  - **Dev fallback [R1]:** serve the same `.pmtiles` file from the Vite `public/` folder until R2 is ready — one config value.
  - Cost: R2 free tier (10 GB-month, 1M Class A + 10M Class B ops/month, free egress). Expected demo cost ₹0. Required map credit: "Protomaps © OpenStreetMap".
- **Routing: OSRM on Devang's Windows laptop for the demo** (Docker Desktop on WSL2, official image; clip → extract → partition → customize once; demo: osrm-routed on localhost:5000). Laptop plugged in, sleep disabled. Fallback = public OSRM via the config switch.
- **SACHET proxy [R1]:** Vite dev-server proxy (`/api/sachet` → sachet.ndma.gov.in) for the laptop demo; the same path as a ~15-line Cloudflare Pages Function for the public URL. Client polls every 5 min and parses XML with DOMParser. No separate backend server today.
- **Report storage [R1]:** browser memory + localStorage (single-device demo per Q9). Multi-device sync (Cloudflare D1/KV) = roadmap.
- **Frontend: PWA** [DEVANG] — installable; also deployed to Cloudflare Pages as the submission URL.
- **Total stack cost story:** OSM free, OSRM free, R2 free tier, all weather/alert APIs free → zero data-licensing cost.

## 12. Data sources — master list with honesty status
REAL and wired in the prototype (no key):
- NDMA **SACHET** CAP RSS, Maharashtra: https://sachet.ndma.gov.in/cap_public_website/rss/rss_maharashtra.xml (Karnataka and all-India feeds exist). Tested live 21 Nov. No CORS → proxy (§11). District-level, not road-level.
- **Open-Meteo** Forecast API (rain, temperature, apparent temperature, gusts) + Flood API (river context). Tested live 21 Nov. Grid caveat in §7.
- **RainViewer** Weather Maps API: https://api.rainviewer.com/public/weather-maps.json — personal/educational use; **past radar only, max zoom 7, no nowcast since 1 Jan 2026** [R1]; attribution required.
- **OpenStreetMap + Overpass** — static risk layer (fetched once, committed).
- **OSRM** — §10.
BUILDABLE, NOT TODAY (roadmap / if time): GDELT DOC 2.0 news search; WordPress JSON feeds of Punekar News / Pune Mirror for Tier 2 auto-ingest; Reddit API.
MONITORED (human-curated in the prototype; label honestly, never claim automated scraping):
- **X:** Pune City Traffic Police, Pune City Police, PMC Care, District Collector, IMD + local journalists; #PuneRains. X API is paid → monitored list + paste-in box + gazetteer.
- **Facebook:** Pune Police / Traffic Police / PMC Care / Pune Mirror / Punekar News pages; resident groups. No API for others' pages → FloodWatch's own Page/Group/WhatsApp Channel as intake (roadmap). Precedent: PCMC WhatsApp photo-reporting.
- **Instagram / Reddit (r/pune):** monitoring list. Bluesky deprioritised.
REFERENCE / ROADMAP (cite, do not code against): Pune Weather Live app (IMD Pune + WRD, 100+ stations, no public API); Maharashtra RTDAS; IUDX Pune; CWC FFS; IMD API portal; MWRD Pravah; Neer Vazhvu.
- Dam-release corridor: Khadakwasla discharge announcements trigger the Sinhagad Road RED zone (§9). Jul 2024: Ekta Nagar residents said they were not warned in advance.
SEED DATA for today [R1]: starter-kit 10 pins (3 labelled SAMPLE — approximate positions) + Traffic Police 26-spot list (Jul 2026). PMC's 201-spot list = roadmap import if a published copy is found.

**Pin type: DRAIN CLOG** [DEVANG] — separate from flood pins. A clog marks its road AMBER: a clog is a PREDICTOR (clog + heavy rain = warning before the road floods; Traffic Police's Sayyad Nagar post blamed a clogged chamber). Clog pins roll into the ward-wise PMC work list (§13).

## 13. Civic loop + integration roadmap
- **PMC work list:** every confirmed flood/clog report is cause-tagged into a ward-wise list (location, photo, time, cause). **Today: a "Download CSV" button in an Authority tab** [R1 — cheap, shows "helps authorities respond faster"].
- **Hotspot memory:** cleared/expired reports accumulate into the flood-prone-spots map (direction 4).
- **7.2 Heat integration:** Layer C + heat rules + cooling-point pins. Same map, same alert engine.
- **7.1 E-waste (later):** collection points as static pins; pickup = report flow inverted.
- **Phase 2 — FloodWatch Companion for Google Maps (Chrome extension)** [DEVANG idea]: content-script panel on maps.google.com — area risk, RED-zone destination warning, "Open safe route in FloodWatch". HARD LIMITS: cannot change Google's routing; DOM is fragile; store review takes days. **Today: slide only** (Q3 default).
- **Phase 2 — Report where people already post [R1]:** WhatsApp/X "Disaster Bot" pattern (PetaBencana): reply to anyone posting about Pune waterlogging with a one-tap structured report link. Today: slide + the "Share to WhatsApp" button (§19).

## 14. OPEN QUESTIONS — status after r1
- **Q1. Grid visualisation** — [REC + build default] coloured grid **cells** for rain/heat data layers; smooth only for report density. Reason: honest to data resolution, and simpler to build.
- **Q2. Opening frame** — build default: Pune REGION (matches regional grid layers); one tap zooms to the city. Still open.
- **Q3. Extension** — build default: slide only. Still open if the PWA finishes early.
- **Q4. Reporting incentive** — STILL OPEN, biggest product risk. Research-backed proposal in §19 (meet people where they post + visible reciprocity + credit). Needed for the pitch, not the code.
- **Q5. Team roles** — **ANSWERED [DEVANG]:** two people via Orca. Devang = orchestrator (his laptop: OSRM Docker, PMTiles/R2, Scenario player, integration, demo). Teammate's laptop = worker running his own AI agents (UI, map layers, engine, feeds). Code goes to a team branch on github.com/shaikhaaquib042-wq/Youth-Festival-Hackathon-26-27 — **never `main`**; collaborator access must be granted by the repo owner first.
- **Q6. Product name** — still open; decide before slides (by 20:00).
- **Q7. Photo in report** — build as config `PHOTO_REQUIRED = false` (optional; a photo moves a report to Tier 3). Still open.
- **Q8. Expiry window** — build as config: flood pins 120 min, clog pins 360 min; Scenario mode compresses the clock. Still open.
- **Q9. Demo delivery** — [REC + build default] **laptop screen, everything on localhost**; judges file their test report on the laptop. Reason: venue Wi-Fi and judges' phones are the most likely live failure; this removes both from the critical path. Cloudflare Pages URL = submission link and QR, not the demo path.
- **Q10. Language depth** — build default: Marathi labels on key actions only. Still open.

## 15. Non-goals (v1 exclusions)
Not a weather app. Not a river/dam dashboard. Not a PMC complaint portal (the work list is a by-product). No login wall. No payments. No native app. No AI water-depth estimation. No claimed live scraping of X/Facebook/Google. No Google Traffic data. No global data claims.
**Cut for today [R1] (slide or roadmap only):** Mumbai/Bengaluru working packs (config stubs only); GDELT, news auto-ingest, Reddit, TomTom, Mappls; the Chrome extension build; Facebook/WhatsApp intake; osrm-customize segment blocking; India-tuned OSRM profiles; multi-device sync; full Marathi UI; voice reports.

## 16. Demo script (target < 3–4 minutes) [R1 revised]
0. (10 s) Problem hook: 25 Sep 2019 — 112 mm in ~3 hours, ~20 deaths; 29 Sep 2026 — one hour of rain, waterlogging despite 201 known spots. "The spots are known. The live picture isn't."
1. **LIVE mode**, Pune region, today: dry map, grey hotspot pins (26 traffic-police spots), real RainViewer layer (quiet), real Open-Meteo cells, real SACHET banner area, advisory "No rain expected — normal day." Say: "Everything you see now is real and live."
2. Flip to **SCENARIO: 25 Sep 2019**, press Play. SIMULATED rain cells sweep south Pune; simulated SACHET-format alert banner; grid cells turn amber/red; advisory flips to "Raincoat + umbrella; waterproof footwear if crossing Warje."
3. Paste a real-format Traffic Police post about a clogged chamber → gazetteer drops an AMBER clog pin (pre-flood signal).
4. Citizen photo report at the same spot (filed live by a judge on the laptop, < 10 s) → flood pin → second report confirms knee-deep → RED. Saved Sinhagad Road route flips to "AVOID — do not go into this area right now" with source + age; alternate route auto-shown (OSRM, localhost). Tap "Share to WhatsApp".
5. Scrub time forward → pin goes Stale → Cleared → appears in "Cleared today" and the hotspot memory. (Direction 2 + 4 shown.)
6. **Heat (see §21.8, ~60 s):** heat scenario → shift mode as a delivery rider → GREEN→ORANGE with Marathi voice → nearest cooling point → "I feel unwell" → Call 108. "One engine, two hazards, same people."
7. Close: City Pack slide (Pune live; Mumbai = same SACHET feed + 498 known spots; Bengaluru = 226 mapped spots), Phase 2 slide (Google Maps companion + WhatsApp bot), cost line: "OSM free, OSRM free, tiles on R2 free tier, alerts from NDMA — ₹0 in data licences."

## 17. Success criteria for the prototype
A judge can, unaided, in under ~3 minutes: read the live picture of a flooding evening; see a route verdict change with a stated reason, source and age; file a complete report in under 10 seconds with no login; and see an official alert, radar, citizen reports and a heat layer coexisting on one map — with the team able to state exactly which parts are real (weather grid, radar, SACHET, routing, the map) and which are simulated (the flood reports, scenario rain and scenario alert), **because the app itself labels them LIVE vs SIMULATED** [R1].

## 18. Build order — today, split for Orca [R1]
Timeboxes are hard. Each step must be demoable on its own; commit to the team branch after each.

| # | Time (IST) | Step | Owner | Done = you can show |
|---|---|---|---|---|
| 0 | 13:30–14:00 | Start long jobs: OSRM data prep (Docker), PMTiles extract, R2 bucket + CORS. Repo branch + scaffold (Vite, folders, config.js, citypacks/pune.json). | Orchestrator | Scaffold on branch; OSRM processing in background |
| 1 | –14:45 | PWA shell + MapLibre + Pune PMTiles (local file → R2 URL) + attribution | Worker | Pune map loads |
| 2 | –15:45 | Seed hotspots + 26 TP spots, report form, trust tiers, lifecycle (countdown/stale/cleared) | Worker | < 10 s report → pin with source/age/badge |
| 3 | –16:45 | Route check vs public OSRM: saved routes, 300 m buffer, verdict, alternates picker | Worker (engine) + Orch (review) | Sinhagad route flips to AVOID |
| 4 | –17:30 | Open-Meteo cells (rain + heat), RainViewer toggle (maxzoom 7), severity ladder, advisory strip, mode switch | Worker | Advisory changes with weather/mode |
| 5 | –18:15 | SACHET proxy + banner; paste-in box + gazetteer → pins incl. clog | Orchestrator | Paste police post → pins |
| 6 | –19:15 | **Scenario player** + `pune-2019-09-25.json` + LIVE/SIMULATED labelling + time scrubber | Orchestrator | §16 runs on Play |
| 7 | –20:00 | Switch to laptop OSRM; PWA manifest + service worker; CSV export; Share-to-WhatsApp; deploy to Cloudflare Pages | Both | Demo on localhost; public URL exists |
| 8 | –21:00 | Rehearse × 3, slides, code freeze at 21:00 | Both | < 4 min, repeatable |
| — | 21:00–22:00 | Buffer, README, submission | Both | Submitted |

**Cut rule:** if behind at 18:00 → gazetteer = 26 TP spots only, drop the Pages deploy and CSV. Never cut the Scenario player or the route verdict.
**Merge-conflict rule:** worker owns `src/ui`, `src/map`, `src/engine`, `src/feeds/openmeteo.js`, `src/feeds/rainviewer.js`; orchestrator owns `infra/`, `src/scenario`, `src/feeds/sachet.js`, `functions/`, `config.js`, `citypacks/`. Shared contract = the Pin object (below) — agree on it first.

**Pin object contract (freeze before step 2):**
```json
{ "id": "string", "type": "flood|clog|hotspot", "lat": 0, "lng": 0,
  "depth": "none|ankle|knee|above_knee", "inUnderpass": false,
  "passable": { "bike": true, "car": true },
  "cause": "rain|clogged_drain|nullah_overflow|river_dam|unknown",
  "tier": 1, "source": { "kind": "official|news|citizen|social|seed", "name": "string", "url": "string|null" },
  "photo": "dataURL|null", "createdAt": "ISO", "confirmations": 0, "clearedVotes": 0,
  "status": "unverified|confirmed|stale|cleared", "simulated": false }
```

## 19. Brainstorm — what else is worth building (ranked) [R1]
Ranked by judge impact ÷ build effort. **MUST** items are inside today's plan.

**MUST (in the plan)**
1. **LIVE vs SIMULATED labelling everywhere** — turns the biggest judging risk ("is any of this real?") into a strength.
2. **Time scrubber on the scenario** — shows directions 2 (auto-expiry) and 4 (hotspot memory) in 10 seconds instead of explaining them.
3. **Share to WhatsApp** (`https://wa.me/?text=…` with verdict + source + age + link) — ~20 lines. Meets the problem where it lives ("information appears in scattered WhatsApp messages") and turns every warning into a correction of the rumour.

**SHOULD (if on time at 19:15)**
4. **Reciprocity counter** on the home screen: "This monsoon, 41 neighbours' reports warned you 3 times. Return the favour → Report." Simulated numbers in Scenario mode. This is the Q4 answer made visible.
5. **"Cleared by" credit + ward recognition** — reporter's first name / ward on Cleared pins; ward leaderboard in the Authority tab.
6. **Offline-first shell** — the service worker caches the last map state; networks fail in floods. Say it, show airplane mode.
7. **Authority tab CSV export** — "helps authorities respond faster" from the official statement.

**COULD (slides only today)**
8. **Report where people already post (Disaster Bot pattern, PetaBencana):** a WhatsApp/X bot replies to "#PuneRains waterlogged at …" posts with a one-tap structured report link. Strongest Q4 answer, with Jakarta as proof it works at city scale.
9. **Embed partners:** PetaBencana's map was embedded in the Uber driver app → our open map/API embedded in Namma Yatri / delivery apps (Zomato, Swiggy, Zepto riders = Rider mode at scale). Impact-slide material.
10. **School-bus fleet view:** one parent-school dashboard of all bus routes with verdicts at 6:30 am.
11. **Depth-from-photo assist** — explicitly NOT v1 (non-goal); roadmap only.

**Q4 — proposed answer for the pitch (Devang to accept/reject):** we don't ask people to come to an app to report. (a) Meet them where they already post — WhatsApp/X reply-to-report (PetaBencana did this successfully in Jakarta). (b) Make the payoff visible — your route alerts exist because neighbours reported (reciprocity counter). (c) Credit — "cleared by", ward recognition, and PMC sees *your* clog report on its work list. (d) Ten seconds, no login. Safety information is never gated behind reporting.

## 20. Build recipes — exact commands for agents [R1]
**PMTiles (Pune region cut, ~10–40 MB):**
```
pmtiles extract https://build.protomaps.com/<YYYYMMDD>.pmtiles pune.pmtiles --bbox=73.60,18.35,74.10,18.75
```
Use a current date from https://maps.protomaps.com/builds/ (v4 build, compatible with @protomaps/basemaps ≥ 4). Add `--dry-run` first to see the size. Drag the result onto maps.protomaps.com to verify.

**MapLibre style essentials:**
```
glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf"
sprite: "https://protomaps.github.io/basemaps-assets/sprites/v4/light"
source: { type: "vector", url: "pmtiles://<TILES_URL>", attribution: "Protomaps © OpenStreetMap" }
layers: from the @protomaps/basemaps npm package (flavor "light")
```

**R2 CORS (bucket → Settings → CORS policy):**
```json
[{ "AllowedOrigins": ["http://localhost:5173", "https://<project>.pages.dev"],
   "AllowedMethods": ["GET", "HEAD"],
   "AllowedHeaders": ["range", "if-match"],
   "ExposeHeaders": ["etag"],
   "MaxAgeSeconds": 3000 }]
```

**OSRM on Windows (PowerShell, Docker Desktop on WSL2; data in C:\osrm):**
Download `western-zone-latest.osm.pbf` from Geofabrik (Asia → India). Clip to Pune to keep processing to minutes:
```
docker run --rm -v C:/osrm:/data stefda/osmium-tool osmium extract -b 73.60,18.35,74.10,18.75 /data/western-zone-latest.osm.pbf -o /data/pune.osm.pbf
docker run --rm -t -v C:/osrm:/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/pune.osm.pbf
docker run --rm -t -v C:/osrm:/data osrm/osrm-backend osrm-partition /data/pune.osrm
docker run --rm -t -v C:/osrm:/data osrm/osrm-backend osrm-customize /data/pune.osrm
docker run --rm -t -i -p 5000:5000 -v C:/osrm:/data osrm/osrm-backend osrm-routed --algorithm mld /data/pune.osrm
```
Windows tip: use a forward-slash path on a drive Docker Desktop shares (C:/osrm), or you get "file not found"/permission errors. Any osmium Docker image works; if the one above fails, use a Geofabrik/BBBike city extract or skip clipping (slower).
Test: `curl "http://localhost:5000/route/v1/driving/73.8567,18.5204;73.8070,18.4655?alternatives=3&overview=full&geometries=geojson"`

**Open-Meteo, whole grid in one call:**
```
https://api.open-meteo.com/v1/forecast?latitude=18.40,18.40,18.52,18.52,18.65,18.65&longitude=73.75,73.95,73.75,73.95,73.75,73.95&current=temperature_2m,apparent_temperature,precipitation,wind_gusts_10m&hourly=precipitation_probability,precipitation&forecast_days=1&timezone=Asia/Kolkata
```
(Comma-separated coordinates return an array, one object per point.)

**RainViewer:** fetch weather-maps.json → `host + radar.past[last].path + "/256/{z}/{x}/{y}/2/1_1.png"`; raster source `tileSize: 256, maxzoom: 7`; credit "Weather data by RainViewer".

**SACHET:** Vite `server.proxy['/api/sachet'] = { target: 'https://sachet.ndma.gov.in', changeOrigin: true, rewrite: p => '/cap_public_website/rss/rss_maharashtra.xml' }`; filter items whose text mentions "Pune".

## Sources added in r1
- Official problem statements PDF (Naya Bharat 2047, Code for Bharat), Problem 7.3 page.
- RainViewer API Transition FAQ — https://www.rainviewer.com/api/transition-faq.html
- Google India blog, Maps safety & disruption alerts — https://blog.google/intl/en-in/products/explore-communicate/google-maps-in-india-keeping-you-informed-with-new-safety-disruption-alerts/ ; Digit on Maps flood reporting (Oct 2024) — https://www.digit.in/news/apps/google-maps-will-now-send-alerts-for-fog-and-floods-gets-ai-features-to-save-your-time-too.html/amp/
- PetaBencana / RiskMap — https://www.itu.int/hub/2022/08/crowdsourcing-helps-mitigate-disasters/ ; https://restofworld.org/2021/hi-im-disaster-bot/ ; https://riskmap.mit.edu/
- Mumbai apps — https://www.freepressjournal.in/tech/6-apps-that-can-help-you-during-mumbai-flood-chaos-this-monsoon ; BMC 498 spots — https://www.freepressjournal.in/mumbai/bmc-boosts-dewatering-pumps-to-547-mithi-river-desilting-pending-as-waterlogging-spots-rise-10
- Pune Traffic Police 26 spots (3 Jul 2026) — https://www.punekarnews.in/?p=238846 ; PMC 201 spots, 29 Sep 2026 — https://www.punekarnews.in/?p=245973
- Protomaps docs (getting started, MapLibre assets, CLI) — https://docs.protomaps.com/guide/getting-started ; https://docs.protomaps.com/basemaps/maplibre
- OSRM Docker (MLD pipeline) — https://hub.docker.com/r/osrm/osrm-backend ; Windows path note — https://gist.github.com/do-me/43832cafeb7002f329f5c5e4392fd7dd

## Appendix — source files produced during PRD research (21 Nov 2026)
- environment-7.2-7.3-data-points-20261121.md — 7.2/7.3 facts and figures.
- pune-live-data-api-sources-20261121.md — Pune live-data/API inventory.
- pune-road-waterlogging-live-sources-20261121.md — road-waterlogging sources; river-vs-road analysis; 26-spot list.
- environment-starter-kit-20261121.md — seed-pin JSON (10 pins), heat-risk JS function, demo script, Open-Meteo grid caveat.
- 7.3-floodwatch-ideas-and-open-sources-20261121.md — source-fusion design, Facebook/X strategy.
- osrm-india-tools-20261121.md — OSRM in India, Geofabrik zones, India profiles.
- floodwatch-prd-v0.1 → v0.4 → FINAL → **FINAL-r1 (this file)**.
All in: workspace/goals/rotary-youth-festival-hackathon-pune-viksit-bharat/files/

---

## 21. HEAT MODULE — PS 7.2 "Too Hot to Work, Too Poor to Stop" [R2 — NEW, 21 Nov 14:00]
**Official brief (PDF p.22, paraphrased faithfully):** heatwaves are longer and more intense; construction workers, delivery riders, street vendors and farm labourers can't stay indoors in the afternoon because they need the day's wage. Most get no warning tailored to where they are, don't recognise early signs of heat illness, and don't know where the nearest drinking water, shade or cooling point is. **Affected:** outdoor and informal workers, elderly people, and the contractors/employers who manage them. **Challenge:** simple, local, timely warnings and guidance during extreme heat. **Directions named:** (1) hyperlocal heat alerts from public weather data, (2) voice or SMS in regional languages, (3) map of nearby drinking water, shade and cooling points, (4) guidance on recognising heat illness and getting help. **Hackathon-ready note:** free weather APIs; one city; crowdsourced cooling points; demo end to end. **Context:** India recorded nearly **48,000 suspected heatstroke cases and 159 heat deaths in 2024**, its warmest year since 1901; experts say official counts miss deaths outside hospitals (The Week, 27 Jul 2025 — cited in the PDF).

**Why one app, not two:** delivery riders and two-wheeler riders are named in BOTH briefs. The person who rides through 41 °C in May rides through waterlogged underpasses in September. Same question every day — "is it safe where I am / where I'm going, right now, and what do I do?" — same map, same report flow, same alert engine. 7.3 is the primary statement; heat is the second hazard.

### 21.1 Heat stress metric — estimated WBGT, not just temperature
Air temperature alone misses humidity (a 34 °C humid Mumbai afternoon is more dangerous for heavy work than a 41 °C dry Pune one). Use Open-Meteo `wet_bulb_temperature_2m` (Tw), `temperature_2m` (T), `shortwave_radiation` (SR) — verified available 21 Nov.
- **WBGT_shade ≈ 0.7·Tw + 0.3·T** (natural-wet-bulb ≈ Tw, globe ≈ air temp in shade).
- **WBGT_sun ≈ WBGT_shade + 2 °C when SR > 600 W/m²** (rule-of-thumb solar load).
- Label everywhere as **"estimated heat stress (WBGT)"** — regional grid value, not a sensor reading. Honesty rule §7 applies.
- Sanity check 21 Nov 13:45 Pune: T 29.9, Tw 16.1 → WBGT ≈ 20 shade / 22 sun → GREEN. Correct for a dry November noon.

### 21.2 Work / rest guidance (the "continuous assessment")
Simplified from the ACGIH heat-stress TLV table (acclimatised workers, WBGT °C, per hour). **[VERIFY before the pitch — say "based on international occupational heat-stress guidance", never "medically certified".]**

| Work type (examples) | Normal work below | 45 work / 15 rest | 30 / 30 | 15 / 45 | STOP heavy work above |
|---|---|---|---|---|---|
| **Light** — street vendor, guard | 31.0 | 31.0 | 32.0 | 32.5 | 32.5 |
| **Moderate** — delivery rider, walking work | 28.0 | 29.0 | 30.0 | 31.5 | 31.5 |
| **Heavy** — construction, farm labour, loading | 27.5 (45/15 from here) | 27.5 | 29.0 | 30.5 | 30.5 |

- Workers new to the heat (first week, or back from leave) → subtract `UNACCLIMATISED_OFFSET_C = 2.5` from every threshold.
- Status colours reuse §9: GREEN normal · YELLOW 45/15 · ORANGE 30/30 · RED 15/45 or STOP.
- **Water:** one cup (~250 ml) every 15–20 min while working in heat, even if not thirsty (standard occupational guidance). ORS if sweating heavily > 2 h.
- The table lives in ONE file (`src/heat/workrest.js`) so it can be read out to judges, like `advisory.js`.

### 21.3 Shift mode — continuous in-shift check (hero flow for 7.2)
1. **Start shift** → pick work type (Light / Moderate / Heavy, icons + Marathi/Hindi labels) → "new to heat?" toggle → GPS position (or a saved work site).
2. Every `SHIFT_CHECK_MIN = 30` min (and on every Open-Meteo refresh) recompute WBGT for the nearest grid point → big status card: colour, "Work 30 min / rest 30 min in shade", next break time, next water reminder.
3. **Reminders:** water every `HYDRATION_MIN = 20`; break start/end per the current cycle; status *change* (e.g. YELLOW → ORANGE) always announced.
4. **Voice** (direction 2): Web Speech API `speechSynthesis`, voice `mr-IN` → `hi-IN` → `en-IN` fallback. Phrases are a **fixed, hand-written table** in Marathi / Hindi / English (`src/heat/phrases.js`) — no runtime machine translation. Plus vibration + on-screen banner.
5. **Keep running:** Screen Wake Lock API while the shift is on. **Honest limitation:** a web app cannot alert reliably when the phone is locked/backgrounded → real SMS/IVR voice calls (Exotel/Twilio-type, paid) are Phase 2. Say this on the roadmap slide.
6. **Share to crew / supervisor** (contractors are named in the brief): one tap → `wa.me` message "Heat status Hadapsar site 14:30: ORANGE — work 30 / rest 30, water every 20 min. — Mausam Mitra". Same share code as §19.3.
7. Scenario clock compresses everything (30-min checks happen every 30 s in Scenario mode).

### 21.4 "I feel unwell" — heat-illness check (direction 4)
Big button on the shift card and the home screen. Two-step, tap-only, pictograms + Marathi/Hindi/English:
- **RED FLAGS → HEAT STROKE, EMERGENCY:** confusion or strange behaviour, slurred speech, fainting/collapse, seizure, very hot skin, stopped making sense. → full-screen **"Call 108 now"** (tap-to-dial `tel:108`; also `112`) + first aid while waiting: move to shade, cool fast (pour water on skin + fan, wet cloths/ice on neck, armpits, groin), loosen clothes, **do not give drinks if confused or unconscious**.
- **WARNING SIGNS → HEAT EXHAUSTION:** heavy sweating, cold clammy skin, dizziness, headache, nausea/vomiting, muscle cramps, weakness, fast pulse. → stop work, shade, loosen clothes, sip water/ORS, wet cloth; **not better in 1 hour or getting worse → call 108**. Shows the nearest cooling point / clinic.
- **Check a co-worker** mode: same questions phrased for a buddy ("Is he/she confused?").
- Never diagnoses; always ends with "If in doubt, call 108." Content from standard public heat-illness first-aid guidance (NDMA heatwave guidelines / WHO / CDC) — cite on the slide.

### 21.5 Cooling points (direction 3) — map + crowdsourcing
- **New Pin type `cooling`** (contract amendment, §18): optional `amenities: ["water","shade","ors","clinic","toilet","cool_room"]`. Tier logic unchanged (seed / citizen / official).
- **Seed (REAL, fetched once, committed):** OpenStreetMap via Overpass for the Pune pack bounds — `amenity=drinking_water`, `amenity=pharmacy` (sells ORS), `amenity=clinic|hospital|doctors`, `leisure=park` (shade). Attribution: © OpenStreetMap. File: `src/data/pune-cooling.json`.
- **Crowdsourced:** the same < 10 s report flow with a "Cooling point" choice → tick amenities → photo optional. Examples: a shop giving free water, a temple pandal, a shaded bus stop.
- **Lifecycle:** long-lived (`EXPIRY_MIN.cooling = 10080`, 7 days); "still here" / "gone" taps reuse `confirmations` / `clearedVotes`.
- **Nearest-first list** from the worker's position with walking distance (straight-line is fine for v1).

### 21.6 Map & alerts integration
- **Layer C (heat)** keeps IMD-style °C bands on the map for the public (amber ≥ 37, red ≥ 40, severe ≥ 45) — people understand °C. **Shift mode uses WBGT** for the work/rest decision. Both shown on the card: "40 °C · heat stress HIGH for heavy work".
- **Official heat alerts:** SACHET items whose text matches heat keywords (`heat wave`, `heatwave`, `उष्णतेची लाट`, `लू`) → Tier 1 banner. Same parser as §12.
- Home screen leads with the heat card when Layer C is active or a heat alert exists (Pedestrian / Outdoor-worker mode, §3); otherwise flood leads.

### 21.7 Heat scenario (demo)
`src/scenario/pune-heat-afternoon.json` — a **SIMULATED** dry pre-monsoon afternoon in Pune (e.g. 11:00 → 17:00, T rising to ~41 °C, RH ~20 %, strong sun), replayed on the scenario clock. Optional second file for a humid Mumbai afternoon (`?city=mumbai`, T ~34 °C, RH ~70 %) to show why WBGT beats temperature alone. Everything tagged SIMULATED.

### 21.8 Demo insert (replaces §16 step 6, ~60 s)
Flip to **Heat scenario** → "Start shift: delivery rider (Moderate)" → card goes GREEN → YELLOW → ORANGE as the afternoon heats up; **voice plays in Marathi** ("काम ३० मिनिटे, सावलीत विश्रांती ३० मिनिटे, दर २० मिनिटांनी पाणी प्या"); water reminder pops; tap "Nearest cooling point" → pharmacy with ORS 400 m; tap **"I feel unwell" → "confused?" yes → "Call 108"** screen. Share-to-crew on WhatsApp. Close line: "One engine, two hazards, same people."

### 21.9 Build plan for heat (orchestrator, starts now — the worker is unchanged)
| # | Time (IST) | Step | Owner | Done = |
|---|---|---|---|---|
| H0 | –14:30 | Amend Pin contract (`cooling`, `amenities`), config tunables, Overpass seed `pune-cooling.json` | Orchestrator | Data + contract committed before the worker reaches step 2 |
| H1 | –15:30 | `src/heat/`: `wbgt.js`, `workrest.js`, `phrases.js`, `voice.js`, `illness.js` (pure functions + tables, take `now`) | Orchestrator | Unit-checkable in the console |
| H2 | –16:30 | Shift-mode card + "I feel unwell" flow + crew share (in `src/heat/ui/`) | Orchestrator | Shift runs on live data |
| H3 | (step 6) | Heat scenario file + wiring into the Scenario player | Orchestrator | §21.8 runs on Play |
| — | (step 2/4) | Worker renders `cooling` pins with the same pin layer; Layer C cells | Worker | Cooling points visible |

**Cut rule (heat):** if behind at 18:00 → drop the co-worker mode and the Mumbai humid scenario; keep shift card + voice + "I feel unwell" + cooling points. Never cut the "Call 108" path.

### 21.10 Open questions (heat)
- **HQ1.** Can one submission cover two problem statements? If not, submit under 7.3 and present heat as the second hazard of the same engine. **Ask the organisers.**
- **HQ2.** Verify the work/rest numbers (§21.2) against the ACGIH/NIOSH source before quoting them on stage.
- **HQ3.** Is a Marathi (`mr-IN`) voice available on the demo laptop's browser? If not → Hindi voice + Marathi text on screen.
- **HQ4.** Supervisor/contractor dashboard (all workers on a site) — slide only today?

# ORCHESTRATOR PLAN: "Raasta", where do I even complain?

> Rotary x Rotaract "Naya Bharat 2047, Code for Bharat" hackathon, Problem 1.2 (Peacebuilding and Conflict Prevention, access to justice for everyday disputes).
> This file is the single brief for an orchestrator agent. It must be executable end to end inside one 5-hour usage window. Read it fully before starting. When this file and a skill disagree, this file wins; when this file and `safaldev` design rules disagree on visual taste, `safaldev` wins except where marked **[USER OVERRIDE]**.

---

## 0. Context

**Problem.** When people face an everyday dispute (deposit not returned, faulty product, neighbour's construction cracking a wall, unpaid wages, UPI fraud, pothole) they don't know which office handles it: police, consumer commission, labour office, ward office, Lok Adalat, free legal aid. Many give up or rely on whoever they know. DAKSH survey: 74% turn first to friends and family, 49% to village elders; police (40%) and lawyers (32%) top the list of channels people avoid. Small unresolved disputes harden into lasting conflict between neighbours and families.

**Challenge.** Help people quickly understand which authority or service handles their specific problem and what their first step is, often a free and peaceful one, before it escalates.

**Our answer.** A real, production-feeling web app that takes a person from "I have a problem" to "here is exactly where to go, what to bring, and the complaint is already drafted, filled, addressed or submitted". It covers **all four directions** in the problem statement and goes past them:

| Problem statement direction | Where it lives in Raasta |
|---|---|
| Guided question flow "What happened?" to "Here's where to go" | Per-category guided flows (`/help/:category/:dispute`) + the AI intake on the landing page, both feeding one deterministic rule engine |
| Plain-language assistant that explains each option | AI chat (landing 3/5 panel + chat drawer on every result) grounded only in our verified registry |
| Directory of local consumer, labour, legal-aid and municipal offices | `/offices` directory + map, location-aware, Pune hyperlocal down to the PMC ward |
| Document checklists for common complaint types | Checklist on every route result, tickable, printable, included in the filing packet PDF |

**Plus user-requested extras:** direct API submission where a real API exists, portal autofill helpers, very detailed step-by-step guides where neither works, 12-language UI with live translation of dynamic text, auto-filled downloadable forms and letters, one-tap `mailto:` / Gmail / Outlook drafts, printable postal labels and envelopes for physical complaints, legal-aid eligibility screener, statutory countdown timers, feedback form, "add a complaint system" form, voice input (flagged, future).

**Name.** Working name **Raasta** ("the way"). Kept in one constant `APP_NAME` in `packages/config/src/brand.ts` so the team can rename in one place. Tagline: "Find the right door for your problem."

**Non-negotiable honesty rule (from the data and from safaldev).** The tool guides people; it does not give legal advice. Every result screen carries: *"Raasta gives procedural guidance based on public government rules. It is not legal advice."* No fake counters, testimonials, logos or numbers. Only figures with a cited source (DAKSH, NCH, CPGRAMS, e-Jagriti, Tele-Law figures in `List of API and others.md` §6.2).

---

## 1. Inputs on disk (read these, in this order)

All paths relative to `C:\Users\notch\OneDrive\Desktop\Hackathon\`.

| File | What it is | How it is used |
|---|---|---|
| `Problem Statement.pdf` | The official problem (1 page) | Copy the problem text into `docs/PRODUCT.md` |
| `List of directories.json` | `india_grievance_platforms.json`: `metadata` + **22 platforms** with `id, name, managing_body, tier, domain, jurisdiction, urls, contact_channels, languages_supported, categories, fees, sla_and_timelines, mandatory_pre_steps, exclusions, documents_required, upload_constraints, step_by_step_guide, escalation_path, automation` | **Source of truth** for portals. Copy verbatim into `packages/data/src/platforms.json`. Never let an LLM rewrite URLs, fees, phone numbers, emails or deadlines from it |
| `List of API and others.md` | Developer handbook: BHASHINI, DIGIT/UPYOG PGR API, API Setu/DigiLocker, Overpass, prefill helpers, datasets, verified Pune offices (§3.1) and all 15 PMC ward offices + 5 zone DMCs (§3.2), NALSA Sec 12 eligibility + income ceilings for all 37 States/UTs (§4), architecture pattern (§5.1), statutory timers (§5.2), guardrails (§5.3), 10 MVP disputes (§6.1), pitch stats (§6.2) | Seeds `offices.pune.json`, `legal-aid.json`, `timers.json`, `guardrails.ts`, dispute list |
| `Mock Data.json` | 4 dispute question schemas (deposit, defective product, unpaid wages, neighbour damage) + a Pune directory incl. ward office addresses | Seeds the question-schema format for guided flows; ward addresses merge into the ward table (prefer §3.2 emails/phones from the handbook where they differ) |
| `.claude/Refernces.md` | **Empty file (0 bytes).** | Use the HopeMeals tokens recorded in the `safaldev` skill (`references/design.md` §2) instead. If the user later fills this file, re-check the palette against it |
| `safaldev` skill | Design taste, tokens, checklist | Load at start (`Skill: safaldev:safaldev`), then read `references/design.md` §0, §1, §2, §7 and `references/requirements-checklist.md` |

Data facts to respect (from the handbook):
- No central portal offers an open citizen write API (OTP login + captcha everywhere). The **only** programmable filing target is the open-source **DIGIT / UPYOG PGR API** (`POST /pgr-services/v2/request/_create`), live in some ULBs (Punjab mSeva, Odisha SUJOG, Kerala K-SMART, HP) and runnable as a sandbox.
- WhatsApp prefill (`wa.me/<num>?text=`), `mailto:`, `tel:`, X intent are supported for specific platforms; templates live in each platform's `automation` block.
- Never link `edaakhil.nic.in` (retired 1 Jan 2025, use `e-jagriti.gov.in`). Never iframe PMC pages. Use PMC toll-free `1800-103-0222`. Block RTI, sub-judice and personal/family matters from CPGRAMS. Route pure deposit refunds to Small Causes Court / DLSA / Tele-Law, not police.

---

## 2. Agent and model policy (credit-aware)

Usage is limited. The orchestrator spends tokens on **decisions, contracts, integration and review**, never on boilerplate.

| Role | Model / tool | Effort | Use for | Do NOT use for |
|---|---|---|---|---|
| Orchestrator | Opus 5.5 (current session) | as set | Reading this plan, writing contracts (`packages/*/src/types.ts`), dispatching, reviewing diffs, merging, final checklist | Writing components or data files itself |
| Builder, small | **Haiku 5.5** (`model: "haiku"`) | **low** | Scaffolds, config files, data normalisation scripts, i18n string files, SEO files, legal pages, small presentational components, icons, `_headers`, link checker, Playwright boilerplate | Anything needing cross-file design judgement |
| Builder, big | **Sonnet 5.5** (`model: "sonnet"`) | **medium** | Systems that can't be split further: rule engine, Worker API + AI adapter, landing page shell + page-transition system, result/action centre, document + label generator, translation pipeline, DIGIT adapter | Small edits (send those to Haiku) |
| Local interpreter | **Ollama `qwen3.5:4b`** | n/a | Draft plain-language summaries, intent keywords (en/hi/mr), dispute tags per platform (§5.2) | Any verified field (URL, fee, phone, email, deadline) |
| Antigravity (agy CLI, §12.1) | **`gemini-3.8-flash-medium`** primary (`-high` for the structure analysis, `-low` for re-runs); `claude-sonnet-4-6` inside agy only for very menial tasks (its quota runs out fast). agy has no Haiku; never use `claude-opus-4-6-thinking` | set by model id | (1) Independent QA: analyses full program structure, writes its own test suites, runs them, debugs, writes reports. (2) **Small coding, only when the orchestrator approves it**: approved small fixes from its own report and other small, self-contained tasks (one to three files), which saves Claude credits | Unapproved app-code changes. On its own initiative it edits only `qa/agy/**`; every proposed fix goes to the orchestrator first, who either hands it back to agy as an approved task (§12.1 step 4) or gives it to Haiku/Sonnet |

**Credit rules for the orchestrator:**
1. Before dispatching, write the shared contracts (types, file paths, props, endpoint shapes) into the repo so agents read 1 to 3 files, not the whole tree.
2. Each agent prompt contains: goal, exact files to create/edit, the contract file paths, acceptance checks, "do not touch" list, and "report in under 150 words: files changed, checks run, open issues".
3. Batch related small tasks into one Haiku agent rather than many. Target totals: **about 8 Haiku runs, about 6 Sonnet runs**. Never more than 3 agents in parallel; never two writers on the same files.
4. Never re-dispatch a failed agent with the same prompt: read its report, narrow the task, then re-dispatch.
5. Run long commands (`npm install`, builds, Playwright) in the background.
6. Use `rtk` transparently (hooked); prefer `git status`/`git diff --stat` over full diffs; read files with offsets.
7. Set model and effort explicitly on every dispatch (the user asked for these levels): Haiku agents `Agent({ model: "haiku", effort: "low", ... })`, Sonnet agents `Agent({ model: "sonnet", effort: "medium", ... })`. Never leave them to defaults and never use Opus subagents.
8. Prefer agy (Gemini, effectively unlimited) over a Haiku run for any small, approved, self-contained fix after Phase P4, to save Claude credits.

---

## 3. Repository and branch

1. `cd C:\Users\notch\OneDrive\Desktop\Hackathon` then create the app folder `raasta\` (keep the input files outside the repo; copy what is needed into `raasta/packages/data/source/` with a `SOURCES.md` noting origin and date).
2. `git init -b main` inside `raasta\`, add `.gitignore` (node_modules, dist, .wrangler, `.env*` except `.env.example`, `.dev.vars`, `qa/agy/tmp`, coverage, playwright-report), first commit "chore: scaffold".
3. `git remote add origin https://github.com/shaikhaaquib042-wq/Youth-Festival-Hackathon-26-27.git`, `git fetch origin`. If the remote has a default branch with content, base the work branch on it (`git checkout -b Posterguys origin/<default>` and move the scaffold in); otherwise `git checkout -b Posterguys`.
4. All work is committed on **`Posterguys`** only. Commit after each phase with conventional messages ending in:
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
5. Push **only** `Posterguys` (`git push -u origin Posterguys`), only after the secret scan in §12 passes. Never push to `main`, never force-push.

---

## 4. Architecture

```
raasta/
  apps/
    web/                 React 19 + Vite + TypeScript, react-router 7 (data router), Tailwind 4, framer-motion (lazy)
                         -> Cloudflare Pages at https://raasta.safalmutha.in (prerendered static HTML per language,
                            small progressive-enhancement JS)
    api/                 Cloudflare Worker, Hono 4, TypeScript -> same origin via Worker routes
                            raasta.safalmutha.in/api/* and raasta.safalmutha.in/r/* (server-rendered dynamic pages)
  packages/
    data/                Verified JSON registry + zod schemas (platforms, disputes, offices, legal-aid, timers, states)
    rules/               Pure TS deterministic routing engine (runs in the Worker; no network, no LLM)
    i18n/                Locale JSON for static UI labels (12 languages) + language metadata
    docs-gen/            Server-side document generators run in the Worker (letters, notices, forms, postal labels)
    config/              brand.ts, feature flags, shared constants
  scripts/               ingest, ollama-interpret, link-checker, i18n-sync, env-sync, prerender, secret-scan
  qa/                    vitest + playwright suites; qa/agy/ for Antigravity's own tests and reports
  docs/                  PRODUCT.md, DESIGN.md, SECURITY.md, DEPLOY.md, DATA.md, PITCH.md
  CLAUDE.md              Points to docs/PRODUCT.md, docs/DESIGN.md, this plan
```

npm workspaces (`"workspaces": ["apps/*","packages/*"]`), Node 20+, TypeScript strict, ESLint, Prettier, Vitest.

**Domain: `https://raasta.safalmutha.in`** (already purchased, zone `safalmutha.in` is on Cloudflare). Use it everywhere: canonical URLs, sitemap, OG tags, `ALLOWED_ORIGINS`, `VITE_SITE_URL`, Turnstile hostname, emails in templates. Pages serves the site on this hostname; the Worker serves `/api/*` and `/r/*` on the **same origin** through Worker routes (a Worker route on a path wins over Pages), so there is no cross-origin traffic, no CORS surface and one simple CSP.

### 4.0 Hard rule: thin client, server first (works on old phones)
Raasta must load and work on old and low-end devices (e.g. a 2017 Android Go phone on 2G/3G, Android 7 Chrome, iOS 12 Safari, low RAM, no WebGL). All real work happens on the server (Cloudflare Worker); the device only shows HTML and sends forms.
- **Every core journey works without JavaScript**: landing prompt, guided questions, route result, documents, email links, postal labels, offices list, legal-aid screener, emergency page, feedback. Each is a plain HTML `<form method="post">` to a Worker route that returns server-rendered HTML (`/r/ask`, `/r/flow/:dispute/:step`, `/r/route/:token`, `/r/doc/:template`, `/r/offices`, `/r/legal-aid`, `/r/feedback`). JavaScript, when present, upgrades the same forms to in-place updates, streaming chat and animations (progressive enhancement), never replaces them.
- **Server does:** AI intake and chat, rule engine, geo resolution and PMC ward point-in-polygon (the GeoJSON stays on the server, never downloaded), translation, PDF and label generation, mailto/Gmail/Outlook link building, office lookup, routing/directions, DIGIT submission. The route result is encoded in a short signed token (HMAC with `TOKEN_SECRET`, holds only the slots, expires in 7 days, nothing stored server-side) so a result page is a plain shareable GET.
- **Device does:** render HTML/CSS, optional small JS for enhancement, store the language and location choice in a cookie (`raasta_lang`, `raasta_loc`, no tracking, `SameSite=Lax`).
- **Budgets (enforced in CI):** first load of any page under **60 KB gzip JS** (landing JS is optional and deferred), under **50 KB CSS**, at most 2 web-font files per page (subset, `font-display: swap`, skipped entirely when the `Save-Data` header is on), total page weight under 300 KB without the map, LCP under 2.5 s on Lighthouse slow-4G mobile, usable on 360 px width and 1 GB RAM.
- **Old-browser support:** `browserslist`: `defaults, Chrome >= 61, Safari >= 12, Samsung >= 8, Firefox ESR, not dead`; `@vitejs/plugin-legacy` for the optional JS; no required WebGL, WebAssembly, View Transitions or fetch streaming (all used only when detected).
- **Motion on old devices:** animations are CSS transform/opacity; framer-motion loads lazily and only on capable devices (`navigator.deviceMemory >= 2` and no `prefers-reduced-motion` and no Save-Data). Low-end devices get the static drawn "street of doors" and instant page changes.
- **Map is opt-in**: offices and directions show the address, distance and time as text plus "Open in OpenStreetMap / maps app" links; the interactive map loads only when the user taps "Show map" (Leaflet, about 40 KB, raster tiles, no WebGL).

### 4.0.1 Hard rule: everything free
No paid service, plan or API may be required to run, demo or deploy Raasta. Paid keys may be used only if the user adds them, never as a dependency.

| Need | Free choice (default) | Free-tier notes |
|---|---|---|
| Hosting | Cloudflare Pages + Workers Free | 100k Worker requests/day; Pages unlimited static requests |
| Storage | Workers KV, D1 (free tier) | KV 100k reads / 1k writes per day; D1 5 GB |
| Abuse protection | Workers rate-limiting binding, Turnstile | both free |
| AI (chat + intake) | **Gemini API free tier** (`GEMINI_API_KEY`), then **Workers AI** (free daily allocation, e.g. `@cf/meta/llama-3.3-70b-instruct-fp8-fast`), then **Groq / OpenRouter free models** via the OpenAI-compatible slot | Anthropic/OpenAI only if the user supplies a key; the app must work fully on the free providers |
| Translation | **BHASHINI** (free government API) -> **Workers AI `@cf/meta/m2m100-1.2b`** (free allocation) -> Gemini free tier -> original text | No paid Google Cloud Translation |
| Maps, geocoding, routing | OSM raster tiles (usage-policy compliant, attribution), Nominatim, Overpass, OpenRouteService free key (2,000 routes/day) or public OSRM | All cached in KV to stay inside fair-use limits |
| Fonts, icons | Google Fonts, lucide | free |
| PDFs | `pdf-lib` + `@pdf-lib/fontkit` inside the Worker | free, no headless browser |
| Local model | Ollama `qwen3.5:4b` | free, dev only |
| CI / repo | GitHub, npm scripts, Playwright | free |
| DIGIT demo | local mock server (and optional local docker) | free |

To stay inside free limits: cache every AI explanation and translation by hash in KV, use the deterministic rule engine first and call AI only for free-text intake and chat, cap chat to 12 turns per session, and degrade gracefully (show the guided flow) when a daily quota is used up.

### 4.1 The core pattern (from handbook §5.1, mandatory)

```
User text / voice / guided answers
   -> [AI slot extraction]  (LLM returns ONLY a JSON object matching IntakeSlots, validated with zod)
   -> [Geo resolver]        (state, district, city, ULB, PMC ward via turf point-in-polygon)
   -> [Rule engine]         (packages/rules: deterministic, returns RouteResult)
   -> [Explainer]           (LLM rephrases RouteResult in plain language in the user's language,
                             may cite ONLY fields present in RouteResult; never invents links, fees or deadlines)
   -> [Action centre]       (API submit / autofill / guide / WhatsApp / email / call / PDF / postal label)
```

Contracts to write first, in `packages/rules/src/types.ts`:

```ts
export type DisputeType =
  | "consumer_refund" | "mrp_overcharge" | "unpaid_wages" | "security_deposit"
  | "neighbour_construction" | "civic_failure" | "cyber_fraud" | "cyber_harassment"
  | "banking_nbfc" | "insurance_claim" | "investment_broker" | "builder_delay"
  | "govt_service" | "pension_pf" | "workplace_harassment" | "police_complaint"
  | "lost_mobile" | "free_legal_aid" | "other";

export interface IntakeSlots {
  dispute_type: DisputeType;
  summary: string;                    // <= 280 chars, PII-redacted
  state_code?: string; district?: string; city?: string; lat?: number; lng?: number;
  amount_inr?: number; days_since_incident?: number;
  prior_written_complaint_sent?: boolean; prior_complaint_days_ago?: number;
  opposite_party_type?: "company" | "shop" | "landlord" | "employer" | "neighbour" | "government" | "bank" | "unknown";
  employer_sphere?: "central" | "state" | "unknown";
  is_emergency?: boolean;             // UPI fraud in last 72h, threat to safety
  nalsa_status_flags?: NalsaFlag[];   // woman, child, sc_st, industrial_workman, disability, custody, trafficking, disaster
  annual_income_inr?: number;
  missing_fields: string[];           // what the assistant still needs to ask (max 3 follow-ups)
}

export interface RouteResult {
  dispute_type: DisputeType;
  urgency: "emergency" | "time_sensitive" | "normal";
  first_peaceful_step: Step;          // e.g. written notice, NCH mediation, Tele-Law call, Lok Adalat
  primary: ForumOption;               // the right door
  alternatives: ForumOption[];        // escalations / parallel tracks, ordered
  documents: ChecklistItem[];
  timers: TimerSpec[];                // from handbook §5.2
  legal_aid: { eligible: "yes" | "likely" | "check" | "no"; reason_key: string; contact: OfficeRef };
  offices: OfficeRef[];               // nearest relevant offices
  warnings: string[];                 // guardrail keys (e.g. "not_police_for_deposit")
  sources: { platform_id: string; url: string }[];
}

export interface ForumOption {
  platform_id: string;                // id from platforms.json
  why_key: string;                    // i18n key, plain-language reason
  fee: string; sla: string;
  submission: SubmissionMode[];       // ordered best-first
}

export type SubmissionMode =
  | { kind: "api"; adapter: "digit_pgr"; tenantId: string }
  | { kind: "prefill_url"; template: string }
  | { kind: "autofill_helper"; portal: string }      // bookmarklet / copy tray
  | { kind: "whatsapp"; template: string }
  | { kind: "email"; to: string; cc?: string; subjectKey: string }
  | { kind: "post"; addressRef: string }
  | { kind: "phone"; number: string }
  | { kind: "in_person"; officeRef: string }
  | { kind: "guide" };                                 // always present as the last fallback
```

---

## 5. Data layer (`packages/data`)

### 5.1 Ingest (Haiku, low)
`scripts/ingest.mjs`:
- Copy `List of directories.json` platforms into `platforms.json` unchanged; add zod schema `platformSchema` matching every key listed in §1; fail the build on schema drift.
- Build `offices.pune.json` from handbook §3.1 (10 anchor offices) and §3.2 (15 ward offices + 5 zone DMCs, keep the exact published spelling `hadpsar@punecorporation.org`), merging addresses from `Mock Data.json` `pune_directory.pmc_ward_offices` by fuzzy ward name.
- Build `legal-aid.json`: Section 12 status list + income ceilings for all 37 States/UTs (handbook §4.2), Tele-Law "free for all" note, helpline `15100`.
- Build `timers.json` from handbook §5.2.
- Build `disputes.json`: 19 dispute types (§4.1) each with: category, icon (lucide name), guided questions (format from `Mock Data.json`), document checklist, template variables, default platform ids. The 10 MVP disputes in handbook §6.1 get full depth; the rest get standard depth.
- Build `states.json`: all 36 States/UTs with code, name, languages, SLSA contact (from NALSA directory, see below), state grievance portal, legal-aid income ceiling, and `coverage: "deep" | "standard"` (Maharashtra deep; everyone else standard = central + sectoral portals + SLSA + state grievance portal + Overpass office lookup).
- `scripts/fetch-nalsa.mjs` (one-off, polite: single request, proper User-Agent, cached to `source/`): parse `https://nalsa.gov.in/directory/` table into SLSA contacts. If fetching fails, ship SLSA entries with only the `nalsa.gov.in` link and `verified:false`.
- State grievance portals (Aaple Sarkar MH, IGRS UP, CM Helpline MP 181, Rajasthan Sampark, Delhi PGMS, Karnataka IPGRS, TN CM Helpline, Telangana Prajavani, AP PGRS, Kerala CMO, Bihar Lok Shikayat, Haryana CM Window, Punjab PGRS, Gujarat SWAGAT, WB CM grievance, others): every URL starts `verified:false` and only flips to `true` when `scripts/check-links.mjs` gets a 2xx/3xx. Unverified links are shown with "Check this link is current" text, never hidden as if verified.
- Pune geo: download DataMeet `pune-admin-wards.geojson` and `pcmc-electoral-wards.geojson` (CC-BY-SA 2.5 India, attribute in footer and `/about/data`), simplify with `mapshaper`, commit to `apps/api/src/geo/` (bundled into the Worker; never sent to the device).

### 5.2 Ollama interpretation (local, free)
`scripts/ollama-interpret.mjs`:
1. `ollama list`; if `qwen3.5:4b` is missing, `ollama pull qwen3.5:4b`. If Ollama is not running or the pull fails, skip this step and give the same job to one Haiku agent.
2. For each platform, POST `http://localhost:11434/api/chat` with `{"model":"qwen3.5:4b","format":"json","stream":false,"options":{"temperature":0.2}}` and a prompt that supplies the platform JSON and asks for exactly:
   `{ "plain_summary_en": "<= 50 words, Class 8 reading level", "who_should_use": "...", "intent_keywords": {"en":[], "hi":[], "mr":[]}, "dispute_types": [<from DisputeType list>], "first_peaceful_step_hint": "..." }`
3. Validate with zod; reject any output that contains a URL, phone number, rupee figure or day count (regex) since those must come from the verified registry.
4. Write `packages/data/src/derived/platform-insights.json` with `"source": "qwen3.5:4b-draft"`. One Haiku pass then spot-checks 5 random entries against the registry and fixes obvious errors. The UI shows these summaries; all hard facts still come from `platforms.json`.

### 5.3 Data tests
Vitest: every platform validates; every dispute maps to at least one platform; no URL contains `edaakhil`; every `mailto` target is a well-formed email; every Pune ward has phone + email; all 37 legal-aid ceilings present.

---

## 6. Rule engine (`packages/rules`) (Sonnet, medium)

Pure functions, 100% deterministic, fully unit tested.

- `route(slots: IntakeSlots, geo: GeoContext): RouteResult`.
- Decision tables per dispute type, encoded as data (`rules/tables/*.ts`), not if-chains. Each table returns ordered forum options + first peaceful step. Mirror handbook §6.1 exactly for the 10 MVP disputes, e.g.:
  - `consumer_refund`: Company GRO letter (first step) -> NCH `1915` / WhatsApp `8800001915` -> e-Jagriti (fee Rs 0 up to Rs 5 lakh). Timer: 2-year limitation, note NCH does not pause it.
  - `unpaid_wages`: 7-day demand notice PDF -> state sphere Mahakamgar / Pune ALC, or SAMADHAN if central sphere -> civil summary suit flag; NALSA industrial-workman check.
  - `security_deposit`: 15-day notice PDF + move-out checklist -> Tele-Law / DLSA Pune (Lok Adalat) -> Small Causes Court. Warning `not_police_for_deposit` unless cheating indicated.
  - `neighbour_construction`: dual track PMC encroachment + GPS-matched ward office email, and DLSA / civil injunction guide. Peaceful first step: neighbour letter + DLSA pre-litigation mediation.
  - `civic_failure`: PMC vs PCMC by polygon -> WhatsApp prefill (`8888251001` PMC / `9922501450` PCMC) + Swachhata + Aaple Sarkar 21-day escalation. Outside Pune: DIGIT API if the ULB is DIGIT-enabled, else the city portal from `major_metro_municipal_portals`, else state grievance portal.
  - `cyber_fraud`: **emergency screen first**: `tel:1930`, bank 3-working-day zero-liability letter, `cybercrime.gov.in` evidence packager.
  - `banking_nbfc`: lender complaint generator + 30-day countdown -> RBI CMS (blocked before day 30).
  - `builder_delay`: MahaRERA registration check -> conciliation (Rs 1,000 + GST) vs Form A (Rs 5,000) + forum-exclusivity notice.
  - `govt_service`: Aaple Sarkar (state) vs CPGRAMS (central), exclusion filter (RTI, sub-judice, family -> blocked with explanation).
  - `workplace_harassment`: SHe-Box + internal committee guidance, extra privacy mode (nothing stored, no AI call unless the user opts in).
- `guardrails.ts`: all §5.3 rules as named checks applied to every RouteResult; violations throw in tests.
- `legalAid.ts`: Sec 12 status check + state income ceiling -> eligible/likely/check/no.
- `timers.ts`: turns incident date + prior complaint date into live countdowns.
- Tests: one golden test per dispute type + per guardrail + state fallback (a Kerala user, a UP user, a Pune PMC user, a PCMC user, unknown location).

---

## 7. Backend: Cloudflare Worker (`apps/api`) (Sonnet, medium)

Hono app, `wrangler.jsonc`, `compatibility_date` current, `workers_dev` true for the demo, observability on.

**Bindings** (create with the Cloudflare MCP tools: `kv_namespace_create`, `d1_database_create`; record ids in `wrangler.jsonc`):
- KV `CACHE` (translations, reverse geocode, Overpass results; TTL 30 days).
- D1 `raasta-db` tables: `feedback(id, created_at, rating, category, message, page, lang)`, `system_requests(id, created_at, state, city, dispute_desc, portal_url, contact_optional)`, `digit_submissions(id, created_at, tenant_id, service_request_id, status)` (no PII: only the reference returned by DIGIT).
- Rate limiting bindings: `CHAT_LIMITER` (20/60s per IP), `FORM_LIMITER` (5/60s), `TRANSLATE_LIMITER` (60/60s).
- Optional `AI` binding (Workers AI) as the free last-resort model.

**Server-rendered pages** (HTML, the no-JS path from §4.0; same handlers as the JSON endpoints, different renderer): `/r/ask`, `/r/flow/:dispute/:step`, `/r/route/:token`, `/r/guide/:platformId`, `/r/doc/:template`, `/r/offices`, `/r/directions`, `/r/legal-aid`, `/r/feedback`, `/r/submitted/:id`. Rendered with React `renderToString` from shared components (or Hono JSX for the simplest pages), same design tokens and CSS file as the static site.

**Endpoints** (all JSON, zod-validated input, generic error bodies; same origin, so CORS is closed except localhost in dev):

| Method + path | Purpose |
|---|---|
| `POST /api/intake` | Text -> `IntakeSlots` via LLM with JSON schema output; PII redaction first (§11); returns slots + up to 3 follow-up questions |
| `POST /api/chat` | Streaming (SSE) plain-language assistant. System prompt includes ONLY the RouteResult + relevant platform records; instructed to refuse legal advice and never output URLs other than those supplied. Server post-filter strips any URL not in the registry |
| `POST /api/route` | Server copy of the rule engine (same package) for clients without JS-heavy capability and for tests |
| `POST /api/translate` | Dynamic text translation, cache-first in KV keyed by `sha256(lang + text)` |
| `GET /api/geo/reverse?lat&lng` | Nominatim reverse geocode (proper User-Agent, 1 req/s, KV cache rounded to 3 decimals). Fallback: `request.cf.region` / `city` for coarse, permission-free personalisation |
| `GET /api/offices?type&lat&lng` | Registry offices first; Overpass fallback for non-deep states (cached, ODbL attribution) |
| `GET /api/directions?from&to&mode` | OSM routing (ORS / GraphHopper / OSRM per `.env`) for physical visits, §8.6; KV-cached, rate-limited |
| `POST /api/submit/digit` | DIGIT/UPYOG PGR `_create` adapter (§8.1) |
| `GET /api/submit/digit/:id` | `_search` status for the confirmation page |
| `POST /api/feedback` | Turnstile check -> D1 |
| `POST /api/system-request` | Turnstile check -> D1 ("add a complaint system for my area") |
| `GET /api/health` | liveness |

**AI provider adapter** (`apps/api/src/ai/`): one interface `complete({system, messages, schema?, stream?})`; order set by `AI_PRIMARY` and the keys present, **free providers first** (§4.0.1):
1. Google Gemini free tier (`GEMINI_API_KEY`, a Flash model).
2. Workers AI binding (free daily allocation, no key).
3. OpenAI-compatible slot pointed at a free provider (Groq free tier or OpenRouter `:free` models) via `OPENAI_BASE_URL` + `OPENAI_API_KEY`.
4. Anthropic, only if the user adds `ANTHROPIC_API_KEY` (`claude-haiku-5-5`); load the `claude-api` skill before writing this provider.
5. Ollama (`OLLAMA_URL`, dev only, refuses to run unless the host is localhost).
If no provider is configured, the UI hides the chat box and shows the guided flow instead (no broken feature).

**Translation adapter** (`apps/api/src/translate/`): BHASHINI pipeline (config call -> compute call, per handbook §1.1, IDs from env) -> Workers AI `@cf/meta/m2m100-1.2b` (free, open-source model) -> Gemini free tier -> optional self-hosted LibreTranslate (`LIBRETRANSLATE_URL`, only if the team runs one) -> return source text with `translated:false`. No paid translation API.

### 7.1 Environment variables
Commit `.env.example` with every name and a one-line comment; real values go in `.env` (git-ignored), which the user fills later. `scripts/env-sync.mjs` copies `.env` into `apps/api/.dev.vars` for local dev and, on request, runs `wrangler secret bulk` for deploy. Names:

```
# AI
ANTHROPIC_API_KEY=  GEMINI_API_KEY=  OPENAI_API_KEY=  OPENAI_BASE_URL=  OLLAMA_URL=http://localhost:11434
AI_PRIMARY=gemini              # gemini | workers | openai | anthropic | ollama (keep a free one first)
# Translation / speech
BHASHINI_USER_ID=  BHASHINI_ULCA_API_KEY=  BHASHINI_PIPELINE_ID=64392f96daac500b55c543cd
LIBRETRANSLATE_URL=           # optional, self-hosted only
# DIGIT / UPYOG
DIGIT_BASE_URL=  DIGIT_TENANT_ID=  DIGIT_CLIENT_ID=  DIGIT_CLIENT_SECRET=  DIGIT_CITIZEN_UI_URL=
# OpenStreetMap (maps, geocoding, directions for physical visits, §8.6)
OSM_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png   # raster tiles for the opt-in Leaflet map (free, attribution required)
NOMINATIM_URL=https://nominatim.openstreetmap.org
OSM_ROUTING_PROVIDER=ors        # ors | graphhopper | osrm
OSM_ROUTING_API_KEY=            # OpenRouteService or GraphHopper key (leave empty for osrm)
OSRM_URL=https://router.project-osrm.org
OSM_USER_AGENT=Raasta/1.0 (hackathon project)
# Security
TURNSTILE_SECRET_KEY=          # server
VITE_TURNSTILE_SITE_KEY=       # public, safe in browser
ALLOWED_ORIGINS=https://raasta.safalmutha.in,http://localhost:5173
TOKEN_SECRET=                  # HMAC key for signed route-result tokens (§4.0)
# Web (public)
VITE_SITE_URL=https://raasta.safalmutha.in   # API is same-origin (/api), no separate base URL
```
Nothing secret is ever referenced via `import.meta.env` in `apps/web` (only `VITE_*` public values).

---

## 8. Submission ladder (the core user-requested feature)

For every route, the Action centre shows the **best available** mode first and always keeps the next ones visible. Truthful labelling: we never claim to have filed something we only drafted.

### 8.1 Level 1: Direct API submission
- Only where a real write API exists: the DIGIT/UPYOG PGR stack. Adapter builds the `RequestInfo` envelope (handbook §1.2), obtains a citizen token via the configured OAuth client for the sandbox/ULB, uploads evidence to `egov-filestore`, calls `pgr-services/v2/request/_create`, stores only the returned `serviceRequestId`.
- Confirmation page `/submitted/:id`: success illustration, reference number, copy button, SLA timer, and **"See your complaint"** link to `${DIGIT_CITIZEN_UI_URL}/complaints/${serviceRequestId}` plus a live status pulled from `_search`.
- For demo: a feature flag `digit_sandbox` points at a local DIGIT docker or a mock server (`apps/api/test/digit-mock.ts`) and the confirmation clearly says "Demo sandbox" while in that mode.
- We never automate OTP, captcha or logins on government portals. That is both a legal and a safety line.

### 8.2 Level 2: Autofill
- **URL prefill** where the registry says `url_param_prefill: true` (open the portal with fields in the query string).
- **WhatsApp prefill** (`wa.me/<n>?text=`) for PMC, PCMC, NCH and other bots with templates in `automation`.
- **Autofill helper ("Fill with Raasta")**: for the top portals with stable forms (e-Jagriti, cybercrime.gov.in, CPGRAMS, PMC CARE, Aaple Sarkar), a field map `packages/data/src/fieldmaps/<portal>.json` (selector -> slot). The user opens the portal in a new tab, logs in themselves (OTP/captcha done by them), then clicks a bookmarklet that reads the complaint from the clipboard (copied by Raasta as JSON) and fills matching fields. Fallback inside the same UI: the **Copy tray**, one copy button per field in the portal's field order. Field maps are best-effort and marked "last checked" with a date; if a selector misses, the helper says which fields to paste by hand.
- Portals open with `target="_blank" rel="noopener noreferrer"`, never in an iframe.

### 8.3 Level 3: Very detailed step-by-step guide
Route `/guide/:platformId`. Built from each platform's `step_by_step_guide`, `mandatory_pre_steps`, `documents_required`, `upload_constraints`, `fees`, `sla_and_timelines`, `escalation_path`, expanded (once, at build time, by one Sonnet agent, reviewed by the orchestrator) into:
- An overview card: "You will need about N minutes, these documents, this fee, and you will hear back in X days."
- A vertical stepper, one screen-sized step at a time: what you see on the page, what to click, what to type (with the user's own drafted text and a copy button beside each field), what can go wrong, and how to know it worked.
- Pre-flight checklist (documents scanned under the portal's file-size limit; a Worker-side PDF merger (`pdf-lib`, free) that combines uploaded scans into one file for `upload_constraints`; heavy image compression is not done on old phones, the guide instead says how to scan at a lower quality setting).
- After-filing: save the reference number (stored only on device), countdown timer to the escalation date, and the next door if there is no reply.
- Offline path: which office, address, timings, what to carry, sample of what to say at the counter.
No fabricated screenshots; illustrations are drawn schematic SVGs of "a form with a highlighted field", not fake portal captures.

### 8.4 Level 4: Email
- `buildMailto(to, cc, subject, body)` with UTF-8 encoding; if the encoded URL exceeds 1,800 chars, the body is trimmed to a summary and the full letter goes into a downloadable PDF with a note "full letter attached, please attach this file".
- Alongside `mailto:`: "Open in Gmail" (`https://mail.google.com/mail/?view=cm&to=&cc=&su=&body=`) and "Open in Outlook" (`https://outlook.office.com/mail/deeplink/compose?to=&subject=&body=`) and "Copy email".
- Recipients only from the registry (ward officer + zone DMC cc for PMC, grievance officers, DLSA emails).

### 8.5 Level 5: Post and in-person
- **Postal packet** generator: cover letter, complaint/notice, document index, and a **shipping label** sheet: To (office from registry) / From (user's address typed on device), India Post Speed Post / Registered Post A.D. guidance, printable on A4 (4 labels) and as a DL envelope (220 x 110 mm) layout, plus a "proof of posting" reminder and a field to save the article number for tracking on indiapost.gov.in.
- `tel:` buttons for helplines; office cards with map, hours, and "what to carry".

### 8.6 Physical visits: OpenStreetMap directions
Whenever a step needs the person to go somewhere (ward office, consumer commission, DLSA / Lok Adalat, labour office, police station, court, post office, regulator HQ), the step shows a **"Get there"** panel built entirely on OpenStreetMap:
- **Text first (server-rendered):** address, distance, travel time and the turn list as plain text from the Worker, so it works on any phone.
- **Map (opt-in, "Show map"):** Leaflet (no WebGL) with OSM raster tiles from `OSM_TILE_URL` showing the user's rounded location, the office pin and the route line, with OSM attribution.
- **Office location:** coordinates from the registry; if missing, geocode the registry address once via Nominatim (`NOMINATIM_URL`) in the Worker, cache in KV, and mark the pin "approximate" until verified.
- **Route and travel time:** Worker endpoint `GET /api/directions?from=lat,lng&to=officeId&mode=foot|car|bus` calls the routing service configured in `.env` (`OSM_ROUTING_PROVIDER=ors|graphhopper|osrm`, with `OSM_ROUTING_API_KEY` for OpenRouteService or GraphHopper, `OSRM_URL` for a public/self-hosted OSRM). Returns distance, duration and a simplified polyline (no step list stored). Cached in KV by rounded coordinates. Public transport: show the walking/driving route and a note to check local bus/metro; no invented transit data.
- **Hand-off buttons:** "Open in OpenStreetMap" (`https://www.openstreetmap.org/directions?route=<from>;<to>`), plus "Open in your maps app" via `geo:` URI on Android, and a Google Maps directions link as a convenience fallback.
- **Visit checklist** in the same panel: office hours and closed days (from the registry when available, else "Call before you go" with the `tel:` link), documents to carry (from the route's checklist), originals plus 2 photocopies reminder, what to say at the counter, and "save this route offline" (print-friendly page with map image and address).
- Privacy: origin coordinates rounded to 3 decimals before leaving the device; the user can type a starting landmark instead of sharing GPS.
- If no routing key is set, the panel still shows the map, the address and the OSM / maps-app links (no broken feature).

---

## 9. Documents and forms (`packages/docs-gen`) (Sonnet, medium)

All generated **on the server, in the Worker** (§4.0), so old phones only download the finished file. Privacy: the user's details are sent once over HTTPS, used in memory to build the file, and never stored or logged; the response has `Cache-Control: no-store`. This is stated in the Privacy Policy.
- Templates (each as a typed function `(slots, user, office, lang) => DocModel`): consumer complaint to company GRO, legal notice / demand notice (7-day wages, 15-day deposit), e-Jagriti complaint draft with affidavit format, NCH grievance text, cyber fraud bank intimation (3 working days), RBI CMS lender pre-complaint, MahaRERA conciliation request, CPGRAMS / Aaple Sarkar grievance text, PMC ward letter, neighbour letter for amicable settlement, NALSA / DLSA legal aid application, police complaint (written FIR request) draft, SHe-Box narrative helper, RTI is out of scope (link to rtionline only).
- Renderers:
  - **English**: `pdf-lib` in the Worker returns a ready PDF (`Content-Disposition: attachment`), so it downloads on any device.
  - **Indic languages**: `pdf-lib` cannot shape Devanagari/Tamil/etc. correctly, so the Worker returns a print-styled HTML page (Noto Sans / Baloo script fonts, A4 `@page` rules) that the user saves with the phone's own "Print / Save as PDF" or "Download page". No client-side rasterising. Every Indic letter also offers the English PDF (most offices accept English).
  - Postal labels and envelopes: `pdf-lib` in the Worker (A4 4-up labels and DL envelope), English and transliterated address lines.
- "Fill form" UI: a short form with only the template's `template_variables`, autofilled from the intake slots; the user edits, previews live, then downloads.
- Existing official PDF forms that are fillable (AcroForm) can be filled with `pdf-lib` `getForm()`: only include ones we have locally and are allowed to redistribute; otherwise generate our own formatted letter.
- Every document footer: "Prepared with Raasta. This is a draft for you to check, sign and send. It is not legal advice."

---

## 10. Frontend (`apps/web`)

### 10.1 Design system (write `docs/DESIGN.md` first, Haiku low from this section)
Follow `safaldev` defaults (design.md §1, §2, §7) with the HopeMeals saffron and green palette, plus these **[USER OVERRIDE]** points: slightly more formal than HopeMeals (calm, trustworthy, government-adjacent), Caveat used at most once per page and never on result screens, no jokes on dispute screens.

| Token | Hex | Use |
|---|---|---|
| `ink` | `#1D2B22` | Headings, strong text |
| `ink-700 / 600 / 500` | `#3B4A40 / #4E5D53 / #66756B` | Body, labels, meta |
| `saffron-700` (action) | `#E56420` | Primary pill buttons only, white bold text; one solid per view |
| `saffron-500 / 600` | `#FF8C42 / #F57A2F` | Accents, never under white text |
| `saffron-50 / 100` | `#FFF5EB / #FFE6CC` | Warm grounds |
| `leaf-700 / 600` | `#2D7341 / #3D8854` | Links, focus ring, success, "free" labels |
| `leaf-200` | `#A2E0B4` | Completed steps, filled checklist |
| `sage-50..400` | `#F4F8F2..#8FB57F` | Alternate grounds, borders |
| `chakra-700` | `#1F3A8A` | Info only (Ashoka-chakra navy), sparingly |
| `alert-700` | `#B91C1C` | Emergency screen, errors |

- Fonts (Google Fonts, one `<link>`, `display=swap`, subset by script): **Baloo 2** (display 600, curvy rounded, supports Devanagari), **Nunito** (body), Caveat (one aside). For other scripts use the Baloo family siblings so the look stays curvy everywhere: Baloo Bhai 2 (Gujarati), Baloo Da 2 (Bengali/Assamese), Baloo Thambi 2 (Tamil), Baloo Tamma 2 (Kannada), Baloo Tammudu 2 (Telugu), Baloo Chettan 2 (Malayalam), Baloo Paaji 2 (Gurmukhi), Baloo Bhaina 2 (Odia); Noto Nastaliq Urdu for Urdu (RTL). Load only the font for the active language.
- Shape: pill buttons 50px, cards 24 to 34px radius, panels 32 to 56px, soft forest-tinted shadows, wave edges between sections, blobs. No sharp corporate boxes, no all-caps, no eyebrow labels, no decorative status pills, no gradient text, no purple, no emoji icons (lucide + hand-drawn SVG), **no em dashes anywhere** (add a build guard that fails if `dist` contains U+2014).
- Light mode only. WCAG 2.1 AA, 44px targets, 3px leaf focus ring, skip link, landmarks, one h1 per page.

### 10.2 Signature idea: "The street of doors"
A hand-drawn SVG Indian street (rolling into the page bottom on the landing hero and as the progress header on results): a police chowki, consumer commission, labour office, ward office, Lok Adalat / legal aid centre, bank, and a post office, each with a door. As the user types or answers questions, doors that no longer apply gently dim and the right one warms in saffron, its door swings open, and a dotted path draws from the user's marker to it. On the result page the path continues through each step (first peaceful step -> primary door -> escalations) like a route map. This is the memorable, playful object (safaldev "signature idea"), and it literally answers "where do I go". Built as inline SVG + framer-motion (transform/opacity only), lazy-loaded below 1 KB of critical CSS, with a static drawn state under `prefers-reduced-motion`.

### 10.3 Page transitions and motion (heavy, but done properly)
**[USER OVERRIDE]** The user asked for heavy work on transitions and rich graphics, so this overrides safaldev's "one motion moment per view" rule. The craft rules still apply: transform and opacity only, reduced motion honoured, prerendered content visible without JS.
- React Router + framer-motion `AnimatePresence` with a shared **"path" transition**: on navigation an SVG dotted path sweeps across (from the clicked tile to the next page's header), then content rises in (y 16 -> 0, opacity 0.0 -> 1 only on client-navigated pages; prerendered first paint is visible by default).
- Use the View Transitions API where supported for shared elements (category tile -> category page header, door -> result header); fall back to framer `layoutId`.
- Micro-motion: tiles lift 2px with soft glow, arrows nudge, checklist ticks draw, timers count, the chat bubble "writes" in.
- Easing `cubic-bezier(0.16, 1, 0.3, 1)`, 240 to 520 ms. Everything collapses under `prefers-reduced-motion`. Load `animate`, `framer-motion`, `emil-design-eng` skills for this work.

### 10.4 Landing page (desktop >= 1200px)
```
+-----------+-------------------------------------------+---------------------------+
| LEFT RAIL | AI PROMPT (3/5)                           | COMMON COMPLAINTS (2/5)   |
| logo      | h1 "Tell us what happened. We'll show you |  Pothole / road           |
| language  |     the right door."                      |  Garbage / water          |
| location  | big rounded prompt box (multi-line),      |  Police complaint / FIR   |
| ---       | mic button (flag), send pill              |  Cyber or UPI fraud  1930 |
| Categories| example chips ("My landlord kept my       |  Faulty product / refund  |
|  Money &  |  deposit", "Salary not paid for 2         |  Salary not paid          |
|  shopping |  months", "Pothole outside my house")     |  Deposit not returned     |
|  Work     | "Prefer questions? Answer 4 quick ones"   |  Free legal aid check     |
|  Home     | -> guided flow link                       |                           |
|  Civic    | privacy line: "Don't type Aadhaar,        |  "Near you" strip when    |
|  Police   |  bank or OTP numbers. We never ask."      |  location is on           |
|  Cyber    |                                           |                           |
|  Govt     |         ~~~ street of doors (SVG) ~~~     |                           |
|  Legal aid|                                           |                           |
+-----------+-------------------------------------------+---------------------------+
```
- Rail: categories (with counts of systems available in the user's state), state/city chip ("Pune, Maharashtra" with change), language switcher (also a first-visit picker), links to Directory, How it works, Feedback.
- When location is allowed the rail and the right column re-order to show the systems that exist there (PMC/PCMC for Pune, the city portal elsewhere, the state grievance portal).
- Below the fold (short, not overwhelming): "How Raasta works" (3 drawn objects joined by a dashed line: tell, see the right door, file or send), "Free and peaceful first" (Lok Adalat, Tele-Law, legal aid explained in 3 sentences), one sourced fact as a sentence (DAKSH), FAQ (`<details>`), footer with disclaimer, data attributions, Terms, Privacy.
- **Tablet (768 to 1199px):** rail collapses to an icon rail with labels on hover/focus; prompt full width; common complaints become a 2-row horizontal scroller under it.
- **Mobile (< 768px):** top bar (logo, language, menu); prompt first; common complaints as a 2-column tile grid; categories in a bottom-sheet menu; sticky "Ask" bar. Test at 320, 375, 414, 768, 1024, 1280, 1536, 1920 px.

### 10.5 Other routes
| Route | Content |
|---|---|
| `/chat` | Full chat view (deep link from landing). Left: conversation. Right (or tab on mobile): live "Your route" card that fills as slots are known |
| `/help` | All categories |
| `/help/:category` | Category page: disputes in it, short explainer, relevant systems for the user's state |
| `/help/:category/:dispute` | Guided question flow (one question per screen, progress path, back/skip, max 6 questions) |
| `/route` | Result: first peaceful step, the right door, why, fee/SLA, documents checklist, timers, legal-aid screener, offices near you, Action centre (§8), "Explain this to me" chat drawer |
| `/guide/:platformId` | Detailed step-by-step guide (§8.3) |
| `/documents/:template` | Fill and download a letter/form/label (§9) |
| `/submitted/:id` | API submission confirmation with "See your complaint" |
| `/offices` | Directory with filters (type, state, city) as a server-rendered list; opt-in Leaflet map with OSM raster tiles (OSM attribution) |
| `/state/:code` | State page: deep or standard coverage, state portals, SLSA, ceiling |
| `/legal-aid` | 15-second eligibility screener (Sec 12) |
| `/emergency` | UPI fraud / safety: 1930, 112, bank letter, evidence steps; reachable in one tap from everywhere |
| `/feedback` | App feedback (rating, what worked, what didn't) + "Add a complaint system for my area" form |
| `/about`, `/about/data` | Who built it, how it works, data sources and licences, last verified dates |
| `/privacy`, `/terms`, `/disclaimer` | Real pages, DPDP Act 2023, Indian law, data retention table |
| `*` | Custom 404 with the street of doors ("This door doesn't exist. Here are the ones that do.") |

### 10.6 Location
1. On first visit: coarse location from the Worker (`request.cf`) personalises state silently (no prompt, no storage beyond the session).
2. "Use my exact location" button explains why (ward-level routing) before calling `navigator.geolocation`. Coordinates are rounded to 3 decimals before leaving the device; reverse geocode via `/api/geo/reverse`.
3. Pune: the Worker runs `@turf/boolean-point-in-polygon` on its bundled GeoJSON -> PMC ward or PCMC -> ward officer email + zone DMC cc. No GeoJSON on the device.
4. Manual state/city picker always available (works without JS as a plain form). Stored only in the `raasta_loc` cookie (state/city, no coordinates), clearable.

### 10.7 Languages
- `react-i18next`; static UI labels hand-checked in 12 locale files: `en, hi, mr, bn, ta, te, kn, ml, gu, pa, or, ur` (Urdu RTL with `dir="rtl"`). One Haiku agent translates `en.json` into all files in one run with a glossary of fixed legal terms (Lok Adalat, FIR, Consumer Commission, Tehsil, Ward Office keep their common local names) and a "keep it plain, Class 8 level, formal-polite register" instruction. Marathi and Hindi get an extra orchestrator spot-check.
- Dynamic text (registry summaries, AI replies, guides) goes through `/api/translate` with KV caching; the original English is one tap away ("Show original").
- Language switcher: on the landing hero (prominent), in the rail/top bar everywhere, and a first-visit picker sheet showing each language in its own script. Choice saved in `localStorage` and in the URL (`?lang=mr`) for sharing.
- Number/currency formatting with `Intl` `en-IN` (lakh grouping, Rs symbol).

### 10.8 Voice (future, behind flag `voice_input`, default off)
Mic button uses BHASHINI ASR (via Worker) for Indian languages, Web Speech API as fallback, with "Read aloud" via BHASHINI TTS. Ship the code path and flag; the UI hides the button while the flag is off (no "coming soon" stubs on screen). Document in `docs/ROADMAP.md`.

### 10.9 Frontend build
- Vite + React 19 + TS, Tailwind 4 with tokens from §10.1, `lucide-react` (tree-shaken, inlined as SVG at prerender), `framer-motion` (lazy, capable devices only), `react-i18next`, `leaflet` (lazy, opt-in map), `@vitejs/plugin-legacy`, Turnstile via its plain script tag. No `pdf-lib`, turf or GeoJSON in the browser bundle (they live in the Worker).
- Prerender every static route **once per language** (`/`, `/mr/`, `/hi/`, ...) so pages are readable with no JS in all 12 languages.
- Prerender every static route to HTML at build (vite SSR build + `scripts/prerender.mjs`), hydrate on the client.
- Code-split: map, chat streaming, animations; every page within the §4.0 budgets (under 60 KB gzip JS on first load), checked by a CI size guard.
- `sourcemap: false`, no `console.log` in production, no "Vite + React" anywhere.

---

## 11. Privacy and security (tightest reasonable)

- **No accounts, no login.** Nothing personal stored server-side (requests are processed in memory only, see §9). Language and coarse location live in cookies; optional drafts and saved reference numbers live in `localStorage` (only when JS is available) under one namespace with a visible "Clear everything on this device" button; sensitive flows (SHe-Box, cyber harassment, police) default to memory-only.
- **PII redaction before any AI call** (`packages/rules/src/redact.ts`, used in web and Worker): Aadhaar (12 digits, Verhoeff), PAN, phone, email, bank/card numbers, UPI ids, OTP-like 4 to 8 digit codes are masked as `[PHONE]` etc. The UI warns users not to type them. AI providers are called with no-retention/no-training options where offered; chat content is **not logged** (Worker logs only status codes and timings).
- Never collect OTPs, PINs, passwords, card numbers. Never automate captcha or login.
- Turnstile on feedback, system-request and the first chat message of a session; rate limit bindings on every endpoint; body size limit 16 KB (chat) / 4 KB (forms).
- Strict `_headers` on Pages: CSP (`default-src 'self'`; `script-src 'self' https://challenges.cloudflare.com`; `connect-src 'self'`; `img-src 'self' data: https://tile.openstreetmap.org`; `font-src https://fonts.gstatic.com`; `style-src 'self' https://fonts.googleapis.com`; `frame-src https://challenges.cloudflare.com`; `frame-ancestors 'none'`; `form-action 'self'`; Trusted Types where feasible), HSTS, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(self), microphone=(self), camera=()`, COOP/CORP same-origin. `noindex` on `*.pages.dev` previews (production is `raasta.safalmutha.in`). The Worker sends the same headers on `/r/*` HTML responses.
- Worker: same-origin only (CORS closed; `ALLOWED_ORIGINS` used for the Origin/Referer check on POSTs, which also covers no-JS form posts), origin check on mutating calls, zod on every input, escaped output in anything rendered as HTML, generic errors, secrets only via `wrangler secret`.
- `scripts/secret-scan.mjs` (or `gitleaks` if installed) before every commit and push; `npm audit --omit=dev` clean of high/critical.
- Load the `security-review` skill for the final pass; write `docs/SECURITY.md` with findings and owner actions.

---

## 12. Testing and QA

**Claude side (Haiku writes, orchestrator runs):**
- Vitest: data schemas (§5.3), rule engine goldens (§6), guardrails, legal-aid screener, redaction, mailto builder length handling, docs-gen snapshot tests.
- Worker: `@cloudflare/vitest-pool-workers` tests for every endpoint (validation, rate-limit, CORS, Turnstile mocked, AI adapter mocked, DIGIT mock).
- Playwright e2e on Chromium at 375, 768, 1280: landing -> prompt -> route -> download PDF; guided flow for each MVP dispute; language switch to Marathi and Urdu (RTL); emergency screen in one tap; feedback submit; keyboard-only run; `axe-core` zero serious violations.
- `scripts/check-links.mjs`: every registry URL (HEAD/GET, polite, sequential) -> report; fail on `edaakhil` or 404s in verified links.
- Build guards: no em dash in `dist`, no `console.log`, no source maps, no secret patterns, bundle-size budget.

**Antigravity side (independent, Gemini 3.8 Flash):** the orchestrator writes `qa/agy/BRIEF.md` once the app builds, containing: how to run (`npm i`, `npm run dev`, `npm test`), the architecture summary from §4, and these instructions:
1. Analyse the full program structure first and write `qa/agy/STRUCTURE.md`.
2. Write your own tests only under `qa/agy/tests/` (Vitest + Playwright), covering routing correctness against `platforms.json`, guardrails, i18n completeness (missing keys per locale), responsive layout at 8 widths, accessibility, security headers, API abuse (oversized bodies, bad origins, injection strings, prompt injection in chat asking for fake URLs).
3. Run them; write findings to `qa/agy/REPORT.md` as a ranked list: severity, file:line, repro, suggested fix.
4. **Do not modify any file outside `qa/agy/`.** Fixes are proposed only.
5. Use Gemini 3.8 Flash for everything; use Claude models inside Antigravity only for very small, menial tasks.
The orchestrator reads `REPORT.md`, accepts or rejects each finding, and dispatches accepted fixes to Haiku (small) or Sonnet (systemic). Re-run agy once after fixes.

### 12.1 Driving the Antigravity CLI (`agy`)
Installed at `C:\Users\notch\AppData\Local\agy\bin\agy.exe` (on PATH). Models available (`agy models`):

| Model id | Use |
|---|---|
| `gemini-3.8-flash-high` | First pass: full program structure analysis + writing the test suites |
| `gemini-3.8-flash-medium` | Default for running tests, debugging, writing the report |
| `gemini-3.8-flash-low` | Cheap re-runs after fixes, i18n key diffs, link checks |
| `claude-sonnet-4-6` | Only for very menial work when Gemini struggles (formatting a report, renaming tests). Limited quota |
| `claude-opus-4-6-thinking`, `gpt-oss-120b-medium` | Do not use |

Run agy **non-interactively in the background** from the repo root, in `plan`/`accept-edits` mode limited to `qa/agy/`, so it cannot change app code. Do not use `--dangerously-skip-permissions`.

```powershell
# 1. Structure analysis + write tests (background, ~20-40 min)
agy -p "$(Get-Content qa/agy/BRIEF.md -Raw)" --model gemini-3.8-flash-high --mode accept-edits --sandbox --output-format json --print-timeout 45m > qa/agy/run1.json

# 2. Run tests, debug, write REPORT.md (continue the same conversation)
agy -c -p "Run every suite in qa/agy/tests, investigate failures, and write qa/agy/REPORT.md as specified in BRIEF.md. Edit nothing outside qa/agy/." --model gemini-3.8-flash-medium --mode accept-edits --sandbox --output-format json > qa/agy/run2.json

# 3. Re-check after the orchestrator's fixes
agy -c -p "Re-run all qa/agy tests against the current code. Update REPORT.md: mark each finding fixed, still open, or new." --model gemini-3.8-flash-low --mode accept-edits --sandbox --output-format json > qa/agy/run3.json
```

```powershell
# 4. Approved small coding task (only after the orchestrator approves a specific finding or task)
agy -c -p "APPROVED TASK: <finding id + exact fix>. You may edit ONLY these files: <paths>. Run <test command> afterwards and report the result in qa/agy/REPORT.md." --model gemini-3.8-flash-medium --mode accept-edits --output-format json > qa/agy/run-fix-<id>.json
```
For step 4 the orchestrator reviews the diff (`git diff -- <paths>`) and the test result before committing; anything wrong is reverted and reassigned to Haiku.

Rules: the orchestrator starts each run with `run_in_background` and keeps building; after each run it checks `git status` and **reverts any change agy made outside `qa/agy/` and outside the paths of an approved task** (`git checkout -- <path>`), then reads `REPORT.md`. If `--sandbox` blocks `npm`/Playwright, rerun without `--sandbox` but keep `--mode accept-edits` and the same path rule. If a Gemini run fails twice on the same task, retry once with `--model claude-sonnet-4-6` and a narrower prompt; otherwise skip and note it in `docs/CHECKLIST.md`.

---

## 13. SEO, content and polish (safaldev checklist)
Favicon set (SVG door + saffron path mark, ICO, 32, apple-touch, 192/512 maskable, webmanifest), OG images 1200x630 per main route (generated SVG -> PNG at build), canonical per route, unique h1 + meta description per route, JSON-LD (Organization/NGO-style project, WebSite with SearchAction, WebPage, BreadcrumbList, FAQPage only where FAQ is visible, GovernmentOffice entries on `/offices` pages with address and geo), `robots.txt` (disallow `/api/`), `sitemap.xml`, `llms.txt`, breadcrumbs on inner pages, alt text everywhere, custom 404 with true 404 status, zero console errors, `hreflang` for 12 locales. Copy voice: warm, plain, formal-polite, sentence case, no em dashes, no AI filler, no fake numbers.

---

## 14. Deployment (Cloudflare)
1. Load Cloudflare MCP tools (`ToolSearch` "cloudflare kv d1") and create KV `raasta-cache`, D1 `raasta-db` (apply `apps/api/migrations/0001_init.sql`), put ids into `wrangler.jsonc`.
2. `npx wrangler deploy` for `apps/api` with `routes: [{ "pattern": "raasta.safalmutha.in/api/*", "zone_name": "safalmutha.in" }, { "pattern": "raasta.safalmutha.in/r/*", "zone_name": "safalmutha.in" }]` in `wrangler.jsonc`. Secrets via `scripts/env-sync.mjs --deploy` only for keys present in `.env`.
3. Pages project `raasta` (Git integration later when the repo is ready; for now `npx wrangler pages deploy apps/web/dist --project-name raasta --branch main` for production, `--branch posterguys` for previews). `NODE_VERSION=20`.
4. Attach the custom domain **`raasta.safalmutha.in`** to the Pages project (Cloudflare API `POST /accounts/:id/pages/projects/raasta/domains` with wrangler's login token, or the dashboard: Pages > raasta > Custom domains > Set up). The `safalmutha.in` zone is already on Cloudflare, so the CNAME is created automatically. The domain is already paid for; nothing to buy.
5. Turnstile widget (free) for `raasta.safalmutha.in`: **owner action** if the API is not reachable, documented in `docs/DEPLOY.md` step by step.
6. WAF rate rule `/api/*` 20 req / 10 s per IP (free plan allows one rate-limiting rule; if the zone already uses it for the portfolio, rely on the Workers rate-limiting bindings instead): owner action, documented.
7. Everything above stays on free plans; never enable a paid add-on (Browser Rendering paid tier, Workers Paid, Argo, etc.).

---

## 15. Execution timeline (fits one 5-hour window)

| Time | Phase | Who | Output | Gate |
|---|---|---|---|---|
| 0:00 to 0:15 | P0 Setup | Orchestrator | Load skills (`safaldev`, `superpowers:subagent-driven-development`), repo + branch (§3), workspace scaffold, contracts (`types.ts`), `CLAUDE.md`, `docs/PRODUCT.md` | `npm i` ok, typecheck ok |
| 0:15 to 0:45 | P1 Data | Haiku A (ingest + states + geo), local Ollama (§5.2) in background | `packages/data` complete, data tests | data tests green |
| 0:15 to 0:45 | P1 Design | Haiku B | `docs/DESIGN.md`, Tailwind tokens, fonts, base components (Button, Card, Wave, Chip, Sheet, Field), `en.json` skeleton | Storybook-free visual check page `/__ui` (dev only) |
| 0:45 to 1:45 | P2 Engine + API | Sonnet 1 (rule engine + guardrails + legal aid + timers + redaction), then Sonnet 2 (Worker: endpoints, AI adapter, translate adapter, DIGIT adapter + mock, D1/KV, rate limits) | `packages/rules`, `apps/api` | unit + worker tests green |
| 0:45 to 2:15 | P2 Shell | Sonnet 3 | Landing page (rail 3/5 2/5), street-of-doors SVG, page-transition system, responsive layouts, language switcher, location flow | Playwright smoke at 3 widths |
| 2:15 to 3:15 | P3 Flows | Sonnet 4 (result page + Action centre + submission ladder + guide pages), Haiku C (guided flows from `disputes.json`, offices directory + map, state pages, legal-aid screener, emergency page) | All routes working against the real engine | e2e happy paths green |
| 2:15 to 3:15 | P3 Docs | Sonnet 5 | `packages/docs-gen` templates, PDF + print-HTML renderers, postal labels, mailto/Gmail/Outlook builders | snapshot tests, manual download check |
| 3:15 to 3:45 | P4 i18n + content | Haiku D (12 locale files from glossary), Haiku E (legal pages, about/data, FAQ, 404, SEO files, OG images, headers) | Translated UI, legal/SEO complete | i18n missing-key test 0 |
| 3:15 to 4:15 | P4 QA | Antigravity (Gemini 3.8 Flash) in parallel per §12 | `qa/agy/REPORT.md` | report delivered |
| 3:45 to 4:30 | P5 Fix + harden | Orchestrator triage; Haiku F (small fixes), Sonnet 6 only if a systemic fix is needed | Fixes, security pass (`security-review`), a11y pass (`design:accessibility-review`), perf | all tests green, axe clean, budgets met |
| 4:30 to 4:50 | P6 Deploy | Orchestrator | Worker + Pages preview live, D1/KV bound | live smoke test on preview URL |
| 4:50 to 5:00 | P7 Wrap | Haiku G | `README.md`, `docs/DEPLOY.md`, `docs/PITCH.md` (problem, demo script, sourced stats, architecture diagram), final commit + push `Posterguys` | secret scan clean |

If time runs short, cut in this order (last cut first kept): voice flag code, autofill bookmarklet (keep the Copy tray), Urdu/Odia locales, map (keep list directory), OG images per route (keep one).

---

## 16. Demo script (for judges, 3 minutes)
1. Landing in Marathi, location "Pune". Type: "My landlord in Kothrud has not returned my Rs 40,000 deposit for 2 months." -> doors animate, legal-aid door opens.
2. Route: first peaceful step is a 15-day notice (download PDF), then DLSA Pune / Tele-Law (free), then Small Causes Court; documents checklist; countdown; "not a police matter" note; legal-aid screener says "likely" for a student.
3. Pothole tile -> PMC ward auto-detected -> WhatsApp prefill + ward officer email with zone DMC cc + Swachhata.
4. DIGIT sandbox civic complaint -> submitted -> "See your complaint" opens the reference.
5. UPI fraud -> emergency screen -> 1930 + bank letter.
6. Feedback + "Add a system for my city".

---

## 17. Verification (definition of done)
- `npm run typecheck && npm test` green across workspaces; Worker tests green; Playwright green at 375/768/1280; axe zero serious.
- `scripts/check-links.mjs` report: no 404 in verified links, no `edaakhil`.
- Lighthouse on `https://raasta.safalmutha.in` (slow-4G mobile): Performance >= 90, Accessibility >= 95, Best Practices >= 95, SEO >= 95.
- Old-device check: with JavaScript disabled in Playwright, complete the deposit, pothole and UPI-fraud journeys end to end (question flow, result, PDF download, email link, postal label). Run once with a 360 x 640 viewport, CPU throttled 6x and slow-3G network. Every page within the §4.0 size budgets.
- Free check: the app works with only free keys (Gemini free tier or Workers AI, BHASHINI or Workers AI translation, ORS free key or OSRM); no paid service is configured anywhere.
- Manual: each of the 10 MVP disputes produces a correct route matching handbook §6.1; every Action centre button does what it says; PDFs open; postal labels print at correct size; Marathi + Urdu render with the right fonts and direction.
- safaldev pre-ship checklist reported group by group (pass / fixed / not applicable / owner action) in `docs/CHECKLIST.md`.
- "Get there" panel on an in-person step shows the map, a route with distance and time when a routing key is set, and working OSM / maps-app links when it is not.
- Owner actions listed clearly: fill `.env` (including the OSM routing key), Turnstile widget, WAF rule, custom domain, BHASHINI onboarding, DIGIT sandbox credentials, review translations by a native speaker.

---

## 18. Skills to load (only when the phase needs them)
`safaldev:safaldev` (always first), `superpowers:subagent-driven-development`, `superpowers:test-driven-development` (engine), `claude-api` (AI adapter), `framer-motion`, `animate`, `emil-design-eng`, `impeccable:impeccable` (design polish/audit), `web-interface-guidelines`, `vercel-react-best-practices` (React perf patterns apply without Vercel), `tailwind-design-system`, `design:accessibility-review`, `security-review`, `superpowers:verification-before-completion`, `run` (launch and screenshot the app). Cloudflare MCP tools via `ToolSearch`.

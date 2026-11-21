# Raasta: Program Structure and Architecture Analysis

Independent QA Architecture Review
Repository root: raasta/

## 1. Executive Summary

Raasta ("the way") is an open-source civic technology platform built for the Rotary x Rotaract "Naya Bharat 2047, Code for Bharat" hackathon under Problem 1.2 (Peacebuilding and Conflict Prevention). The platform addresses a widespread systemic issue across India: ordinary citizens facing everyday disputes (unreturned rental deposits, defective consumer goods, unpaid wages, cyber fraud, neighbour construction encroachment, municipal failures) frequently do not know which official authority has jurisdiction. As documented by legal needs research (DAKSH), the vast majority of citizens avoid police and formal courts due to fear, cost, and procedural opacity, leaving unresolved disputes to escalate into chronic community conflict.

Raasta provides a deterministic, zero-hallucination procedural routing engine coupled with an accessible web frontend and server-rendered dynamic action centre. It guides users to their immediate first peaceful step (often a free, structured notice or conciliation mechanism), identifies the appropriate grievance forum, produces complete legal draft packets and postal labels, checks legal-aid eligibility under NALSA Section 12, and tracks statutory limitation countdowns.

The application architecture enforces strict separation of concerns across a monorepo structure consisting of 2 applications and 5 shared packages.

## 2. Monorepo Organization and Architecture Decision

The repository is organized as an npm workspaces monorepo targeting Node.js >= 20, TypeScript 5.x, and the Cloudflare edge platform.

```
raasta/
├── apps/
│   ├── web/                 Static frontend (Vite, React 19, Tailwind CSS 4, prerendered)
│   └── api/                 Cloudflare Worker (Hono 4, JSON API and server-rendered JSX)
├── packages/
│   ├── config/              Shared brand configuration, locales, and legal disclaimers
│   ├── data/                Verified authoritative grievance registry, disputes, and offices
│   ├── rules/               Deterministic routing engine, guardrails, and cryptographic tokens
│   ├── docs-gen/            Document, PDF, print HTML, and postal label generators
│   └── i18n/                12 Indian language dictionaries and script metadata
├── docs/                    Contracts, design specifications, and orchestrator plans
├── scripts/                 Data ingestion and development environment synchronization
└── qa/                      Quality assurance test suites, reports, and audit logs
```

### Key Architectural Commitments
1. **Zero-JS Dynamic Parity:** All dynamic interactive flows (`/r/*`) are server-rendered using Hono JSX within the Cloudflare Worker (`apps/api`). Every user flow operates completely without client-side JavaScript. Client JavaScript on static pages (`apps/web`) acts strictly as a progressive enhancement.
2. **Prerendered Multi-locale Static Site:** The static site (`apps/web`) is prerendered at build time across 12 Indian languages (English, Hindi, Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam, Gujarati, Punjabi, Odia, Urdu), yielding 661 static HTML files in `apps/web/dist/`.
3. **Deterministic Routing (No LLM in the Loop for Rules):** Forum selection, procedural step generation, fee calculations, and deadline derivations are executed entirely by deterministic TypeScript decision tables in `packages/rules`. Language models are utilized solely as optional intake interpreters and strictly constrained chat assistants.
4. **Authoritative Registry Enforcement:** All URLs, phone helplines, physical addresses, filing fees, and SLA timelines must originate directly from verified data files in `packages/data`. No runtime component is permitted to synthesize or invent external links or government contacts.
5. **No Em Dash Policy:** Strict typographic rule enforced across all codebases, UI strings, documentation, and QA artifacts.

## 3. Package Structure and Responsibilities

### 3.1 @raasta/config (`packages/config`)
- **Role:** Central source of truth for global identity, branding, and deployment constants.
- **Key Exports:**
  - `APP_NAME`: Application title ("Raasta").
  - `SITE_URL`: Canonical public URL (`https://raasta.safalmutha.in`).
  - `LOCALES`: Array of 12 supported locale codes (`["en", "hi", "mr", "bn", "ta", "te", "kn", "ml", "gu", "pa", "or", "ur"]`).
  - `DISCLAIMER_EN`: Mandatory statutory disclaimer: *"Raasta gives procedural guidance based on public government rules. It is not legal advice."*
  - Feature flags: `ENABLE_VOICE`, `ENABLE_DIGIT_SANDBOX`.

### 3.2 @raasta/data (`packages/data`)
- **Role:** Authoritative, statically typed registry of Indian grievance redressal bodies, offices, and dispute definitions.
- **Key Modules and Files:**
  - `platforms.json`: Registry of 22 verified grievance redressal platforms (CPGRAMS, e-Jagriti, NCH INGRAM, NCRP Cybercrime, RBI CMS, SEBI SCORES, IRDAI Bima Bharosa, MahaRERA, Samadhan Labour, MahaKamgar, SHe-Box, EPFiGMS, Aaple Sarkar, MahaPolice Pune, PMC CARE, PCMC Grievance, Swachhata MoHUA, Major Metro Portals, Tele-Law Nyaya Bandhu, NALSA/MSLSA/DLSA, Small Causes Court Pune, and DIGIT/UPYOG PGR API).
  - `disputes.json`: 19 dispute definitions categorized into 8 domains, with guided questions, document checklists, template variables, and default platforms.
  - `offices.pune.json`: Hyperlocal directory of verified Pune offices (all 15 PMC ward offices, 5 zone DMC headquarters, District Consumer Disputes Redressal Commissions, Pune Police chowkis, DLSA Pune).
  - `legal-aid.json`: NALSA Section 12 categorical eligibility criteria and state-by-state income ceilings for 37 States and Union Territories.
  - `timers.json`: Statutory limitation periods and response deadlines (Consumer Protection Act 2-year limitation, RTI 30-day window, RERA timelines).
  - `states.json`: Directory of 36 States and UTs with their respective official grievance redressal portals and High Courts.
  - `schemas.ts`: Runtime Zod validation schemas ensuring data integrity against `types.ts` contracts.

### 3.3 @raasta/rules (`packages/rules`)
- **Role:** Pure TypeScript deterministic routing engine, statutory calculators, security guardrails, and cryptographic token management.
- **Key Modules and Files:**
  - `route.ts`: Core entrypoint `route(slots, geo)`. Resolves urban local body (PMC, PCMC, or other), matches the appropriate dispute table, checks guardrails, compiles required documents, and emits a structured `RouteResult`.
  - `tables/*.ts`: 19 individual dispute routing modules implementing specific statutory pathways:
    1. `banking_nbfc.ts`: Bank and NBFC grievances (Bank GRO -> 30-day timer -> RBI CMS / Banking Ombudsman).
    2. `builder_delay.ts`: Real estate possession delay (Promoter notice -> MahaRERA / State RERA conciliation).
    3. `civic_failure.ts`: Local municipal issues (Ward office / PMC CARE / DIGIT PGR API).
    4. `consumer_refund.ts`: Faulty goods and refund refusals (Company GRO -> NCH 1915 -> e-Jagriti Consumer Commission).
    5. `cyber_fraud.ts`: Financial cyber fraud (Immediate 1930 call -> NCRP filing -> Bank branch freeze).
    6. `cyber_harassment.ts`: Online harassment and blackmail (NCRP Cybercrime Women/Child portal -> Local police).
    7. `free_legal_aid.ts`: Access to justice routing (NALSA / DLSA / Tele-Law).
    8. `govt_service.ts`: Public service delivery grievances (State portal -> CPGRAMS central portal).
    9. `insurance_claim.ts`: Repudiated or delayed insurance claims (Insurer GRO -> Bima Bharosa -> Insurance Ombudsman).
    10. `investment_broker.ts`: Securities and mutual fund issues (Intermediary -> SEBI SCORES 2.0).
    11. `lost_mobile.ts`: Device loss and theft (Police lost report -> CEIR portal blocking).
    12. `mrp_overcharge.ts`: Legal metrology violations (Shop notice -> Consumer Commission / Legal Metrology).
    13. `neighbour_construction.ts`: Encroachment, noise, structural damage (Peaceful neighbor notice -> PMC Building Permission / Civil court).
    14. `other.ts`: General fallback routing (DLSA / Tele-Law / Aaple Sarkar / CPGRAMS).
    15. `pension_pf.ts`: EPFO and pension delays (EPFiGMS -> CPGRAMS).
    16. `police_complaint.ts`: Non-cognizable offenses and police reports (Police station chowki -> SP/CP -> Magistrate Section 156(3)).
    17. `security_deposit.ts`: Rental deposit withholding (15-day formal notice -> Small Causes Court / DLSA, never police unless criminal fraud/cheating).
    18. `unpaid_wages.ts`: Salary and wage withholding (Demand notice -> Samadhan ALC / MahaKamgar / Payment of Wages authority).
    19. `workplace_harassment.ts`: POSH Act violations (Internal Committee -> Local Complaints Committee / SHe-Box).
  - `guardrails.ts`: 12 invariant safety checks (blocking invalid police referrals for tenancy, preventing CPGRAMS submissions for RTI or sub-judice matters, enforcing 30-day prior wait on RBI CMS, prioritizing 1930 for cyber emergencies, banning edaakhil references).
  - `token.ts`: Web Crypto HMAC-SHA256 signer and verifier (`signToken`, `verifyToken`) allowing stateless, tamper-proof state passing between server-rendered pages and API endpoints.
  - `legalAid.ts`: Evaluates NALSA Section 12 criteria (women, children, SC/ST, industrial workmen, disability, custody, trafficking, disaster victims) and state-specific annual income thresholds.
  - `redact.ts`: High-speed regex engine for redacting Indian personal data (Aadhaar numbers, PAN cards, 10-digit mobile numbers, emails).
  - `timers.ts`: Computes live countdowns based on incident dates and statutory rules.
  - `registry.ts`: Safe accessor ensuring fees, SLAs, URLs, phones, and emails match registry data exactly.

### 3.4 @raasta/docs-gen (`packages/docs-gen`)
- **Role:** Server-side generator for legal notices, formal applications, filling packets, and postal mailing labels.
- **Key Modules and Files:**
  - `registry.ts` & `model.ts`: Registry of 14 document templates (`deposit_notice`, `gro_letter`, `ejagriti_draft`, `bank_fraud_intimation`, `demand_notice_wages`, `shebox_narrative`, `pmc_ward_letter`, `maharera_conciliation`, `neighbour_letter`, `police_complaint`, `rbi_lender_precomplaint`, `legal_aid_application`, `nch_text`, `grievance_text`).
  - `render/pdf.ts`: Low-overhead PDF document compiler utilizing `pdf-lib` and `@pdf-lib/fontkit`. Embeds formal headers, party blocks, legal grounds, prayer for relief, and verification clauses.
  - `render/printHtml.ts`: Clean, accessible print-optimized HTML templates formatted for standard A4 output.
  - `render/labels.ts`: Printable postal sender and recipient address labels and DL envelope layouts for physical speed-post filing.
  - `email.ts`: URL length-aware draft link builder for `mailto:`, Gmail web compose, Outlook web compose, and WhatsApp prefill.

### 3.5 @raasta/i18n (`packages/i18n`)
- **Role:** Internationalization subsystem supporting 12 official languages across India.
- **Key Modules and Files:**
  - `locales/*.json`: Flat dotted key translation dictionaries for `en`, `hi`, `mr`, `bn`, `ta`, `te`, `kn`, `ml`, `gu`, `pa`, `or`, and `ur`.
  - `index.ts`: Lookup helper `t(lang, key, vars)` with graceful fallback to English and variable interpolation (`{varName}`).
  - `LANG_META`: Script properties including native script names, text direction (RTL for Urdu), Google Font family pairings (e.g. Baloo 2, Baloo Da 2, Noto Nastaliq Urdu), and BCP 47 language tags.

## 4. Application Architecture and Endpoints

### 4.1 apps/api (Cloudflare Worker backend)
The Worker is implemented with Hono 4, targeting the Cloudflare edge runtime via `wrangler`. It encapsulates both a JSON REST API (`/api/*`) and a server-rendered dynamic web tier (`/r/*`).

#### Middleware Pipeline
1. `securityHeaders`: Injects strict Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy (COOP), Cross-Origin-Resource-Policy (CORP), and X-Frame-Options: DENY. Sets Cache-Control: no-store on API responses.
2. `rateLimit`: IP-based rate limiting via Cloudflare Workers KV/RateLimiter bindings covering chat, intake, feedback, and translation endpoints.
3. `langMiddleware`: Extracts language preference from `?lang=` query parameter, falling back to `raasta_lang` cookie or English. Sets the cookie when query parameter is provided.
4. `postGuard`: Enforces Origin and Referer validation against an approved origin list or worker origin. Enforces request body size limits: 4 KB for standard forms, 16 KB for chat messages.

#### Dynamic Page Routes (`/r/*`)
- `/r/ask`: GET intake entry form; POST user description returning follow-up questions or redirecting to route.
- `/r/flow/:dispute/:step`: Multi-step guided questionnaire with zero client-side JavaScript.
- `/r/route/:token`: Verification of signed route token, rendering the full Action Centre (first peaceful step, primary authority, document checklist, statutory timers, legal aid assessment, nearby offices, download links).
- `/r/guide/:platformId`: In-depth procedural walkthrough for registering and tracking a grievance on a specific government portal.
- `/r/doc/:template`: Form for generating tailored legal notices and claims; POST produces PDF download or printable HTML.
- `/r/label`: Postal label and DL envelope generator for registered speed-post filings.
- `/r/offices`: Hyperlocal Pune ward and legal office directory with directions.
- `/r/directions`: Turn-by-turn routing to nearest authority using OpenStreetMap / OSRM.
- `/r/legal-aid`: Interactive NALSA Section 12 eligibility and state income screener.
- `/r/feedback` & `/r/system-request`: Community feedback and new grievance platform submission forms.
- `/r/chat`: Accessible, no-JS single-turn chat fallback interface.

#### REST API Routes (`/api/*`)
- `GET /api/health`: Health status endpoint.
- `POST /api/intake`: Natural language problem description -> slot extraction and missing field detection.
- `POST /api/route`: Deterministic route calculation -> `RouteResult` and signed HMAC token.
- `POST /api/chat`: Server-Sent Events (SSE) AI assistant grounded exclusively in the current RouteResult and registry URLs, passing through `StreamUrlFilter` and PII redaction.
- `POST /api/translate`: On-the-fly text translation with Bhashini ULCA API integration and local fallback.
- `GET /api/offices` & `GET /api/directions`: Geolocation and routing services using OpenStreetMap.
- `POST /api/feedback` & `POST /api/system-request`: Turnstile-validated feedback storage into Cloudflare D1.
- `POST /api/submit/:platformId`: Direct API grievance submission (DIGIT / UPYOG PGR sandbox).

### 4.2 apps/web (Prerendered React Static Site)
Built with React 19, Vite 8, React Router 7, and Tailwind CSS 4. Prerendered at build time via `apps/web/scripts/prerender.mjs`.

#### Static Routes (Prerendered across 12 languages)
- `/`: Home landing hero, category grid, street-of-doors visual anchor, and problem intake form.
- `/help`: Categorized overview of all 19 dispute types.
- `/help/:category`: Focused view of disputes within a specific category.
- `/emergency`: Critical helpline directory (112, 1930 Cybercrime, 1098 Childline, 181 Women, 15100 NALSA).
- `/offices`: Interactive Pune directory and office map.
- `/state/:code`: State-specific grievance directories covering all 36 States and UTs.
- `/legal-aid`: Free legal aid handbook, Section 12 guide, and income limits table.
- `/feedback`: User feedback submission page.
- `/about`: Project background, Rotary x Rotaract Hackathon information, and team attribution.
- `/about/data`: Data provenance, sources, and registry verification methodology.
- `/privacy`, `/terms`, `/disclaimer`: Statutory legal and privacy terms.
- `404.html`: Multi-lingual not found handler.

#### Static Security and CDN Configuration (`apps/web/public/_headers`)
Contains Cloudflare Pages response header definitions matching the Worker's CSP, HSTS, frame protection, and security posture.

## 5. Security and Data Protection Architecture

1. **Origin Verification (postGuard):** All mutating POST requests require an Origin or Referer header matching configured allowed origins (`ALLOWED_ORIGINS` or self origin). Unmatched origins receive immediate HTTP 403 Forbidden.
2. **Payload Size Restrictions:** Rigid size limiting implemented via `readLimited`:
   - Standard forms and intake: Maximum 4,096 bytes (4 KB).
   - Chat payloads: Maximum 16,384 bytes (16 KB).
   - Requests exceeding declared `content-length` or streaming bytes beyond the ceiling are terminated with HTTP 413.
3. **Stateless HMAC-SHA256 Route Tokens:** Route results and guided flow states are signed with `TOKEN_SECRET` using Web Crypto HMAC-SHA256. The payload contains slots, geo data, timestamp, and signature. Tampered, malformed, or expired tokens are rejected with HTTP 400.
4. **PII Redaction Pipeline (`redact.ts`):** Indian citizen identifiers (Aadhaar numbers, PAN cards, mobile numbers, email addresses) are automatically redacted using regular expressions before data is forwarded to AI completion engines or persisted in database tables.
5. **URL Allowlist Guardrail (`StreamUrlFilter`):** In AI chat interactions, model responses are streamed through a character-level URL parser that permits only URLs present in the verified `platforms.json` registry. Any synthesized or untrusted link is stripped from the stream before reaching the user.
6. **E-Daakhil Prohibition:** Strict architectural prohibition against linking or referring to `edaakhil.nic.in` (deprecated portal). The system exclusively routes consumer disputes to `e-jagriti.gov.in`.
7. **Cloudflare Turnstile Integration:** Public forms protect against automated abuse via Turnstile verification before D1 database insertion.
8. **HTTP Security Headers:**
   - Content-Security-Policy: `default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://tile.openstreetmap.org; connect-src 'self'; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'`.
   - Strict-Transport-Security: `max-age=63072000; includeSubDomains; preload`.
   - X-Content-Type-Options: `nosniff`.
   - X-Frame-Options: `DENY`.

## 6. QA Coverage and Invariant Contracts

The independent QA suite (`qa/agy/tests/`) is structured to rigorously validate the system against the following core invariants:

| Test Domain | Target Specification | Validation Mechanism |
|---|---|---|
| Routing Correctness | 19 dispute types in `packages/rules` vs `packages/data/src/platforms.json` | Every dispute route must produce valid, registered platforms; fee and SLA strings must match the registry; zero invented URLs. |
| Statutory Guardrails | 12 guardrails in `packages/rules/src/guardrails.ts` | Deposit never routed to police without cheating flag; CPGRAMS blocked for RTI/sub-judice/family; RBI CMS blocked before 30 days; emergency priority for cyber fraud; zero edaakhil references. |
| i18n Completeness | 12 locale files in `packages/i18n/locales/*.json` | Full key parity across all non-English locales against `en.json`; validation of variable interpolation tokens. |
| Responsive Layout | Built static pages in `apps/web/dist` | Validation of viewport widths (320, 375, 414, 768, 1024, 1280, 1536, 1920 px) against horizontal overflow, grid constraints, and mobile usability. |
| Accessibility (a11y) | Prerendered HTML and Worker JSX views | Exactly one h1 per page, accessible form control labels, image alt attributes, valid landmark regions (main, nav, header, footer), WCAG compliance. |
| Security Headers | Worker `/r/*` and `/api/*` responses, and `apps/web/public/_headers` | CSP headers, HSTS, X-Content-Type-Options, frame-ancestors, referrer policies across all entrypoints. |
| API Abuse & Hardening | Cloudflare Worker endpoints in `apps/api` | Oversized payloads (>4KB forms, >16KB chat), missing or spoofed Origin headers, HTML/script injection resistance, chat prompt injection filtering, token tampering. |

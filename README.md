# Chakravyuh — BloodLink: Hyper-Local Verified Blood Matching Engine
**Rotary × Rotaract Youth Festival Hackathon 2026**  
**Team Name:** Chakravyuh  
**Problem Statement 2.2:** "Urgent: B+ve Needed" (Healthy Bharat | Disease Prevention & Treatment)

A zero-login, privacy-first B2B2C coordination logistics platform connecting **accredited Pune hospitals and licensed blood centres** with **eligible nearby voluntary donors** through capped, distance-ranked, auto-expiring PostGIS notification waves.

---

## 1. The Problem We Solve

* **The Forward-Spam Trap:** Every week across Pune college campuses and residential WhatsApp groups, urgent blood appeals get forwarded hundreds of times—often hours or days after the patient's need has already been fulfilled—causing mass alert fatigue, misplaced panic, and wasted trips.
* **The National Paradox:** While India collects approximately 1.46 crore blood units annually (meeting gross statistical demand on paper), **~30% still relies on high-friction replacement donors**, and voluntary donations plummet by **up to 50% during summer college vacations and festive periods**—causing acute hyper-local stockouts when critical patients need specific blood groups.
* **Privacy & Clinical Risk:** Legacy donor lists publish personal phone numbers openly on the internet (leading to midnight telemarketing and harassment), while failing to programmatically screen for recent donation intervals.

---

## 2. How BloodLink Works: Capped, Verified, Auto-Expiring PostGIS Waves

Instead of a static public phone directory, BloodLink operates as a lightweight, privacy-first logistics intermediary:

```text
[Patient Family / Desk] ──(1. Submit /request + Requisition Slip)──> [Supabase DB + PostGIS]
                                                                            │
                                                                            ▼ (Magic Link)
[Hospital Duty Doctor]  <──(2. One-Tap /verify/[token] Sign-Off)────────────┘
        │
        └──(3. Approves Wave 1)──> [Atomic RPC: dispatch_donor_wave()]
                                          │
                                          ├─> PostGIS ST_DWithin (3km -> 7km -> 15km)
                                          ├─> Filters: Exact Blood Match + NBTC Cooldown Expired
                                          ├─> Capped strictly at 10–15 Donors
                                          │
                                          ▼ (Capability Token WhatsApp Alert)
[10–15 Nearby Donors]   <──(4. Private /donor/[token] Link)──────────────────┘
        │
        ├──(Accept)───> Locks Unit Slot -> 45-Min Arrival Window -> Updates /track/[id]
        │               *CRITICAL AUTO-EXPIRATION: When units filled, request status flips
        │               to FULFILLED and locks all forwarded links with "Need Met" banner.
        │
        └──(Snooze)───> Auto-pulls next closest donor from PostGIS queue.
```

### Core Innovations & Capabilities

1. **Zero-Integration Hospital Verification (`/verify/[token]`):**
   * Requesters submit a hospital requisition slip on `/request`. Zero donors are alerted prior to clinical sign-off.
   * Duty doctors or blood bank technicians receive a single-use capability token link via WhatsApp—requiring **zero hospital ERP integration, zero passwords, and zero OTP friction**—and trigger Wave 1 with a single tap.
   * Hospital staff can explicitly authorize universal `O-` substitution if the exact group is critically unavailable.

2. **Hyper-Local PostGIS + NBTC Cooldown Enforcement:**
   * Queries exact blood group matches within **3 km** using PostGIS `ST_DWithin` and distance ranking. Auto-expands to **7 km** then **15 km** only if fewer than 3 donors match.
   * Programmatically enforces National Blood Transfusion Council (NBTC) health intervals: **90 days for males** and **120 days for females** for whole blood, and **14 days for platelet apheresis**.

3. **Zero Phone Exposure & Instant Auto-Expiration (`/donor/[token]`):**
   * Donors receive private, tokenized links—**phone numbers are never exposed publicly or listed in web scrapers**.
   * The instant a donor taps **Accept** and the required units are covered, BloodLink **instantly auto-expires** the request, rendering a prominent **"Need Met — This request was fulfilled at [Timestamp]. Please do not forward this message further"** banner on all distributed links.
   * If an accepted donor fails to arrive within **45 minutes**, the slot automatically re-opens and an automated PostGIS backfill wave is dispatched to the next closest donor.

4. **College & Community Registry + Lean-Month Nudges (`/join` & `/demo-tools`):**
   * Supports student hubs across Pune (e.g., Fergusson College, COEP, SPPU, VIT Pune, Sinhagad Road, Kothrud).
   * Scheduled engine identifies donors whose 90/120-day cooldown has ended during summer exams (Mar–May) and festive seasons (Aug–Nov) to gently replenish regional stocks.

---

## 3. Tech Stack & Zero-Cost Architecture

| Layer | Component | Architecture Highlights |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS | Responsive widescreen 12-col desktop layout + mobile utility shell; client-side Canvas WebP slip compressor (`< 400 KB`); zero external UI bloat. |
| **Edge Network** | Vercel Edge CDN (`bom1` Mumbai) | 15-second edge-cached polling on `/track/[request_id]` with `s-maxage=10, stale-while-revalidate=5` to absorb viral WhatsApp traffic spikes without exhausting database connections. |
| **Backend & DB** | Supabase (PostgreSQL 15 + PostGIS) | PostGIS spatial indexing (`GIST`), Row-Level Security (zero public `anon` reads), atomic `FOR UPDATE` concurrency locking, and audit logging. |
| **RPC Engine** | PostgreSQL PL/pgSQL | Atomic server-side execution: `dispatch_donor_wave()`, `respond_to_wave()`, `complete_donation_and_cooldown()`, `get_lean_month_eligible_donors()`. |
| **Messaging** | WhatsApp Business Cloud API / Make.com | Secure webhook orchestration and tokenized direct communication. |

---

## 4. Built-In Clinical & Legal Guardrails

* **Intermediary Status:** BloodLink operates strictly as a digital coordination platform under Indian Information Technology intermediary guidelines. We do not collect, test, process, store, or transport physical blood.
* **Non-Remunerated Voluntary Framework:** Zero payments, zero financial incentives, zero monetization of donor data (strict DPDP Act compliance with one-tap data deletion rights).
* **Clinical Boundary:** Donor checklist is strictly framed as *"Self-Check Before You Travel"*. Final medical fitness, hemoglobin screening, and cross-matching are determined solely by the registered medical officer upon arrival at the hospital blood bank.

---

## 5. Live Application Route Directory

| Route | Role / Persona | Key Functionality |
| :--- | :--- | :--- |
| **`/request`** | Patient Family / Hospital Desk | Public intake form, WebP requisition slip compressor, blood group & urgency selectors. |
| **`/verify/[verify_token]`** | Hospital Duty Doctor | Single-tap clinician verification, high-res slip viewer, universal O- fallback authorization, PostGIS live matching transparency metrics. |
| **`/track/[request_id]`** | Patient Family & Hospital Staff | Live status board, 15-second polling, active wave counter, donor arrival countdown timers, e-RaktKosh parallel lookup link, auto-fulfilled banner. |
| **`/join`** | Voluntary Donors | 30-second onboarding, Campus & Community registry (Fergusson, COEP, SPPU, etc.), biological sex cooldown setting (90d M / 120d F), DPDP consent. |
| **`/donor/[donor_token]`** | Registered Donors | Dual-state portal: active wave alert with verified hospital seal, distance, self-check checklist, Accept/Snooze buttons + idle profile controls (Available/Paused toggle, NBTC cooldown countdown, Delete My Data). |
| **`/demo-tools`** | Hackathon Evaluators / Admins | Live interactive simulator for seasonal lean-month reminders (`get_lean_month_eligible_donors()`) and 1-click 45-minute no-show PostGIS backfill. |
| **`/privacy`** | Public | DPDP Act 2023 compliance notice, zero commercialization pledge, 7-day slip purge policy. |

---

## 6. Repository Structure

```text
d:\shlok\hacathon\
├── README.md                                 # Complete project specification & submission guide
├── pune_blood_matching_platform_prd.md        # Detailed Product Requirements Document (PRD)
└── bloodlink/
    ├── README.md
    ├── .env.example
    ├── supabase/
    │   ├── migrations/
    │   │   ├── 001_extensions_and_schema.sql
    │   │   ├── 002_seed_hospitals.sql
    │   │   ├── 003_rpc_functions.sql
    │   │   ├── 004_rls_policies.sql
    │   │   ├── 005_nbtc_dpdp_guardrails.sql
    │   │   └── 006_ps2_2_rpc_and_pune_seed.sql
    │   └── functions/
    │       ├── request/index.ts
    │       ├── verify/index.ts
    │       ├── track/index.ts
    │       ├── join/index.ts
    │       └── donor/index.ts
    └── frontend/
        ├── package.json
        ├── tailwind.config.js
        └── src/
            ├── app/
            │   ├── layout.tsx
            │   ├── page.tsx
            │   ├── request/page.tsx
            │   ├── join/page.tsx
            │   ├── verify/[verify_token]/page.tsx
            │   ├── track/[request_id]/page.tsx
            │   ├── donor/[donor_token]/page.tsx
            │   ├── demo-tools/page.tsx
            │   ├── privacy/page.tsx
            │   └── not-found.tsx
            ├── components/
            │   ├── AppHeader.tsx
            │   ├── BloodGroupGrid.tsx
            │   ├── CountdownTimer.tsx
            │   ├── SlipUploader.tsx
            │   └── UrgencyBadge.tsx
            └── lib/
                ├── api.ts
                ├── store.ts
                └── supabase.ts
```

---

## 7. Local Quickstart

```bash
# 1. Navigate to frontend
cd bloodlink/frontend

# 2. Install dependencies & run dev server
npm install
npm run dev

# 3. Access local app
# Open http://localhost:3000
```

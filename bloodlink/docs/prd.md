# Product Requirements Document (PRD): Hyper-Local Verified Blood Matching Platform (Pune v1)

**Document Version:** 1.0 (Production Build Spec)  
**Target Region:** Pune, Maharashtra (Initial rollout focus: Sinhagad Road, Dattawadi, Sadashiv Peth, Deccan, and surrounding hospital clusters)  
**Build Execution Order:** Phase 1 — Backend (Supabase + PostGIS + Edge/RPC + Make.com Webhooks) $\rightarrow$ Phase 2 — Frontend (Next.js / React + Tailwind in Antigravity IDE $\rightarrow$ Vercel)  
**Operating Model:** B2B2C Voluntary Coordination Intermediary (Zero-cost v1 deployment, zero authentication/OTP friction, strict NBTC & DPDP compliance)

---

## 1. Executive Summary & Core Product Guardrails

### 1.1 Product Vision
A lightweight, high-speed B2B2C coordination platform connecting **verified Pune hospitals and licensed blood centres** with **nearby, eligible voluntary blood donors** through capped, distance-ranked notification waves. Unlike static public donor directories that expose phone numbers and cause midnight spam, this platform acts as a privacy-first logistics engine that verifies every request clinically before alerting a targeted wave of 10–15 nearby donors.

### 1.2 Non-Negotiable Legal, Clinical & Operational Boundaries
To operate safely under Indian healthcare regulations (Drugs and Cosmetics Act, National Blood Transfusion Council [NBTC] guidelines, and the Digital Personal Data Protection [DPDP] Act) without requiring a blood bank license:

| Strictly Prohibited (Excluded from Design) | Mandated Core Functions (Included in Design) |
| :--- | :--- |
| Collecting, storing, or transporting physical blood (no D2C home blood delivery). | Connect verified hospitals and licensed blood centres with willing voluntary donors. |
| Operating a blood collection centre without a license. | Provide hyper-local PostGIS radius-based wave notifications. |
| Paying citizens for donations or offering monetary incentives. | Facilitate zero-exposure communication via tokenized links. |
| Selling, renting, or publicly listing donor phone numbers. | Track real-time donor wave responses (`PINGED`, `ACCEPTED`, `SNOOZED`, `NO_SHOW`, `COMPLETED`). |
| Allowing anonymous/unverified users to trigger donor alerts. | Maintain live requisition status (`PENDING_VERIFICATION` $\rightarrow$ `VERIFIED_ACTIVE` $\rightarrow$ `FULFILLED`). |
| Automatically declaring a donor medically fit to donate. | Enforce automated NBTC cooldown intervals (90 days male / 120 days female for whole blood) + on-site medical officer disclaimer. |
| Making automated clinical transfusion compatibility substitutions. | Enforce **exact blood-group matching** unless hospital staff explicitly authorize universal `O-` fallback. |
| Promising blood availability, fulfillment time, or patient survival. | Surface **e-RaktKosh** parallel lookup prompts during critical/rare stockouts. |
| Exposing patient medical records publicly or using fear/guilt-tripping copy. | Maintain DPDP consent timestamps, audit logs, and one-tap data deletion/pause controls. |

---

## 2. System Architecture & Zero-Cost Tech Stack

### 2.1 Technology Stack
* **Development Environment:** **Antigravity IDE**
* **Frontend Hosting & Edge Network:** **Vercel** (Free Tier — global CDN edge caching, automatic HTTPS, serverless SSR/ISR)
* **Backend & Database:** **Supabase** (Free Tier — PostgreSQL 15+ with **PostGIS** geospatial extension, Row-Level Security [RLS], Database Webhooks, RPC Functions, and Supabase Storage)
* **Workflow Automation & Messaging Orchestrator:** **Make.com** (Free Tier — webhook ingestion and WhatsApp Cloud API / SMS trigger orchestration)
* **Messaging Channel:** WhatsApp Business Cloud API (with direct click-to-chat WhatsApp fallback queue to prevent API credit failure)
* **Authentication Strategy (v1):** **Zero Login / Zero Password / Zero OTP.** Security and anti-spam are enforced via unguessable **UUID v4 capability tokens** embedded in private WhatsApp URLs, mandatory requisition slip image uploads, and clinician single-tap verification.

### 2.2 High-Level Architecture Flow
```text
[Patient Family / Desk] ──(1. Submit /request + Slip Image)──> [Supabase DB + Storage]
                                                                      │ (DB Webhook: INSERT)
                                                                      ▼
[Hospital Duty Doctor]  <──(2. WhatsApp Magic Link /verify)── [Make.com Orchestrator]
        │
        └──(3. One-Tap Approve)──> [Supabase RPC: verify_and_dispatch_wave()]
                                          │
                                          ├─> PostGIS ST_DWithin (3km -> 7km -> 15km)
                                          ├─> Filter: Exact Blood Group + Available + Cooldown Expired
                                          ├─> Cap Wave strictly at 10–15 Donors
                                          │
                                          ▼ (DB Webhook: dispatch_waves INSERT)
[10–15 Nearby Donors]   <──(4. Tokenized Alert /donor/[token])── [Make.com -> WhatsApp]
        │
        ├──(Accept)───> Locks Unit Slot -> Starts 45-Min Arrival Timer -> Updates /track/[id]
        └──(Snooze)───> Marks SKIPPED -> Auto-pulls Next Ranked Donor from PostGIS Queue
```

---

## 3. Complete Page & Route Map (7 Functional Routes — Zero Marketing Bloat)

There is **no landing or marketing page**. Users enter directly into functional utility screens:

| Route | Access Control | Primary User | Core Functionality & UI Components |
| :--- | :--- | :--- | :--- |
| **`/request`** | Public (Rate-limited) | Patient Family or Hospital Desk | Urgent blood intake form: Patient reference initials/ID, Blood Group (`A+` to `O-`), Component (`Whole Blood`, `Single Donor Platelets [SDP]`, `Packed Red Cells`), Units (`1–6`), Urgency (`CRITICAL`, `URGENT`, `SCHEDULED`), Verified Pune Hospital selector (auto-fills PostGIS coordinates), Requisition Slip photo upload (compressed client-side to $< 400\text{ KB}$), Requester phone, and Duty Doctor / Blood Bank official phone. |
| **`/verify/[verify_token]`** | Capability Token (Single-use) | Hospital Duty Doctor / Blood Bank Staff | Displays full requisition details + high-res view of the uploaded requisition slip. Includes optional checkbox: *"Blood bank authorizes O-negative universal substitute if exact group unavailable."* Buttons: **Approve & Dispatch Wave 1** (triggers PostGIS wave) or **Reject Request**. Once active, displays **Mark Fulfilled** button to close the ticket and lock donor cooldowns. |
| **`/track/[request_id]`** | Unlisted UUID Link | Patient Family & Hospital Staff | Live status board (polls/subscribes cleanly without heavy sockets): Verification badge (`Pending Hospital Sign-Off` vs. `Verified Active`), Active Wave counter (e.g., *"Wave 1: 12 donors alerted within 3 km"*), Accepted Donor count & arrival countdown, Hospital blood bank desk contact, and **e-RaktKosh** parallel stock-check link. |
| **`/join`** | Public (Rate-limited) | New Voluntary Donors | 30-second onboarding form: Full Name, WhatsApp Phone, Biological Sex (sets automated NBTC cooldown: **90 days Male / 120 days Female**), Blood Group, Pune Locality selector + optional browser GPS pin drop, Last Donation Date (optional), and explicit DPDP consent checkbox. |
| **`/donor/[donor_token]`** | Capability Token (Private per donor) | Registered Donors | **Dual-State View:**<br>1. **Active Alert State** (when pinged): Verified Hospital Seal, Hospital Name + Google Maps link, exact distance ($2.3\text{ km}$ away), Blood Group & Component needed, calm factual urgency tag, **Self-Check Before You Travel** checklist (eaten in last 4 hrs, feeling well, 90/120+ days gap), and one-tap **Accept & Commit** or **Snooze / Pass** buttons.<br>2. **Idle / Profile State**: One-tap **Available / Paused** toggle, live countdown timer if on NBTC cooldown, and **Delete My Data** button. |
| **`/privacy`** | Public | All Users | DPDP Act compliance notice: explicit data purpose limitation, zero data resale pledge, intermediary liability disclaimer, audit log retention policy, and data deletion instructions. |
| **`/*` (`/404`)** | Public | Any invalid URL | Instant recovery page with two large action buttons: **Need Blood Urgently (`/request`)** and **Register as Voluntary Donor (`/join`)**. |

---

## 4. Phase 1: Backend Specification (Build This First in Supabase)

### 4.1 Complete PostgreSQL + PostGIS Schema
Execute this SQL in Supabase SQL Editor to establish all tables, constraints, geospatial indexes, and automated NBTC cooldown rules:

```sql
-- Enable PostGIS for hyper-local Pune distance queries
create extension if not exists postgis;

-- 1. Pre-Verified Pune Hospitals & Licensed Blood Centres Whitelist
create table verified_hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area_label text not null, -- e.g., 'Sinhagad Road', 'Deccan Gymkhana', 'Sadashiv Peth'
  official_bloodbank_phone text not null,
  location geography(Point, 4326) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_hospitals_geo on verified_hospitals using gist (location);

-- 2. Voluntary Donors Table
create table donors (
  id uuid primary key default gen_random_uuid(),
  donor_token uuid unique not null default gen_random_uuid(),
  full_name text not null,
  whatsapp_phone text unique not null,
  biological_sex text not null check (biological_sex in ('MALE', 'FEMALE')),
  blood_group text not null check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  location geography(Point, 4326) not null,
  locality_label text not null,
  is_available boolean not null default true,
  last_donation_date date,
  cooldown_until timestamptz not null default now(),
  no_show_count int not null default 0,
  dpdp_consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_donors_geo on donors using gist (location);
create index idx_donors_eligibility on donors (blood_group, is_available, cooldown_until);

-- 3. Blood Requisitions Table
create table requisitions (
  id uuid primary key default gen_random_uuid(),
  verify_token uuid unique not null default gen_random_uuid(),
  patient_reference text not null, -- Initials or Hospital IPD/UHID only (no full medical records)
  blood_group text not null check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  component text not null default 'WHOLE_BLOOD'
    check (component in ('WHOLE_BLOOD', 'SDP_PLATELETS', 'PRBC')),
  units_needed int not null check (units_needed between 1 and 6),
  units_accepted int not null default 0,
  urgency text not null check (urgency in ('CRITICAL', 'URGENT', 'SCHEDULED')),
  allow_o_neg_substitute boolean not null default false, -- Set ONLY by verifying clinician
  hospital_id uuid references verified_hospitals(id),
  hospital_name text not null,
  hospital_location geography(Point, 4326) not null,
  verifier_phone text not null,
  requester_phone text not null,
  slip_image_path text not null,
  current_wave int not null default 0,
  current_radius_meters int not null default 3000,
  status text not null default 'PENDING_VERIFICATION'
    check (status in ('PENDING_VERIFICATION','VERIFIED_ACTIVE','FULFILLED','EXPIRED','REJECTED')),
  verified_at timestamptz,
  expires_at timestamptz not null default (now() + interval '12 hours'),
  created_at timestamptz not null default now()
);

create index idx_req_status on requisitions (status, expires_at);

-- 4. Capped Dispatch Waves (10–15 Donors per Wave)
create table dispatch_waves (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references requisitions(id) on delete cascade,
  donor_id uuid not null references donors(id) on delete cascade,
  wave_number int not null default 1,
  distance_km numeric(5,2) not null,
  response_status text not null default 'PINGED'
    check (response_status in ('PINGED','ACCEPTED','SNOOZED','NO_SHOW','COMPLETED')),
  pinged_at timestamptz not null default now(),
  responded_at timestamptz,
  arrival_deadline timestamptz,
  unique (requisition_id, donor_id)
);

create index idx_waves_req on dispatch_waves (requisition_id, response_status);
create index idx_waves_donor on dispatch_waves (donor_id, response_status);

-- 5. DPDP & Clinical Verification Audit Trail
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
```

### 4.2 Core Database RPC Functions (Atomic Concurrency & NBTC Guardrails)
Instead of running fragile filtering logic on the frontend, put the matching, locking, and cooldown engine inside **PostgreSQL RPC functions** so high concurrency never causes race conditions or double-booking:

1. **`dispatch_donor_wave(p_requisition_id uuid, p_wave_cap int default 12)`**:
   * Verifies `status = 'VERIFIED_ACTIVE'` and `units_accepted < units_needed`.
   * Queries `donors` matching **exact `blood_group`** (or `IN (req.blood_group, 'O-')` **only if** `req.allow_o_neg_substitute = true`), `is_available = true`, `cooldown_until <= now()`, and `id NOT IN (select donor_id from dispatch_waves where requisition_id = p_requisition_id)`.
   * Filters by `ST_DWithin(donors.location, req.hospital_location, req.current_radius_meters)` and orders by `ST_Distance(...) ASC`.
   * Inserts up to `p_wave_cap` (10–15) rows into `dispatch_waves` and returns the newly pinged donor tokens and phone numbers to Make.com.
2. **`respond_to_wave(p_donor_token uuid, p_wave_id uuid, p_action text)`**:
   * Uses `SELECT ... FOR UPDATE` row-level locking on `requisitions` so if 12 donors tap **Accept** at the exact same second for a 1-unit request, **only the first request wins** and increments `units_accepted`, setting `arrival_deadline = now() + interval '45 minutes'`. Subsequent simultaneous taps receive a polite *"Slot already filled by another nearby donor — thank you!"* message.
   * If `p_action = 'SNOOZED'`, marks the row `SNOOZED` and immediately triggers a 1-donor backfill call to `dispatch_donor_wave(req_id, 1)`.
3. **`complete_donation_and_cooldown(p_verify_token uuid, p_donor_id uuid)`**:
   * Called when hospital staff tap **Mark Fulfilled** on `/verify/[token]`.
   * Automatically calculates NBTC-compliant deferral:
     * If `component = 'SDP_PLATELETS'`: sets `cooldown_until = now() + interval '14 days'`.
     * If `component IN ('WHOLE_BLOOD', 'PRBC')`: sets `cooldown_until = now() + interval '90 days'` for `MALE` and `now() + interval '120 days'` for `FEMALE`.
   * Logs completion in `audit_logs` without storing sensitive clinical test results.

### 4.3 Row-Level Security (RLS) Policies
* **Strict Zero-Public-Read on `donors` and `requisitions`:** Enable RLS on all tables and deny `SELECT` to the `anon` role.
* All reads and writes go through **Supabase Edge Functions / Security-Definer RPCs** validated by `verify_token`, `donor_token`, or `request_id` UUIDs—preventing anyone from scraping the donor table via the public Supabase anon key.

---

## 5. Emergency Edge Cases & Operational Fail-Safes

1. **Rare Blood Group (`O-`, `AB-`, `B-`) or Zero-Donor Stockout:**
   * If `dispatch_donor_wave` returns $< 3$ eligible donors within $3\text{ km}$, the backend automatically expands `current_radius_meters` to $7\text{ km}$ and then $15\text{ km}$ in the same transaction.
   * Simultaneously, `/track/[request_id]` displays an urgent banner prompting the family and blood bank desk to check live inventory on **e-RaktKosh** and nearby Pune blood centres (e.g., Jankalyan Raktapedhi, Sahyadri, Deenanath Mangeshkar Blood Bank) in parallel.
2. **Accepted Donor No-Show (45-Minute Timeout):**
   * A scheduled `pg_cron` / Make.com check scans `dispatch_waves` where `response_status = 'ACCEPTED'` and `arrival_deadline < now()` without hospital check-in.
   * Automatically flips status to `NO_SHOW`, decrements `units_accepted`, increments donor `no_show_count` (pausing automated pings after 3 consecutive unexcused no-shows), and fires an immediate **Backfill Wave** to the next closest donors.
3. **Mass Casualty / Dengue Surge / Viral Traffic Spike:**
   * If multiple requests hit the same blood group simultaneously, PostGIS excludes donors who already have an active `PINGED` or `ACCEPTED` wave in the last 2 hours so the same 15 donors are not bombarded by 10 different hospitals at once.
4. **WhatsApp API Rate Limit or Make.com Free-Tier Exhaustion:**
   * If Make.com webhook delivery fails or monthly free operations ($1,000\text{ ops/month}$) approach $90\%$, `/verify/[token]` exposes a **"Manual Coordinator Backup Queue"** showing pre-formatted `wa.me` click-to-chat buttons for the top 10 matched donors (without exposing phone numbers publicly) so hospital staff can dispatch alerts manually at zero cost.

---

## 6. High-Traffic & Scalability Engineering (Handling Viral Spikes at Zero Cost)

If a Pune blood appeal goes viral on WhatsApp or Instagram and $50,000+$ visitors hit the site in an hour:

1. **Static Edge Caching on Vercel:**
   * `/`, `/request`, `/join`, `/privacy`, and `/404` are compiled as static/edge assets served from Vercel’s Mumbai (`bom1`) edge node—handling tens of thousands of concurrent page loads with **zero database hits**.
2. **Preventing Supabase Free-Tier Connection Exhaustion:**
   * Supabase Free Tier caps direct Postgres connections. All frontend API calls must route through **Supabase Supavisor (Transaction Mode Pooler on port 6543)** and lightweight Edge Functions.
   * **No Realtime WebSockets on `/track/[request_id]`:** Free tier limits concurrent Realtime connections. Instead, `/track/[request_id]` uses **smart HTTP polling ($15\text{-second}$ interval)** backed by `Cache-Control: s-maxage=10, stale-while-revalidate=5` at the Vercel Edge—meaning $10,000$ family/friends refreshing the same tracking link hit the database **at most once every 10 seconds**.
3. **Client-Side Image Compression & Storage Hygiene:**
   * Requisition slip photos uploaded on `/request` are compressed in the browser (Canvas API $\rightarrow$ WebP, max $1024\text{px}$ width, $< 250\text{ KB}$) before uploading to Supabase Storage, keeping well under the $1\text{ GB}$ Free Storage and $5\text{ GB}$ Egress caps. Auto-delete requisition slip images 7 days after `FULFILLED` or `EXPIRED` status to stay compliant with DPDP data minimization and keep storage near zero.
4. **Preventing Supabase 7-Day Inactivity Pause:**
   * Supabase pauses free projects after 7 days of inactivity. Configure a lightweight daily Make.com or GitHub Actions ping (`SELECT 1`) to keep the database warm 24/7.
5. **Upstash Redis / Edge Rate Limiting:**
   * Apply IP-based rate limiting on `/request` (max 3 submissions/hour per IP) and `/join` (max 5 registrations/hour per IP) via Vercel Edge Middleware to block bot spam.

---

## 7. UI/UX Style & Design System Specification (Phase 2: Frontend)

### 7.1 Visual Direction: "Calm Clinical Urgency"
* **Design Philosophy:** High-contrast, distraction-free mobile-first utility. People using this site are either stressed family members in hospital corridors, busy duty doctors, or commuters checking a WhatsApp alert on a 6-inch phone screen.
* **Color Palette:**
  * **Background Canvas:** Crisp Warm Off-White (`#FAFAFA`) with pure white (`#FFFFFF`) elevated cards—maximizes outdoor/corridor readability.
  * **Primary Brand / Action Accent:** Deep Crimson (`#C81E1E`) for primary CTAs (`Submit Urgent Request`, `Accept & Commit`)—calm and authoritative, never neon/alarmist.
  * **Verified Clinical Trust Badge:** Medical Teal (`#0D9488`) with a shield-check icon for verified hospital seals and NBTC eligibility indicators.
  * **Primary Text:** Deep Slate (`#0F172A`) for maximum WCAG AAA contrast ($> 14:1$).
  * **Urgency Pills:** `CRITICAL` (Soft Rose `#FEE2E2` background, `#991B1B` text), `URGENT` (Amber `#FEF3C7` background, `#92400E` text), `SCHEDULED` (Slate `#F1F5F9` background, `#334155` text).
* **Typography:**
  * **Headings & UI:** `Plus Jakarta Sans` or `Inter` (clean geometric sans-serif).
  * **Blood Group Badges, Distances & Timers:** `JetBrains Mono` or tabular-numeral `Inter` (`font-variant-numeric: tabular-nums`) so `O-`, `2.4 km`, and `44:59` timers never jitter.
* **Layout & Mobile Ergonomics:**
  * Single-column centered container (`max-width: 480px` on mobile/tablet, `560px` on desktop) simulating a native app shell.
  * Minimum **$48\text{px} \times 48\text{px}$ touch targets** for all buttons, blood-group selector pills, and toggles.
  * **Zero decorative hero banners, zero carousels, zero pop-up modals.** Every screen opens directly into its primary action.

---

## 8. Antigravity Execution Prompt (Step-by-Step Build Instructions)

Copy and paste this execution directive into **Antigravity IDE** when you begin:

> **Phase 1 Instruction (Backend First):**  
> "Build the complete Supabase backend for our Pune Hyper-Local Verified Blood Matching Platform according to this PRD. First, create the SQL migration file containing PostGIS setup, `verified_hospitals` (pre-seeded with 5 major Pune hospitals across Sinhagad Road, Deccan, and Sadashiv Peth), `donors`, `requisitions`, `dispatch_waves`, and `audit_logs`. Second, write the three PostgreSQL RPC functions (`dispatch_donor_wave`, `respond_to_wave` with row-level locking, and `complete_donation_and_cooldown` enforcing 90-day male / 120-day female NBTC whole-blood cooldowns and exact blood-group matching unless `allow_o_neg_substitute` is true). Third, configure strict RLS policies denying anonymous table reads and expose secure Supabase Edge Functions for `/request`, `/verify`, `/track`, `/join`, and `/donor` endpoints."
>
> **Phase 2 Instruction (Frontend Second):**  
> "Once the backend functions and Edge endpoints are verified, build the Next.js + Tailwind CSS frontend following the 7-route map (`/request`, `/verify/[verify_token]`, `/track/[request_id]`, `/join`, `/donor/[donor_token]`, `/privacy`, `/404`) using the 'Calm Clinical Urgency' design system (`#FAFAFA` canvas, `#C81E1E` primary actions, `#0D9488` clinical verification badges, `480px` mobile-first container, client-side WebP slip compression, and 15-second edge-cached polling on `/track`)."
# SaniTrack — Smart Public Sanitation Network
**Naya Bharat 2047 — Problem Statement 3.2: "Is There a Usable Toilet Nearby?"**

> **Core Promise:** *Find. Verify. Report. Improve.*

SaniTrack is a citizen-driven, AI-ready public sanitation accountability network designed for urban India. It moves beyond static map pins by creating an evidence-based, closed-loop verification platform connecting **citizens**, **toilet caretakers/operators**, **sanitation field workers**, **municipal ward officers (PMC)**, and **Rotary/community funding partners**.

---

## 🌟 Key Highlights & Innovations

1. **GPS Toilet Discovery (`/find`):**
   - Synchronized interactive Leaflet OpenStreetMap and list discovery.
   - Status indicators with clear colors and text labels: `Open & Usable` (Emerald), `Under Maintenance` (Orange), `Closed` (Rose), `Unverified` (Slate).
   - Multi-dimensional filters: Women's section, Sanitary pad dispensers, Wheelchair ramp & grab rails, Free vs Paid, and Running water verified.

2. **Verified Freshness & Source Transparency:**
   - Every status displays its exact origin and timestamp: *"Operator verified · 22m ago"*, *"MahaMetro audit · Today 07:00 AM"*, or *"Community report · 12m ago"*.
   - Never converts stale data into current claims.

3. **Dedicated Women's Menstrual Hygiene Finder (`/hygiene`):**
   - Live pad vending machine availability and stock states (`Available`, `Low`, `Out of Stock`).
   - Price per pad (₹5 coin / UPI) and last refilled timestamp.
   - **Citizen Refill Request Trigger:** Instantly dispatches a task to the assigned field operator.
   - Catalogues disposal incinerators, lidded sanitary bins, and private changing spaces.

4. **Transparent Night Recommendation Mode (`/night-mode`):**
   - Transparent algorithmic recommendation based on objective, verifiable audit criteria: confirmed night hours, inspected perimeter lighting, verified attendants on duty, and high pedestrian traffic.
   - Displays exact *"Why Recommended"* reasons without falsely guaranteeing 100% safety.
   - Quick SOS action strip: One-tap call to **1091 (Women Helpline)**, **112 (National Emergency)**, and quick trip link sharing.

5. **Closed-Loop Citizen Grievance Workflow (`/report` & `/track/:ref`):**
   - Structured grievance submission with photo evidence, categories, priority, and optional anonymous reporting.
   - Generates human-readable tracking codes (e.g. `SAN-PUN-2024-1042`).
   - Public-safe tracking timeline with immutable audit logs without exposing private reporter personal details.

6. **Rotary & Community Maintenance Crowdfunding (`/campaigns` & `/campaigns/:id`):**
   - When municipal repairs face bureaucratic delays, verified needs are presented to Rotary and community partners.
   - Transparent ledger: Target vs Raised vs Spent, itemized contractor invoices, vendor details, and approval signatures.
   - Simulated demo pledge workflow with celebration confetti.

7. **Five Distinct Role-Based Portals:**
   - **Citizen Dashboard (`/dashboard/citizen`)**: Saved favorites, submitted grievance tracker, demo pledges.
   - **Operator & Sanitation Worker Portal (`/dashboard/operator`)**: Assigned toilets, live status toggler (Open/Closed/Maintenance), utility switches (Water/Soap/Lighting), pad stock auditor, and daily shift cleaning checklist with photo upload.
   - **Municipal Ward Officer Desk (`/dashboard/municipal`)**: Ward complaint triage, officer assignment, priority SLA due dates, resolution verification.
   - **Rotary Funding Partner Desk (`/dashboard/rotary`)**: Campaign creation from nominated grievances, contractor invoice management, funding milestone updates.
   - **Platform Admin Desk (`/dashboard/admin`)**: Master audit logs, database connection status, and seed data reset.

8. **Instant Demo Persona Switcher:**
   - A persistent floating toolbar enables hackathon judges to switch roles instantly between Citizen, Toilet Operator, Sanitation Worker, Ward Officer, Rotary Partner, and Admin without requiring manual password logins.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8 |
| **Styling** | Tailwind CSS v4, Lucide React Icons |
| **Maps** | Leaflet OpenStreetMap with custom SVG status pins |
| **Routing** | React Router v7 |
| **Backend & Database** | Supabase (PostgreSQL 15+, PostGIS geography) |
| **Security** | Row Level Security (RLS) on all 18+ tables |
| **Offline Demo Engine** | Dual-engine fallback with persistent LocalStorage state |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm or yarn

### 1. Installation
```bash
# Clone or navigate to the project directory
cd SniTrack

# Install dependencies
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(If Supabase credentials are not provided, SaniTrack automatically activates its full Pune Pilot Offline Demo Engine with instant state synchronization across all roles!)*

### 3. Start Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```

---

## 🗄️ Supabase PostgreSQL Setup & Migrations

The complete database schema, PostGIS extensions, enums, triggers, and Row Level Security policies are located in:
- `supabase/migrations/20241121000000_init_sanitrack.sql`
- `supabase/seed.sql`

To apply to your live Supabase project:
```bash
# Using Supabase CLI
supabase db push
# Or copy the SQL script directly into the Supabase SQL Editor
```

---

## 📍 Pune Pilot Dataset
The prototype comes pre-seeded with realistic public facilities across central Pune:
1. **FC Road Smart "She-Toilet" & Hygiene Hub** (Ward 15 - Deccan)
2. **Shivajinagar Metro Interchange Public Restroom** (Ward 12 - Shivajinagar)
3. **Pune Railway Station Circulating Area Restroom** (Ward 21 - Station / Camp)
4. **Swargate Central MSRTC Bus Stand Restroom** (Ward 19 - Swargate)
5. **Chhatrapati Sambhaji Park E-Toilet Complex** (Ward 15 - Deccan)
6. **Goodluck Chowk Public Community Restroom** (Ward 15 - FC Road)
7. **Sarasbaug Civic Garden Family & Accessible Restroom** (Ward 19 - Swargate)
8. **Kothrud PMT Bus Depot Sanitation Hub** (Ward 24 - Kothrud)
9. **Viman Nagar Joggers Park Eco-Restroom** (Ward 08 - Airport Corridor)

---

## ⚖️ Civic Integrity & Non-Goals in Prototype
- SaniTrack provides transparent algorithmic recommendations; it **never certifies an area as 100% safe**.
- All financial contributions in the prototype are **clearly labeled as simulated demo transactions**.
- No private telephone numbers or reporter identities are published on public grievance feeds.

---

*Developed for Naya Bharat 2047: Problem Statement 3.2 — "Is There a Usable Toilet Nearby?"*

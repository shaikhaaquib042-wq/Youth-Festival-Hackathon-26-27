# BloodLink — Pune Hyper-Local Verified Blood Matching Platform

A privacy-first, zero-cost coordination platform connecting **verified Pune hospitals** with **nearby eligible voluntary blood donors** through capped, distance-ranked notification waves.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js + Tailwind CSS (Vercel) |
| Backend | Supabase (PostgreSQL 15 + PostGIS) |
| Automation | Make.com (Webhooks + WhatsApp Cloud API) |
| Auth | Zero-login UUID v4 capability tokens |

## Project Structure

```
bloodlink/
├── supabase/
│   ├── migrations/          # SQL migrations (run in order)
│   │   ├── 001_extensions_and_schema.sql
│   │   ├── 002_seed_hospitals.sql
│   │   ├── 003_rpc_functions.sql
│   │   └── 004_rls_policies.sql
│   └── functions/           # Supabase Edge Functions
│       ├── request/         # POST — submit blood requisition
│       ├── verify/          # GET/POST — doctor verification
│       ├── track/           # GET — live requisition tracking
│       ├── join/            # POST — donor registration
│       └── donor/           # GET/POST — donor alert & response
├── docs/
│   └── prd.md               # Product Requirements Document
├── .gitignore
├── .env.example
└── README.md
```

## Setup

### 1. Supabase Project
1. Create a free project at [supabase.com](https://supabase.com)
2. Run migrations in order from `supabase/migrations/`
3. Deploy edge functions from `supabase/functions/`

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase credentials.

### 3. Make.com Webhooks
Configure webhook scenarios for WhatsApp notification dispatch.

## Legal & Compliance
- NBTC cooldown enforcement (90 days male / 120 days female)
- DPDP Act consent tracking and data deletion
- Zero donor phone exposure — tokenized links only
- No blood collection, storage, or transport

## License
Private — Hackathon Project

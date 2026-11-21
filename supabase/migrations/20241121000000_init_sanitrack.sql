-- ========================================================================
-- SaniTrack - Smart Public Sanitation Network
-- Migration: 20241121000000_init_sanitrack.sql
-- Naya Bharat 2047: Problem Statement 3.2 - "Is There a Usable Toilet Nearby?"
-- ========================================================================

-- Enable PostGIS extension for accurate geospatial discovery
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ------------------------------------------------------------------------
-- Custom Domain Types & Enums
-- ------------------------------------------------------------------------
CREATE TYPE user_role_enum AS ENUM (
  'guest',
  'citizen',
  'operator',
  'worker',
  'municipal_officer',
  'funding_partner',
  'admin',
  'auditor'
);

CREATE TYPE toilet_status_enum AS ENUM (
  'open',
  'closed',
  'temporarily_unavailable',
  'under_maintenance',
  'unknown'
);

CREATE TYPE source_type_enum AS ENUM (
  'official',
  'operator',
  'community',
  'sample'
);

CREATE TYPE stock_status_enum AS ENUM (
  'available',
  'low',
  'out_of_stock',
  'unknown'
);

CREATE TYPE payment_type_enum AS ENUM (
  'free',
  'paid',
  'unknown',
  'not_applicable'
);

CREATE TYPE complaint_status_enum AS ENUM (
  'submitted',
  'triage',
  'assigned',
  'in_progress',
  'resolved_pending_verification',
  'resolved',
  'rejected',
  'duplicate',
  'reopened',
  'escalated'
);

CREATE TYPE priority_enum AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE campaign_status_enum AS ENUM (
  'draft',
  'under_review',
  'approved',
  'active',
  'completed',
  'cancelled'
);

CREATE TYPE payment_status_enum AS ENUM (
  'pledged',
  'pending',
  'confirmed',
  'failed',
  'refunded',
  'demo'
);

-- ------------------------------------------------------------------------
-- 1. Profiles & RBAC
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role_enum NOT NULL DEFAULT 'citizen',
  ward_id UUID,
  organization_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 2. Wards (Municipal administrative divisions - Pune Pilot)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_number INT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  zone TEXT NOT NULL,
  office_address TEXT,
  contact_phone TEXT,
  officer_name TEXT,
  center_latitude NUMERIC(10, 7) NOT NULL,
  center_longitude NUMERIC(10, 7) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 3. Toilets (Master facility directory)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.toilets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  locality TEXT NOT NULL,
  ward_id UUID REFERENCES public.wards(id) ON DELETE SET NULL,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  location GEOGRAPHY(Point, 4326),
  entry_fee NUMERIC(6, 2) DEFAULT 0.00,
  opening_hours JSONB DEFAULT '{"open": "06:00", "close": "22:00", "is_24_7": false}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT true,
  record_source source_type_enum NOT NULL DEFAULT 'sample',
  verification_status TEXT NOT NULL DEFAULT 'demo_sample', -- 'verified_official', 'operator_audited', 'community_reported', 'demo_sample'
  operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  current_status toilet_status_enum NOT NULL DEFAULT 'open',
  rating NUMERIC(3, 2) DEFAULT 4.0,
  review_count INT NOT NULL DEFAULT 0,
  last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_toilets_location ON public.toilets USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_toilets_ward ON public.toilets(ward_id);
CREATE INDEX IF NOT EXISTS idx_toilets_status ON public.toilets(current_status);

-- ------------------------------------------------------------------------
-- 4. Toilet Sections (Men, Women, Unisex, Accessible, Family)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.toilet_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  toilet_id UUID NOT NULL REFERENCES public.toilets(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL, -- 'women', 'men', 'unisex', 'accessible', 'family'
  cubicles_count INT NOT NULL DEFAULT 1,
  urinals_count INT NOT NULL DEFAULT 0,
  has_western_commode BOOLEAN NOT NULL DEFAULT true,
  has_indian_toilet BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 5. Toilet Facilities (Infrastructure attributes)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.toilet_facilities (
  toilet_id UUID PRIMARY KEY REFERENCES public.toilets(id) ON DELETE CASCADE,
  has_running_water BOOLEAN NOT NULL DEFAULT true,
  has_electricity BOOLEAN NOT NULL DEFAULT true,
  has_adequate_lighting BOOLEAN NOT NULL DEFAULT true,
  soap_available BOOLEAN NOT NULL DEFAULT true,
  handwash_basin BOOLEAN NOT NULL DEFAULT true,
  has_mirror BOOLEAN NOT NULL DEFAULT true,
  has_exhaust_fan BOOLEAN NOT NULL DEFAULT true,
  -- Accessibility
  wheelchair_ramp BOOLEAN NOT NULL DEFAULT false,
  grab_bars BOOLEAN NOT NULL DEFAULT false,
  wide_doorway BOOLEAN NOT NULL DEFAULT false,
  accessible_basin BOOLEAN NOT NULL DEFAULT false,
  -- Safety & Security
  has_caretaker BOOLEAN NOT NULL DEFAULT false,
  well_lit_approach BOOLEAN NOT NULL DEFAULT false,
  cctv_outside_approach BOOLEAN NOT NULL DEFAULT false,
  last_inspected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 6. Toilet Status Updates (Audit history of operational states)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.toilet_status_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  toilet_id UUID NOT NULL REFERENCES public.toilets(id) ON DELETE CASCADE,
  status toilet_status_enum NOT NULL,
  source_type source_type_enum NOT NULL,
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  evidence_path TEXT,
  notes TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_status_updates_toilet ON public.toilet_status_updates(toilet_id, reported_at DESC);

-- ------------------------------------------------------------------------
-- 7. Sanitary Facilities (Menstrual Hygiene Management)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sanitary_facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  toilet_id UUID NOT NULL REFERENCES public.toilets(id) ON DELETE CASCADE,
  facility_type TEXT NOT NULL, -- 'pad_dispenser', 'sanitary_bin', 'incinerator', 'changing_area'
  availability BOOLEAN NOT NULL DEFAULT true,
  payment_type payment_type_enum NOT NULL DEFAULT 'paid',
  price_per_pad NUMERIC(5, 2) DEFAULT 5.00,
  operational_status TEXT NOT NULL DEFAULT 'operational', -- 'operational', 'out_of_order', 'maintenance'
  current_stock stock_status_enum NOT NULL DEFAULT 'available',
  last_refilled_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  verification_source TEXT NOT NULL DEFAULT 'operator_verified',
  sponsor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sanitary_stock_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sanitary_facility_id UUID NOT NULL REFERENCES public.sanitary_facilities(id) ON DELETE CASCADE,
  stock_status stock_status_enum NOT NULL,
  estimated_count INT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 8. Complaints & Citizen Grievance Workflow
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_code TEXT NOT NULL UNIQUE,
  toilet_id UUID REFERENCES public.toilets(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  priority priority_enum NOT NULL DEFAULT 'medium',
  status complaint_status_enum NOT NULL DEFAULT 'submitted',
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_public_summary BOOLEAN NOT NULL DEFAULT true,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_ward_id UUID REFERENCES public.wards(id) ON DELETE SET NULL,
  estimated_cost NUMERIC(10, 2) DEFAULT 0.00,
  eligible_for_campaign BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_toilet ON public.complaints(toilet_id);
CREATE INDEX IF NOT EXISTS idx_complaints_ref ON public.complaints(reference_code);

CREATE TABLE IF NOT EXISTS public.complaint_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.complaint_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  previous_status complaint_status_enum,
  new_status complaint_status_enum NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 9. Cleaning Logs & Worker Tasks
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cleaning_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  toilet_id UUID NOT NULL REFERENCES public.toilets(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cleaned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  floor_cleaned BOOLEAN NOT NULL DEFAULT true,
  fixtures_disinfected BOOLEAN NOT NULL DEFAULT true,
  water_checked BOOLEAN NOT NULL DEFAULT true,
  soap_refilled BOOLEAN NOT NULL DEFAULT true,
  waste_emptied BOOLEAN NOT NULL DEFAULT true,
  pad_stock_checked BOOLEAN NOT NULL DEFAULT true,
  before_photo_path TEXT,
  after_photo_path TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  toilet_id UUID NOT NULL REFERENCES public.toilets(id) ON DELETE CASCADE,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_worker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'verified'
  priority priority_enum NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  evidence_photo_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 10. Rotary & Community Maintenance Campaigns (Transparency Ledger)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  toilet_id UUID NOT NULL REFERENCES public.toilets(id) ON DELETE CASCADE,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE SET NULL,
  target_amount NUMERIC(10, 2) NOT NULL,
  raised_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  spent_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status campaign_status_enum NOT NULL DEFAULT 'active',
  partner_organization_name TEXT NOT NULL DEFAULT 'Rotary Club of Pune Midtown & Community Partners',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  before_repair_photo TEXT,
  after_repair_photo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  donor_name TEXT NOT NULL DEFAULT 'Anonymous Citizen',
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_provider TEXT DEFAULT 'Demo Gateway',
  provider_reference TEXT,
  payment_status payment_status_enum NOT NULL DEFAULT 'demo',
  is_public BOOLEAN NOT NULL DEFAULT true,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  invoice_number TEXT,
  receipt_path TEXT,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.campaign_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_path TEXT,
  posted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 11. Reviews & Favorites
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  toilet_id UUID NOT NULL REFERENCES public.toilets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  cleanliness_rating INT CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  water_rating INT CHECK (water_rating >= 1 AND water_rating <= 5),
  odor_rating INT CHECK (odor_rating >= 1 AND odor_rating <= 5),
  comment TEXT,
  is_verified_visit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  toilet_id UUID NOT NULL REFERENCES public.toilets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, toilet_id)
);

-- ------------------------------------------------------------------------
-- 12. Row Level Security (RLS) Configuration
-- ------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toilets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toilet_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toilet_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toilet_status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanitary_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanitary_stock_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Helper function to check caller's role safely from profiles table
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role_enum AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Public read access for toilets, sections, facilities, wards
CREATE POLICY "Public read toilets" ON public.toilets FOR SELECT USING (true);
CREATE POLICY "Public read toilet_sections" ON public.toilet_sections FOR SELECT USING (true);
CREATE POLICY "Public read toilet_facilities" ON public.toilet_facilities FOR SELECT USING (true);
CREATE POLICY "Public read wards" ON public.wards FOR SELECT USING (true);
CREATE POLICY "Public read sanitary_facilities" ON public.sanitary_facilities FOR SELECT USING (true);
CREATE POLICY "Public read status updates" ON public.toilet_status_updates FOR SELECT USING (true);
CREATE POLICY "Public read campaigns" ON public.campaigns FOR SELECT USING (status != 'draft');
CREATE POLICY "Public read donations" ON public.donations FOR SELECT USING (is_public = true);
CREATE POLICY "Public read expenses" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Public read campaign_updates" ON public.campaign_updates FOR SELECT USING (true);
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);

-- Complaints policies
CREATE POLICY "Public read complaint summaries" ON public.complaints
  FOR SELECT USING (is_public_summary = true OR reporter_id = auth.uid() OR public.current_user_role() IN ('municipal_officer', 'admin', 'operator'));

CREATE POLICY "Authenticated users submit complaints" ON public.complaints
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Reporters update own complaints" ON public.complaints
  FOR UPDATE USING (reporter_id = auth.uid() OR public.current_user_role() IN ('municipal_officer', 'admin'));

-- Favorites policy
CREATE POLICY "Users manage own favorites" ON public.favorites
  FOR ALL USING (user_id = auth.uid());

-- Profiles policy
CREATE POLICY "Profiles read own or directory" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Profiles update own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================================
-- BloodLink: Pune Hyper-Local Verified Blood Matching Platform
-- Migration 001: Extensions & Core Schema
-- ============================================================================

-- Enable PostGIS for hyper-local Pune distance queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- 1. VERIFIED PUNE HOSPITALS & LICENSED BLOOD CENTRES
-- ============================================================================
-- Pre-whitelisted institutions only. No public self-registration.
CREATE TABLE verified_hospitals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  area_label            TEXT NOT NULL,          -- e.g. 'Sinhagad Road', 'Deccan Gymkhana'
  address               TEXT,
  official_bloodbank_phone TEXT NOT NULL,
  location              GEOGRAPHY(Point, 4326) NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hospitals_geo ON verified_hospitals USING GIST (location);
CREATE INDEX idx_hospitals_active ON verified_hospitals (is_active) WHERE is_active = true;

-- ============================================================================
-- 2. VOLUNTARY DONORS
-- ============================================================================
CREATE TABLE donors (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_token           UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  full_name             TEXT NOT NULL,
  whatsapp_phone        TEXT UNIQUE NOT NULL,
  biological_sex        TEXT NOT NULL CHECK (biological_sex IN ('MALE', 'FEMALE')),
  blood_group           TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  location              GEOGRAPHY(Point, 4326) NOT NULL,
  locality_label        TEXT NOT NULL,          -- e.g. 'Kothrud', 'Warje'
  campus_or_community   TEXT,                   -- e.g. 'Fergusson College', 'COEP', 'SPPU', 'Sinhagad Road'
  is_available          BOOLEAN NOT NULL DEFAULT true,
  last_donation_date    DATE,
  cooldown_until        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_lean_reminder_at TIMESTAMPTZ,
  no_show_count         INT NOT NULL DEFAULT 0,
  dpdp_consent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_donors_geo ON donors USING GIST (location);
CREATE INDEX idx_donors_eligibility ON donors (blood_group, is_available, cooldown_until);
CREATE INDEX idx_donors_token ON donors (donor_token);

-- ============================================================================
-- 3. BLOOD REQUISITIONS
-- ============================================================================
CREATE TABLE requisitions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verify_token          UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  patient_reference     TEXT NOT NULL,          -- Initials or IPD/UHID only
  blood_group           TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  component             TEXT NOT NULL DEFAULT 'WHOLE_BLOOD'
                          CHECK (component IN ('WHOLE_BLOOD', 'SDP_PLATELETS', 'PRBC')),
  units_needed          INT NOT NULL CHECK (units_needed BETWEEN 1 AND 6),
  units_accepted        INT NOT NULL DEFAULT 0,
  urgency               TEXT NOT NULL CHECK (urgency IN ('CRITICAL', 'URGENT', 'SCHEDULED')),
  allow_o_neg_substitute BOOLEAN NOT NULL DEFAULT false,
  hospital_id           UUID REFERENCES verified_hospitals(id),
  hospital_name         TEXT NOT NULL,
  hospital_location     GEOGRAPHY(Point, 4326) NOT NULL,
  verifier_phone        TEXT NOT NULL,          -- Duty doctor / blood bank staff
  requester_phone       TEXT NOT NULL,          -- Patient family contact
  slip_image_path       TEXT NOT NULL,          -- Supabase Storage path
  current_wave          INT NOT NULL DEFAULT 0,
  current_radius_meters INT NOT NULL DEFAULT 3000,
  status                TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION'
                          CHECK (status IN (
                            'PENDING_VERIFICATION',
                            'VERIFIED_ACTIVE',
                            'FULFILLED',
                            'EXPIRED',
                            'REJECTED'
                          )),
  verified_at           TIMESTAMPTZ,
  fulfilled_at          TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '12 hours'),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_req_status ON requisitions (status, expires_at);
CREATE INDEX idx_req_verify_token ON requisitions (verify_token);

-- ============================================================================
-- 4. DISPATCH WAVES (Capped 10–15 Donors per Wave)
-- ============================================================================
CREATE TABLE dispatch_waves (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id        UUID NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  donor_id              UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  wave_number           INT NOT NULL DEFAULT 1,
  distance_km           NUMERIC(5,2) NOT NULL,
  response_status       TEXT NOT NULL DEFAULT 'PINGED'
                          CHECK (response_status IN ('PINGED','ACCEPTED','SNOOZED','NO_SHOW','COMPLETED')),
  pinged_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at          TIMESTAMPTZ,
  arrival_deadline      TIMESTAMPTZ,
  UNIQUE (requisition_id, donor_id)
);

CREATE INDEX idx_waves_req ON dispatch_waves (requisition_id, response_status);
CREATE INDEX idx_waves_donor ON dispatch_waves (donor_id, response_status);

-- ============================================================================
-- 5. AUDIT LOGS (DPDP & Clinical Verification Trail)
-- ============================================================================
CREATE TABLE audit_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type           TEXT NOT NULL,          -- 'requisition', 'donor', 'dispatch_wave'
  entity_id             UUID NOT NULL,
  action                TEXT NOT NULL,          -- 'CREATED', 'VERIFIED', 'DISPATCHED', 'FULFILLED', etc.
  actor_type            TEXT,                   -- 'SYSTEM', 'HOSPITAL_STAFF', 'DONOR'
  metadata              JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs (created_at);

-- ============================================================================
-- 6. LEAN MONTH REMINDERS (Seasonal Cooldown Audit Trail)
-- ============================================================================
CREATE TABLE lean_month_reminders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id              UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  season_type           TEXT NOT NULL,          -- 'SUMMER_LEAN' | 'FESTIVAL_LEAN' | 'STANDARD_COOLDOWN_EXPIRED'
  reminder_channel      TEXT NOT NULL DEFAULT 'WHATSAPP',
  sent_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata              JSONB
);

CREATE INDEX idx_lean_reminders_donor ON lean_month_reminders (donor_id, sent_at);

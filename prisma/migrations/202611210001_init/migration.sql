-- SunShield PostgreSQL schema. Safe to run repeatedly; no destructive DDL.
DO $$ BEGIN CREATE TYPE safe_zone_category AS ENUM
  ('DRINKING_WATER','SHADED_REST_AREA','COOLING_CENTER','COMMUNITY_SHOP','MEDICAL_FACILITY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE verification_status AS ENUM ('PENDING','VERIFIED','REJECTED','DEMO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE availability_status AS ENUM ('AVAILABLE','LIMITED','UNAVAILABLE','UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE organization_type AS ENUM ('EMPLOYER','CONTRACTOR','GOVERNMENT','NGO','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE workload AS ENUM ('LIGHT','MODERATE','HEAVY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS safe_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(150) NOT NULL CHECK (length(btrim(name)) > 0),
  category safe_zone_category NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  address text NOT NULL,
  water_available boolean NOT NULL DEFAULT false,
  shade_available boolean NOT NULL DEFAULT false,
  seating_available boolean NOT NULL DEFAULT false,
  opening_hours text,
  verification_status verification_status NOT NULL DEFAULT 'PENDING',
  availability_status availability_status NOT NULL DEFAULT 'UNKNOWN',
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS safe_zones_category_idx ON safe_zones(category);
CREATE INDEX IF NOT EXISTS safe_zones_verification_status_idx ON safe_zones(verification_status);
CREATE INDEX IF NOT EXISTS safe_zones_availability_status_idx ON safe_zones(availability_status);
CREATE INDEX IF NOT EXISTS safe_zones_latitude_longitude_idx ON safe_zones(latitude, longitude);
CREATE INDEX IF NOT EXISTS safe_zones_discovery_idx ON safe_zones(verification_status, category, availability_status);

CREATE TABLE IF NOT EXISTS safe_zone_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  safe_zone_id uuid NOT NULL REFERENCES safe_zones(id) ON DELETE CASCADE ON UPDATE CASCADE,
  availability_status availability_status NOT NULL,
  comment varchar(500) CHECK (comment IS NULL OR length(comment) <= 500),
  reporter_token_hash varchar(255),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS safe_zone_reports_safe_zone_id_idx ON safe_zone_reports(safe_zone_id);
CREATE INDEX IF NOT EXISTS safe_zone_reports_created_at_idx ON safe_zone_reports(created_at);
CREATE INDEX IF NOT EXISTS safe_zone_reports_zone_created_idx ON safe_zone_reports(safe_zone_id, created_at);

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(150) NOT NULL CHECK (length(btrim(name)) > 0),
  organization_type organization_type NOT NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS organizations_organization_type_idx ON organizations(organization_type);
CREATE INDEX IF NOT EXISTS organizations_is_demo_idx ON organizations(is_demo);

CREATE TABLE IF NOT EXISTS worksites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  name varchar(150) NOT NULL CHECK (length(btrim(name)) > 0),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  worker_count integer NOT NULL CHECK (worker_count >= 0),
  workload workload NOT NULL,
  water_access boolean NOT NULL DEFAULT false,
  shade_access boolean NOT NULL DEFAULT false,
  work_start time NOT NULL,
  work_end time NOT NULL,
  is_demo boolean NOT NULL DEFAULT false,
  CHECK (work_start <> work_end)
);
CREATE INDEX IF NOT EXISTS worksites_organization_id_idx ON worksites(organization_id);
CREATE INDEX IF NOT EXISTS worksites_latitude_longitude_idx ON worksites(latitude, longitude);
CREATE INDEX IF NOT EXISTS worksites_is_demo_idx ON worksites(is_demo);

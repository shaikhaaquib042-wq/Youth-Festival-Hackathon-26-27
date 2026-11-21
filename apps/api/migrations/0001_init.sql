-- Raasta D1 schema. No personal data beyond what a person chooses to type in a feedback form.
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  rating INTEGER,
  category TEXT,
  message TEXT,
  page TEXT,
  lang TEXT
);

CREATE TABLE IF NOT EXISTS system_requests (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  state TEXT,
  city TEXT,
  dispute_desc TEXT,
  portal_url TEXT,
  contact_optional TEXT
);

-- Only the reference returned by DIGIT is stored, never the complaint text.
CREATE TABLE IF NOT EXISTS digit_submissions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  tenant_id TEXT,
  service_request_id TEXT NOT NULL,
  status TEXT
);
CREATE INDEX IF NOT EXISTS idx_digit_sr ON digit_submissions (service_request_id);

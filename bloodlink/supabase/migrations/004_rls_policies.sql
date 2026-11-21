-- ============================================================================
-- BloodLink: Migration 004 — Row-Level Security (RLS) Policies
-- ============================================================================
-- STRICT ZERO-PUBLIC-READ: The anon role cannot SELECT, INSERT, UPDATE, or
-- DELETE on any table directly. All access goes through SECURITY DEFINER
-- RPC functions and Edge Functions that validate capability tokens.
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE verified_hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_waves ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFIED_HOSPITALS: Public read-only (hospital list is not sensitive)
-- ============================================================================
CREATE POLICY "hospitals_public_read"
  ON verified_hospitals
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- No public insert/update/delete on hospitals
CREATE POLICY "hospitals_no_public_write"
  ON verified_hospitals
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- DONORS: Zero public access — all via RPC
-- ============================================================================
CREATE POLICY "donors_deny_anon"
  ON donors
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Service role (Edge Functions) can do everything
CREATE POLICY "donors_service_full"
  ON donors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- REQUISITIONS: Zero public access — all via RPC
-- ============================================================================
CREATE POLICY "requisitions_deny_anon"
  ON requisitions
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "requisitions_service_full"
  ON requisitions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DISPATCH_WAVES: Zero public access — all via RPC
-- ============================================================================
CREATE POLICY "waves_deny_anon"
  ON dispatch_waves
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "waves_service_full"
  ON dispatch_waves
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- AUDIT_LOGS: Zero public access — internal only
-- ============================================================================
CREATE POLICY "audit_deny_anon"
  ON audit_logs
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "audit_service_full"
  ON audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STORAGE: Requisition slip images bucket policy
-- ============================================================================
-- Run this in Supabase Dashboard > Storage > Policies:
-- Bucket: 'requisition-slips'
--   INSERT: Allow anon (public uploads from /request form)
--   SELECT: Allow only via service_role (Edge Functions verify token first)
--   DELETE: Allow only service_role (auto-cleanup after 7 days)
-- ============================================================================

-- ============================================================================
-- BloodLink: Migration 005 — NBTC & DPDP Clinical Safety Guardrails
-- ============================================================================
-- 1. Updates schema for campus/community registries, fulfillment timestamps,
--    and seasonal lean-month audit logging.
-- 2. Defines 4 atomic PostgreSQL RPC functions with SECURITY DEFINER and
--    row-level locking (dispatch_donor_wave, respond_to_wave,
--    complete_donation_and_cooldown, get_lean_month_eligible_donors).
-- 3. Enforces strict zero-public-read RLS for anon role.
-- ============================================================================

-- ============================================================================
-- 1. SCHEMA ENHANCEMENTS
-- ============================================================================

-- On donors:
ALTER TABLE donors
  ADD COLUMN IF NOT EXISTS campus_or_community TEXT,
  ADD COLUMN IF NOT EXISTS last_lean_reminder_at TIMESTAMPTZ;

-- On requisitions:
ALTER TABLE requisitions
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

-- Lean Month Reminders Table (Audit log for seasonal blood donation drives)
CREATE TABLE IF NOT EXISTS lean_month_reminders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id          UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  season_type       TEXT NOT NULL, -- 'SUMMER_LEAN' | 'FESTIVAL_LEAN' | 'STANDARD_COOLDOWN_EXPIRED'
  reminder_channel  TEXT NOT NULL DEFAULT 'WHATSAPP',
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata          JSONB
);

CREATE INDEX IF NOT EXISTS idx_lean_reminders_donor ON lean_month_reminders (donor_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_donors_lean_eligible ON donors (is_available, cooldown_until, last_lean_reminder_at);

-- ============================================================================
-- 2. RLS POLICIES FOR NEW TABLE
-- ============================================================================
ALTER TABLE lean_month_reminders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lean_month_reminders' AND policyname = 'lean_reminders_deny_anon'
  ) THEN
    CREATE POLICY "lean_reminders_deny_anon"
      ON lean_month_reminders
      FOR ALL
      TO anon
      USING (false)
      WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lean_month_reminders' AND policyname = 'lean_reminders_service_full'
  ) THEN
    CREATE POLICY "lean_reminders_service_full"
      ON lean_month_reminders
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;


-- ============================================================================
-- 3. RPC FUNCTION 1: dispatch_donor_wave
-- ============================================================================
-- Matches EXACT blood group unless allow_o_neg_substitute is authorized.
-- Enforces NBTC cooldown, anti-bombardment (no active ping in last 2 hrs),
-- auto-expands 3km -> 7km -> 15km if < 3 donors found, and returns matching
-- transparency breakdown metrics (total_in_radius, excluded_cooldown, newly_pinged).
-- ============================================================================
CREATE OR REPLACE FUNCTION dispatch_donor_wave(
  p_requisition_id UUID,
  p_wave_cap INT DEFAULT 12
)
RETURNS TABLE (
  wave_id UUID,
  donor_id UUID,
  donor_token UUID,
  donor_phone TEXT,
  donor_name TEXT,
  distance_km NUMERIC,
  total_in_radius INT,
  excluded_cooldown INT,
  newly_pinged INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req RECORD;
  v_wave_number INT;
  v_newly_pinged INT := 0;
  v_radius INT;
  v_radii INT[] := ARRAY[3000, 7000, 15000];
  v_total_in_radius INT := 0;
  v_excluded_cooldown INT := 0;
BEGIN
  -- 1. Lock and validate the requisition
  SELECT r.*
    INTO v_req
    FROM requisitions r
   WHERE r.id = p_requisition_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Requisition not found.';
  END IF;

  -- Auto-expire if past expiration window
  IF v_req.status = 'VERIFIED_ACTIVE' AND v_req.expires_at < now() THEN
    UPDATE requisitions SET status = 'EXPIRED' WHERE id = v_req.id;
    RAISE EXCEPTION 'Requisition has expired past its expiration deadline.';
  END IF;

  IF v_req.status <> 'VERIFIED_ACTIVE' OR v_req.units_accepted >= v_req.units_needed THEN
    RAISE EXCEPTION 'Requisition not active or already fulfilled.';
  END IF;

  -- 2. Determine wave number
  SELECT COALESCE(MAX(dw.wave_number), 0) + 1
    INTO v_wave_number
    FROM dispatch_waves dw
   WHERE dw.requisition_id = p_requisition_id;

  -- 3. Evaluate matching radius with auto-expansion
  FOREACH v_radius IN ARRAY v_radii
  LOOP
    IF v_radius < v_req.current_radius_meters THEN
      CONTINUE;
    END IF;

    -- Calculate total matching donors physically within this radius
    SELECT COUNT(*)
      INTO v_total_in_radius
      FROM donors d
     WHERE (
       d.blood_group = v_req.blood_group
       OR (v_req.allow_o_neg_substitute = true AND d.blood_group = 'O-')
     )
     AND ST_DWithin(d.location, v_req.hospital_location, v_radius);

    -- Calculate how many of those matching donors are safely excluded by active NBTC cooldown
    SELECT COUNT(*)
      INTO v_excluded_cooldown
      FROM donors d
     WHERE (
       d.blood_group = v_req.blood_group
       OR (v_req.allow_o_neg_substitute = true AND d.blood_group = 'O-')
     )
     AND ST_DWithin(d.location, v_req.hospital_location, v_radius)
     AND d.cooldown_until > now();

    -- Insert eligible donors into dispatch_waves
    INSERT INTO dispatch_waves (requisition_id, donor_id, wave_number, distance_km)
    SELECT
      p_requisition_id,
      d.id,
      v_wave_number,
      ROUND((ST_Distance(d.location, v_req.hospital_location) / 1000.0)::NUMERIC, 2)
    FROM donors d
    WHERE d.is_available = true
      AND d.cooldown_until <= now()
      AND d.no_show_count < 3
      -- EXACT blood group matching, with O- only if clinician authorized
      AND (
        d.blood_group = v_req.blood_group
        OR (v_req.allow_o_neg_substitute = true AND d.blood_group = 'O-')
      )
      -- Within current radius
      AND ST_DWithin(d.location, v_req.hospital_location, v_radius)
      -- Exclude donors already pinged for this requisition
      AND d.id NOT IN (
        SELECT dw.donor_id FROM dispatch_waves dw WHERE dw.requisition_id = p_requisition_id
      )
      -- Anti-bombardment: exclude donors pinged in any other wave within last 2 hours
      AND d.id NOT IN (
        SELECT dw2.donor_id
          FROM dispatch_waves dw2
         WHERE dw2.response_status IN ('PINGED', 'ACCEPTED')
           AND dw2.pinged_at > now() - INTERVAL '2 hours'
           AND dw2.requisition_id != p_requisition_id
      )
    ORDER BY ST_Distance(d.location, v_req.hospital_location) ASC
    LIMIT p_wave_cap;

    GET DIAGNOSTICS v_newly_pinged = ROW_COUNT;

    -- Update current radius & wave on the requisition
    UPDATE requisitions
       SET current_wave = v_wave_number,
           current_radius_meters = v_radius
     WHERE id = p_requisition_id;

    -- If 3 or more donors matched, stop radius expansion
    IF v_newly_pinged >= 3 THEN
      EXIT;
    END IF;
  END LOOP;

  -- 4. Audit trail
  INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, metadata)
  VALUES (
    'requisition',
    p_requisition_id,
    'WAVE_DISPATCHED',
    'SYSTEM',
    jsonb_build_object(
      'wave_number', v_wave_number,
      'newly_pinged', v_newly_pinged,
      'radius_meters', v_radius,
      'total_in_radius', v_total_in_radius,
      'excluded_cooldown', v_excluded_cooldown
    )
  );

  -- 5. Return pinged donors with live matching breakdown counts
  RETURN QUERY
  SELECT
    dw.id AS wave_id,
    dw.donor_id,
    d.donor_token,
    d.whatsapp_phone AS donor_phone,
    d.full_name AS donor_name,
    dw.distance_km,
    v_total_in_radius,
    v_excluded_cooldown,
    v_newly_pinged
  FROM dispatch_waves dw
  JOIN donors d ON d.id = dw.donor_id
  WHERE dw.requisition_id = p_requisition_id
    AND dw.wave_number = v_wave_number;
END;
$$;


-- ============================================================================
-- 4. RPC FUNCTION 2: respond_to_wave
-- ============================================================================
-- Row-level locking on requisitions (FOR UPDATE).
-- Critical auto-expiration: When units_accepted reaches units_needed,
-- requisitions.status is immediately flipped to 'FULFILLED', fulfilled_at = now(),
-- and all remaining 'PINGED' alerts for this requisition are instantly expired.
-- On snooze, triggers 1-donor backfill.
-- ============================================================================
CREATE OR REPLACE FUNCTION respond_to_wave(
  p_donor_token UUID,
  p_wave_id UUID,
  p_action TEXT  -- 'ACCEPTED' or 'SNOOZED'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_donor RECORD;
  v_wave RECORD;
  v_req RECORD;
  v_result JSONB;
BEGIN
  IF p_action NOT IN ('ACCEPTED', 'SNOOZED') THEN
    RAISE EXCEPTION 'Invalid action. Must be ACCEPTED or SNOOZED.';
  END IF;

  -- 1. Validate the donor
  SELECT * INTO v_donor FROM donors WHERE donor_token = p_donor_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_DONOR_TOKEN');
  END IF;

  -- 2. Validate and lock the wave entry
  SELECT * INTO v_wave
    FROM dispatch_waves
   WHERE id = p_wave_id
     AND donor_id = v_donor.id
     AND response_status = 'PINGED'
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'EXPIRED_OR_RESPONDED',
      'message', 'This wave alert has already been responded to or has expired.'
    );
  END IF;

  -- 3. Lock the requisition row with FOR UPDATE
  SELECT * INTO v_req
    FROM requisitions
   WHERE id = v_wave.requisition_id
     FOR UPDATE;

  -- Auto-expire if past expiration window
  IF v_req.status = 'VERIFIED_ACTIVE' AND v_req.expires_at < now() THEN
    UPDATE requisitions SET status = 'EXPIRED' WHERE id = v_req.id;
    v_req.status := 'EXPIRED';
  END IF;

  -- Check if need is already met or requisition inactive
  IF v_req.status IN ('FULFILLED', 'EXPIRED', 'REJECTED') OR v_req.units_accepted >= v_req.units_needed THEN
    -- Expire this wave entry
    UPDATE dispatch_waves
       SET response_status = 'SNOOZED',
           responded_at = now()
     WHERE id = p_wave_id;

    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'NEED_ALREADY_MET',
      'fulfilled_at', v_req.fulfilled_at,
      'message', 'Need Met — This request has already been fulfilled by other voluntary donors. Thank you!'
    );
  END IF;

  -- 4. Handle ACCEPT
  IF p_action = 'ACCEPTED' THEN
    -- Lock slot and set 45-minute arrival deadline
    UPDATE dispatch_waves
       SET response_status = 'ACCEPTED',
           responded_at = now(),
           arrival_deadline = now() + INTERVAL '45 minutes'
     WHERE id = p_wave_id;

    -- Increment accepted count
    UPDATE requisitions
       SET units_accepted = units_accepted + 1
     WHERE id = v_wave.requisition_id;

    -- CRITICAL AUTO-EXPIRATION RULE:
    -- If target reached, immediately fulfill requisition and expire all remaining PINGED alerts
    IF (v_req.units_accepted + 1) >= v_req.units_needed THEN
      UPDATE requisitions
         SET status = 'FULFILLED',
             fulfilled_at = now()
       WHERE id = v_wave.requisition_id;

      -- Expire all outstanding unaccepted wave alerts so stale links stop immediately
      UPDATE dispatch_waves
         SET response_status = 'SNOOZED',
             responded_at = now()
       WHERE requisition_id = v_wave.requisition_id
         AND response_status = 'PINGED';
    END IF;

    -- Audit log
    INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, metadata)
    VALUES (
      'dispatch_wave', p_wave_id, 'DONOR_ACCEPTED', 'DONOR',
      jsonb_build_object(
        'donor_id', v_donor.id,
        'requisition_id', v_wave.requisition_id,
        'units_accepted_now', v_req.units_accepted + 1,
        'units_needed', v_req.units_needed,
        'is_fulfilled_now', ((v_req.units_accepted + 1) >= v_req.units_needed)
      )
    );

    v_result := jsonb_build_object(
      'ok', true,
      'status', 'ACCEPTED',
      'message', 'Commitment confirmed! Please reach the hospital blood bank within 45 minutes.',
      'hospital_name', v_req.hospital_name,
      'arrival_deadline', (now() + INTERVAL '45 minutes'),
      'units_accepted', v_req.units_accepted + 1,
      'units_needed', v_req.units_needed
    );

  -- 5. Handle SNOOZE
  ELSIF p_action = 'SNOOZED' THEN
    UPDATE dispatch_waves
       SET response_status = 'SNOOZED',
           responded_at = now()
     WHERE id = p_wave_id;

    -- Audit log
    INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, metadata)
    VALUES (
      'dispatch_wave', p_wave_id, 'DONOR_SNOOZED', 'DONOR',
      jsonb_build_object('donor_id', v_donor.id, 'requisition_id', v_wave.requisition_id)
    );

    -- Trigger 1-donor backfill from PostGIS queue
    PERFORM dispatch_donor_wave(v_wave.requisition_id, 1);

    v_result := jsonb_build_object(
      'ok', true,
      'status', 'SNOOZED',
      'message', 'Understood. We have alerted the next closest voluntary donor. Thank you!'
    );
  END IF;

  RETURN v_result;
END;
$$;


-- ============================================================================
-- 5. RPC FUNCTION 3: complete_donation_and_cooldown
-- ============================================================================
-- Called upon hospital blood bank verification.
-- Programmatically sets NBTC health guardrails:
--   14 days for SDP Platelets
--   90 days for Male Whole Blood / PRBC
--   120 days for Female Whole Blood / PRBC
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_donation_and_cooldown(
  p_verify_token UUID,
  p_donor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req RECORD;
  v_donor RECORD;
  v_wave RECORD;
  v_cooldown_interval INTERVAL;
BEGIN
  -- 1. Validate the requisition
  SELECT * INTO v_req
    FROM requisitions
   WHERE verify_token = p_verify_token
     AND status IN ('VERIFIED_ACTIVE', 'FULFILLED');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid verification token or requisition not active.';
  END IF;

  -- 2. Validate the donor
  SELECT * INTO v_donor FROM donors WHERE id = p_donor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donor not found.';
  END IF;

  -- 3. Validate active wave
  SELECT * INTO v_wave
    FROM dispatch_waves
   WHERE requisition_id = v_req.id
     AND donor_id = p_donor_id
     AND response_status = 'ACCEPTED'
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No accepted wave entry found for this donor on this requisition.';
  END IF;

  -- 4. Calculate NBTC-mandated cooldown
  IF v_req.component = 'SDP_PLATELETS' THEN
    v_cooldown_interval := INTERVAL '14 days';
  ELSIF v_donor.biological_sex = 'MALE' THEN
    v_cooldown_interval := INTERVAL '90 days';
  ELSE
    v_cooldown_interval := INTERVAL '120 days';
  END IF;

  -- 5. Update wave status to COMPLETED
  UPDATE dispatch_waves
     SET response_status = 'COMPLETED',
         responded_at = now()
   WHERE id = v_wave.id;

  -- 6. Update donor profile with cooldown & reset no-show count
  UPDATE donors
     SET cooldown_until = now() + v_cooldown_interval,
         last_donation_date = CURRENT_DATE,
         no_show_count = 0
   WHERE id = p_donor_id;

  -- 7. Audit log (no sensitive personal medical records stored)
  INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, metadata)
  VALUES (
    'donor', p_donor_id, 'DONATION_COMPLETED', 'HOSPITAL_STAFF',
    jsonb_build_object(
      'requisition_id', v_req.id,
      'component', v_req.component,
      'cooldown_until', (now() + v_cooldown_interval),
      'cooldown_days', EXTRACT(DAY FROM v_cooldown_interval)
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Donation recorded successfully. NBTC health cooldown activated.',
    'cooldown_until', (now() + v_cooldown_interval),
    'cooldown_days', EXTRACT(DAY FROM v_cooldown_interval)
  );
END;
$$;


-- ============================================================================
-- 6. RPC FUNCTION 4: get_lean_month_eligible_donors
-- ============================================================================
-- Returns eligible donors (available, cooldown expired, and no recent reminder
-- within 30 days) along with seasonal lean indicators:
--   Summer Lean: March (3), April (4), May (5)
--   Festival Lean: August (8), September (9), October (10), November (11)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_lean_month_eligible_donors(
  p_limit INT DEFAULT 25
)
RETURNS TABLE (
  donor_id UUID,
  donor_token UUID,
  full_name TEXT,
  blood_group TEXT,
  locality_label TEXT,
  campus_or_community TEXT,
  biological_sex TEXT,
  days_since_last_donation INT,
  cooldown_until TIMESTAMPTZ,
  is_lean_season BOOLEAN,
  season_label TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_month INT;
  v_is_lean BOOLEAN := false;
  v_season_label TEXT := 'STANDARD';
BEGIN
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE)::INT;

  IF v_current_month IN (3, 4, 5) THEN
    v_is_lean := true;
    v_season_label := 'SUMMER_EXAM_LEAN';
  ELSIF v_current_month IN (8, 9, 10, 11) THEN
    v_is_lean := true;
    v_season_label := 'FESTIVAL_SEASON_LEAN';
  END IF;

  RETURN QUERY
  SELECT
    d.id AS donor_id,
    d.donor_token,
    d.full_name,
    d.blood_group,
    d.locality_label,
    d.campus_or_community,
    d.biological_sex,
    COALESCE(
      (CURRENT_DATE - d.last_donation_date)::INT,
      CASE WHEN d.biological_sex = 'MALE' THEN 95 ELSE 125 END
    ) AS days_since_last_donation,
    d.cooldown_until,
    v_is_lean AS is_lean_season,
    v_season_label AS season_label
  FROM donors d
  WHERE d.is_available = true
    AND d.cooldown_until <= now()
    AND (
      d.last_lean_reminder_at IS NULL
      OR d.last_lean_reminder_at < now() - INTERVAL '30 days'
    )
  ORDER BY d.cooldown_until ASC
  LIMIT p_limit;
END;
$$;


-- ============================================================================
-- 7. HELPER RPC: record_lean_month_reminder
-- ============================================================================
CREATE OR REPLACE FUNCTION record_lean_month_reminder(
  p_donor_id UUID,
  p_season_type TEXT DEFAULT 'SUMMER_LEAN'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO lean_month_reminders (donor_id, season_type, reminder_channel, metadata)
  VALUES (
    p_donor_id,
    p_season_type,
    'WHATSAPP',
    jsonb_build_object('triggered_at', now(), 'source', 'LEAN_MONTH_SCHEDULER')
  );

  UPDATE donors
     SET last_lean_reminder_at = now()
   WHERE id = p_donor_id;

  RETURN jsonb_build_object('ok', true, 'message', 'Seasonal reminder recorded.');
END;
$$;

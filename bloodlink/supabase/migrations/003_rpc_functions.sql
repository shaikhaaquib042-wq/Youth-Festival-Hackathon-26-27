-- ============================================================================
-- BloodLink: Migration 003 — Core RPC Functions
-- ============================================================================
-- Atomic, concurrency-safe matching engine inside PostgreSQL.
-- All critical logic runs server-side to prevent race conditions.
-- ============================================================================


-- ============================================================================
-- RPC 1: dispatch_donor_wave
-- ============================================================================
-- Called after hospital verification. Finds nearest eligible donors within
-- the current radius, caps at p_wave_cap, and inserts dispatch_waves rows.
-- Auto-expands radius (3km → 7km → 15km) if too few donors found.
-- Returns the pinged donors for Make.com WhatsApp dispatch.
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
  distance_km NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req RECORD;
  v_wave_number INT;
  v_matched_count INT := 0;
  v_radius INT;
  v_radii INT[] := ARRAY[3000, 7000, 15000];
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
    RAISE EXCEPTION 'Requisition is not active or already fulfilled.';
  END IF;

  -- 2. Determine wave number
  SELECT COALESCE(MAX(dw.wave_number), 0) + 1
    INTO v_wave_number
    FROM dispatch_waves dw
   WHERE dw.requisition_id = p_requisition_id;

  -- 3. Try expanding radius until we get enough donors or exhaust all radii
  FOREACH v_radius IN ARRAY v_radii
  LOOP
    -- Skip radii smaller than what we've already tried
    IF v_radius < v_req.current_radius_meters THEN
      CONTINUE;
    END IF;

    -- Insert matched donors into dispatch_waves
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
      -- Exact blood group match, or include O- if hospital authorized substitute
      AND (
        d.blood_group = v_req.blood_group
        OR (v_req.allow_o_neg_substitute = true AND d.blood_group = 'O-')
      )
      -- Within radius
      AND ST_DWithin(d.location, v_req.hospital_location, v_radius)
      -- Not already dispatched for this requisition
      AND d.id NOT IN (
        SELECT dw.donor_id FROM dispatch_waves dw WHERE dw.requisition_id = p_requisition_id
      )
      -- Not currently pinged/accepted for another active requisition (anti-bombardment)
      AND d.id NOT IN (
        SELECT dw2.donor_id
          FROM dispatch_waves dw2
         WHERE dw2.response_status IN ('PINGED', 'ACCEPTED')
           AND dw2.pinged_at > now() - INTERVAL '2 hours'
           AND dw2.requisition_id != p_requisition_id
      )
    ORDER BY ST_Distance(d.location, v_req.hospital_location) ASC
    LIMIT p_wave_cap;

    -- Check how many we got in this wave
    GET DIAGNOSTICS v_matched_count = ROW_COUNT;

    -- Update the requisition's current radius and wave counter
    UPDATE requisitions
       SET current_wave = v_wave_number,
           current_radius_meters = v_radius
     WHERE id = p_requisition_id;

    -- If we got at least 3, stop expanding
    IF v_matched_count >= 3 THEN
      EXIT;
    END IF;
  END LOOP;

  -- 4. Log the dispatch
  INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, metadata)
  VALUES (
    'requisition',
    p_requisition_id,
    'WAVE_DISPATCHED',
    'SYSTEM',
    jsonb_build_object(
      'wave_number', v_wave_number,
      'donors_pinged', v_matched_count,
      'radius_meters', v_req.current_radius_meters
    )
  );

  -- 5. Return the pinged donors for WhatsApp notification
  RETURN QUERY
  SELECT
    dw.id AS wave_id,
    dw.donor_id,
    d.donor_token,
    d.whatsapp_phone AS donor_phone,
    d.full_name AS donor_name,
    dw.distance_km
  FROM dispatch_waves dw
  JOIN donors d ON d.id = dw.donor_id
  WHERE dw.requisition_id = p_requisition_id
    AND dw.wave_number = v_wave_number;
END;
$$;


-- ============================================================================
-- RPC 2: respond_to_wave
-- ============================================================================
-- Called when a donor taps Accept or Snooze on /donor/[token].
-- Uses row-level locking (SELECT ... FOR UPDATE) on requisitions so
-- concurrent accepts for a 1-unit request don't double-book.
-- On snooze, triggers a 1-donor backfill.
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
  -- Validate action
  IF p_action NOT IN ('ACCEPTED', 'SNOOZED') THEN
    RAISE EXCEPTION 'Invalid action. Must be ACCEPTED or SNOOZED.';
  END IF;

  -- 1. Validate the donor
  SELECT * INTO v_donor FROM donors WHERE donor_token = p_donor_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid donor token.';
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
      'success', false,
      'message', 'This alert has already been responded to or has expired.'
    );
  END IF;

  -- 3. Lock the requisition row to prevent race conditions
  SELECT * INTO v_req
    FROM requisitions
   WHERE id = v_wave.requisition_id
     FOR UPDATE;

  -- Auto-expire if past expiration window
  IF v_req.status = 'VERIFIED_ACTIVE' AND v_req.expires_at < now() THEN
    UPDATE requisitions SET status = 'EXPIRED' WHERE id = v_req.id;
    v_req.status := 'EXPIRED';
  END IF;

  IF NOT FOUND OR v_req.status <> 'VERIFIED_ACTIVE' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'This blood request has been fulfilled or is no longer active.'
    );
  END IF;

  -- 4. Handle ACCEPT
  IF p_action = 'ACCEPTED' THEN
    -- Check if there's still capacity
    IF v_req.units_accepted >= v_req.units_needed THEN
      -- Slot already filled by another donor
      UPDATE dispatch_waves
         SET response_status = 'SNOOZED',
             responded_at = now()
       WHERE id = p_wave_id;

      RETURN jsonb_build_object(
        'success', false,
        'message', 'All units have been covered by other nearby donors. Thank you for your willingness!'
      );
    END IF;

    -- Accept the donor — lock the slot
    UPDATE dispatch_waves
       SET response_status = 'ACCEPTED',
           responded_at = now(),
           arrival_deadline = now() + INTERVAL '45 minutes'
     WHERE id = p_wave_id;

    -- Increment accepted count
    UPDATE requisitions
       SET units_accepted = units_accepted + 1
     WHERE id = v_wave.requisition_id;

    -- Check if fully filled now
    IF (v_req.units_accepted + 1) >= v_req.units_needed THEN
      UPDATE requisitions
         SET status = 'FULFILLED'
       WHERE id = v_wave.requisition_id;
    END IF;

    -- Audit log
    INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, metadata)
    VALUES (
      'dispatch_wave', p_wave_id, 'DONOR_ACCEPTED', 'DONOR',
      jsonb_build_object(
        'donor_id', v_donor.id,
        'requisition_id', v_wave.requisition_id,
        'units_accepted_now', v_req.units_accepted + 1,
        'units_needed', v_req.units_needed
      )
    );

    v_result := jsonb_build_object(
      'success', true,
      'message', 'Thank you! You have been confirmed. Please reach the hospital within 45 minutes.',
      'hospital_name', v_req.hospital_name,
      'arrival_deadline', (now() + INTERVAL '45 minutes')
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

    -- Backfill: pull 1 more donor to replace
    PERFORM dispatch_donor_wave(v_wave.requisition_id, 1);

    v_result := jsonb_build_object(
      'success', true,
      'message', 'No problem. We will reach out to another nearby donor. Thank you!'
    );
  END IF;

  RETURN v_result;
END;
$$;


-- ============================================================================
-- RPC 3: complete_donation_and_cooldown
-- ============================================================================
-- Called when hospital staff marks a donation as completed.
-- Sets NBTC-compliant cooldown:
--   Whole Blood / PRBC: 90 days (Male), 120 days (Female)
--   SDP Platelets: 14 days
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
  -- 1. Validate the requisition via verify token
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

  -- 3. Validate the wave entry exists and donor accepted
  SELECT * INTO v_wave
    FROM dispatch_waves
   WHERE requisition_id = v_req.id
     AND donor_id = p_donor_id
     AND response_status = 'ACCEPTED'
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active accepted dispatch found for this donor and requisition.';
  END IF;

  -- 4. Calculate NBTC-compliant cooldown
  IF v_req.component = 'SDP_PLATELETS' THEN
    v_cooldown_interval := INTERVAL '14 days';
  ELSIF v_donor.biological_sex = 'MALE' THEN
    v_cooldown_interval := INTERVAL '90 days';
  ELSE
    v_cooldown_interval := INTERVAL '120 days';
  END IF;

  -- 5. Update the wave status to COMPLETED
  UPDATE dispatch_waves
     SET response_status = 'COMPLETED',
         responded_at = now()
   WHERE id = v_wave.id;

  -- 6. Update donor: set cooldown, last donation date
  UPDATE donors
     SET cooldown_until = now() + v_cooldown_interval,
         last_donation_date = CURRENT_DATE,
         no_show_count = 0  -- Reset no-show streak on successful donation
   WHERE id = p_donor_id;

  -- 7. Audit log (no sensitive clinical data)
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
    'success', true,
    'message', 'Donation recorded. Donor cooldown set.',
    'cooldown_until', (now() + v_cooldown_interval),
    'cooldown_days', EXTRACT(DAY FROM v_cooldown_interval)
  );
END;
$$;


-- ============================================================================
-- HELPER: Mark No-Show Donors (called by pg_cron or Make.com scheduler)
-- ============================================================================
-- Scans for accepted donors who missed the 45-min arrival deadline.
-- Flips to NO_SHOW, decrements units_accepted, increments no_show_count,
-- and triggers a 1-donor backfill.
-- ============================================================================
CREATE OR REPLACE FUNCTION process_no_shows()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wave RECORD;
  v_count INT := 0;
BEGIN
  FOR v_wave IN
    SELECT dw.*
      FROM dispatch_waves dw
      JOIN requisitions r ON r.id = dw.requisition_id
     WHERE dw.response_status = 'ACCEPTED'
       AND dw.arrival_deadline < now()
       AND r.status = 'VERIFIED_ACTIVE'
       FOR UPDATE OF dw
  LOOP
    -- Mark as no-show
    UPDATE dispatch_waves
       SET response_status = 'NO_SHOW',
           responded_at = now()
     WHERE id = v_wave.id;

    -- Decrement accepted count
    UPDATE requisitions
       SET units_accepted = GREATEST(units_accepted - 1, 0),
           status = 'VERIFIED_ACTIVE'  -- Re-open if was auto-fulfilled
     WHERE id = v_wave.requisition_id;

    -- Increment donor no-show count
    UPDATE donors
       SET no_show_count = no_show_count + 1
     WHERE id = v_wave.donor_id;

    -- Audit
    INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, metadata)
    VALUES (
      'dispatch_wave', v_wave.id, 'DONOR_NO_SHOW', 'SYSTEM',
      jsonb_build_object('donor_id', v_wave.donor_id, 'requisition_id', v_wave.requisition_id)
    );

    -- Backfill with 1 replacement donor
    PERFORM dispatch_donor_wave(v_wave.requisition_id, 1);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;


-- ============================================================================
-- HELPER: Expire stale requisitions past their 12-hour window
-- ============================================================================
CREATE OR REPLACE FUNCTION expire_stale_requisitions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE requisitions
     SET status = 'EXPIRED'
   WHERE status IN ('PENDING_VERIFICATION', 'VERIFIED_ACTIVE')
     AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

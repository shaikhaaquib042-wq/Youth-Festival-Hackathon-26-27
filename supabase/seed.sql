-- ========================================================================
-- SaniTrack - Seed Data for Pune Pilot Area
-- Seed File: supabase/seed.sql
-- Naya Bharat 2047: Problem Statement 3.2
-- ========================================================================

-- 1. Insert Wards
INSERT INTO public.wards (id, ward_number, name, zone, office_address, contact_phone, officer_name, center_latitude, center_longitude)
VALUES
  ('c0a80121-0000-0000-0000-000000000012', 12, 'Shivajinagar - Model Colony', 'Zone 3 (Central)', 'PMC Ward Office, Ghole Road, Shivajinagar, Pune 411005', '+91 20 2550 1200', 'K. Deshmukh', 18.5314, 73.8446),
  ('c0a80121-0000-0000-0000-000000000015', 15, 'Deccan Gymkhana - FC Road', 'Zone 3 (Central)', 'Prabhat Road Sub-Office, Deccan, Pune 411004', '+91 20 2550 1500', 'S. Patil', 18.5196, 73.8415),
  ('c0a80121-0000-0000-0000-000000000019', 19, 'Swargate - Sarasbaug', 'Zone 4 (South)', 'Jedhe Chowk Complex, Swargate, Pune 411042', '+91 20 2444 1900', 'M. Gaikwad', 18.5018, 73.8586),
  ('c0a80121-0000-0000-0000-000000000021', 21, 'Pune Railway Station - Camp', 'Zone 2 (East)', 'Cantonment Board Office, Pune 411001', '+91 20 2612 2100', 'R. Kulkarni', 18.5284, 73.8744),
  ('c0a80121-0000-0000-0000-000000000024', 24, 'Kothrud - Paud Road', 'Zone 5 (West)', 'Kothrud Ward Office, DP Road, Pune 411038', '+91 20 2538 2400', 'V. Shinde', 18.5074, 73.8077)
ON CONFLICT (ward_number) DO NOTHING;

-- 2. Insert Master Toilets
INSERT INTO public.toilets (
  id, facility_code, name, description, address, locality, ward_id,
  latitude, longitude, location, entry_fee, is_public, record_source,
  verification_status, current_status, rating, review_count
) VALUES
  (
    'e0a80001-0000-0000-0000-000000000001',
    'PMC-W15-001',
    'FC Road Smart "She-Toilet" & Hygiene Hub',
    'Specialized high-standard women-only public facility with sanitary pad dispenser, disposal incinerator, well-lit perimeter, and dedicated female caretaker.',
    'Opposite Fergusson College Main Gate, FC Road, Shivajinagar',
    'FC Road, Deccan',
    'c0a80121-0000-0000-0000-000000000015',
    18.5236,
    73.8418,
    ST_SetSRID(ST_MakePoint(73.8418, 18.5236), 4326),
    0.00,
    true,
    'operator',
    'operator_audited',
    'open',
    4.8,
    142
  ),
  (
    'e0a80001-0000-0000-0000-000000000002',
    'PMC-W12-004',
    'Shivajinagar Metro Interchange Public Restroom',
    'Modern subterranean public toilet complex at Shivajinagar multimodal transit hub. Full universal accessibility with touchless sensors.',
    'Gate 2 Concourse, Shivajinagar Metro Station, Ghole Road',
    'Shivajinagar',
    'c0a80121-0000-0000-0000-000000000012',
    18.5312,
    73.8495,
    ST_SetSRID(ST_MakePoint(73.8495, 18.5312), 4326),
    5.00,
    true,
    'official',
    'verified_official',
    'open',
    4.6,
    98
  ),
  (
    'e0a80001-0000-0000-0000-000000000003',
    'PMC-W21-002',
    'Pune Railway Station Circulating Area Restroom',
    'High-capacity 24/7 public facility outside Pune Railway Station Main Porch. Heavily frequented by inter-city train passengers.',
    'Near Booking Office, Station Road, Pune Camp',
    'Pune Station',
    'c0a80121-0000-0000-0000-000000000021',
    18.5289,
    73.8741,
    ST_SetSRID(ST_MakePoint(73.8741, 18.5289), 4326),
    5.00,
    true,
    'official',
    'verified_official',
    'open',
    3.9,
    310
  ),
  (
    'e0a80001-0000-0000-0000-000000000004',
    'PMC-W19-007',
    'Swargate Central MSRTC Bus Stand Restroom',
    'Major transit toilet facility at Swargate bus hub. Currently undergoing plumbing repairs supported by Rotary Community Campaign.',
    'Near Outstation Bus Bay 4, Swargate Bus Stand, Jedhe Chowk',
    'Swargate',
    'c0a80121-0000-0000-0000-000000000019',
    18.5022,
    73.8584,
    ST_SetSRID(ST_MakePoint(73.8584, 18.5022), 4326),
    0.00,
    true,
    'operator',
    'operator_audited',
    'under_maintenance',
    3.2,
    89
  )
ON CONFLICT (facility_code) DO NOTHING;

-- 3. Insert Toilet Facilities
INSERT INTO public.toilet_facilities (
  toilet_id, has_running_water, has_electricity, has_adequate_lighting,
  soap_available, handwash_basin, has_mirror, has_exhaust_fan,
  wheelchair_ramp, grab_bars, wide_doorway, accessible_basin,
  has_caretaker, well_lit_approach, cctv_outside_approach
) VALUES
  ('e0a80001-0000-0000-0000-000000000001', true, true, true, true, true, true, true, true, true, true, true, true, true, true),
  ('e0a80001-0000-0000-0000-000000000002', true, true, true, true, true, true, true, true, true, true, true, true, true, true),
  ('e0a80001-0000-0000-0000-000000000003', true, true, true, true, true, true, true, true, true, true, false, true, true, true),
  ('e0a80001-0000-0000-0000-000000000004', false, true, true, false, true, false, true, false, false, false, false, true, true, false)
ON CONFLICT (toilet_id) DO NOTHING;

-- 4. Insert Sanitary Facilities
INSERT INTO public.sanitary_facilities (
  id, toilet_id, facility_type, availability, payment_type, price_per_pad,
  operational_status, current_stock, verification_source, sponsor_name
) VALUES
  ('f0a80001-0000-0000-0000-000000000001', 'e0a80001-0000-0000-0000-000000000001', 'pad_dispenser', true, 'paid', 5.00, 'operational', 'available', 'Operator Santosh Kadam', 'Rotary Club of Pune Midtown'),
  ('f0a80001-0000-0000-0000-000000000002', 'e0a80001-0000-0000-0000-000000000002', 'pad_dispenser', true, 'paid', 5.00, 'operational', 'available', 'MahaMetro Health Auditor', 'PMC Swachhata Initiative'),
  ('f0a80001-0000-0000-0000-000000000003', 'e0a80001-0000-0000-0000-000000000003', 'pad_dispenser', true, 'paid', 5.00, 'operational', 'low', 'Railway Health Officer', 'Station Sanitation Fund'),
  ('f0a80001-0000-0000-0000-000000000004', 'e0a80001-0000-0000-0000-000000000004', 'pad_dispenser', true, 'paid', 5.00, 'out_of_order', 'out_of_stock', 'Operator Jagtap', 'Community Nominee')
ON CONFLICT (id) DO NOTHING;

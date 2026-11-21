-- ============================================================================
-- BloodLink: Migration 002 — Seed Verified Pune Hospitals
-- ============================================================================
-- 5 major hospitals across the initial rollout zone:
--   Sinhagad Road, Dattawadi, Sadashiv Peth, Deccan, and surrounding clusters
--
-- Coordinates are GEOGRAPHY(Point, 4326) = ST_Point(longitude, latitude)
-- ============================================================================

INSERT INTO verified_hospitals (name, area_label, address, official_bloodbank_phone, location) VALUES

-- 1. Sahyadri Super Speciality Hospital — Deccan Gymkhana
(
  'Sahyadri Super Speciality Hospital, Deccan',
  'Deccan Gymkhana',
  '30-C, Erandwane, Near Kamala Nehru Park, Pune 411004',
  '+912067213333',
  ST_Point(73.8390, 18.5135)::GEOGRAPHY
),

-- 2. Deenanath Mangeshkar Hospital — Erandwane (near Deccan)
(
  'Deenanath Mangeshkar Hospital & Research Centre',
  'Erandwane',
  'Near Mhatre Bridge, Erandwane, Pune 411004',
  '+912040151000',
  ST_Point(73.8338, 18.5074)::GEOGRAPHY
),

-- 3. Bharati Vidyapeeth Medical College & Hospital — Dhankawadi (Sinhagad Road corridor)
(
  'Bharati Hospital & Research Centre',
  'Sinhagad Road',
  'Pune-Satara Road, Dhankawadi, Pune 411043',
  '+912024373311',
  ST_Point(73.8378, 18.4648)::GEOGRAPHY
),

-- 4. Sassoon General Hospital — Sassoon Road (Central Pune / Sadashiv Peth adjacent)
(
  'Sassoon General Hospital',
  'Sadashiv Peth',
  'Dr. Ambedkar Road, Near Pune Station, Pune 411001',
  '+912026128000',
  ST_Point(73.8757, 18.5280)::GEOGRAPHY
),

-- 5. Jehangir Hospital — Sassoon Road / Central Pune
(
  'Jehangir Hospital',
  'Sangamvadi',
  '32, Sassoon Road, Sangamvadi, Pune 411001',
  '+912026053600',
  ST_Point(73.8780, 18.5330)::GEOGRAPHY
);

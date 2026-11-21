-- Synthetic illustrative Pune records; not real or verified facilities.
INSERT INTO safe_zones (id,name,category,latitude,longitude,address,water_available,shade_available,seating_available,opening_hours,verification_status,availability_status,last_verified_at)
VALUES
('a1000000-0000-4000-8000-000000000001','Demo Water Point 1','DRINKING_WATER',18.5204,73.8567,'Synthetic demo location, Pune',true,false,false,NULL,'DEMO','UNKNOWN',NULL),
('a1000000-0000-4000-8000-000000000002','Demo Shaded Rest Point','SHADED_REST_AREA',18.5240,73.8510,'Synthetic demo location, Pune',false,true,true,NULL,'DEMO','UNKNOWN',NULL),
('a1000000-0000-4000-8000-000000000003','Demo Cooling Centre','COOLING_CENTER',18.5150,73.8600,'Synthetic demo location, Pune',true,true,true,NULL,'DEMO','UNKNOWN',NULL)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,latitude=EXCLUDED.latitude,
longitude=EXCLUDED.longitude,address=EXCLUDED.address,water_available=EXCLUDED.water_available,
shade_available=EXCLUDED.shade_available,seating_available=EXCLUDED.seating_available,
opening_hours=EXCLUDED.opening_hours,verification_status='DEMO',availability_status='UNKNOWN',last_verified_at=NULL;

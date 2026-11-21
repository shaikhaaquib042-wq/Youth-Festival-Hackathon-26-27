import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { profile, weather } from './fixtures.js';

const zone = { id: 'a1000000-0000-4000-8000-000000000001', name: 'Explicit test fixture', category: 'DRINKING_WATER' as const, latitude: 18.52, longitude: 73.85, address: 'Fixture only', waterAvailable: true, shadeAvailable: false, seatingAvailable: false, openingHours: null, verificationStatus: 'PENDING' as const, availabilityStatus: 'UNKNOWN' as const, lastVerifiedAt: null, createdAt: new Date(), updatedAt: new Date() };
function services() {
  return {
    searchSafeZones: vi.fn(async () => [{ ...zone, distanceKm: 0.3 }]),
    getSafeZone: vi.fn(async () => zone),
    submitSafeZone: vi.fn(async () => zone),
    createSafeZoneReport: vi.fn(async () => ({ id: zone.id, safeZoneId: zone.id, availabilityStatus: 'UNKNOWN' as const, comment: null, reporterTokenHash: null, createdAt: new Date() })),
  };
}
describe('single-app Safe Zone composition', () => {
  it('preserves the shared API rate-limit response and request ID semantics', async () => {
    const app = createApp();
    for (let index = 0; index < 120; index++) await request(app).get('/api/v1/health').expect(200);
    const response = await request(app).get('/api/v1/health').expect(429);
    expect(response.body.error.code).toBe('RATE_LIMITED');
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
    expect(response.headers['retry-after']).toBeTruthy();
  });
  it('mounts validated discovery/detail beneath the existing API prefix', async () => {
    const safeZoneServices = services();
    const app = createApp({ safeZoneServices });
    const response = await request(app).get('/api/v1/safe-zones?latitude=18.52&longitude=73.85').expect(200);
    expect(response.body.distanceMethod).toBe('STRAIGHT_LINE');
    expect(response.body.facilities[0].verificationStatus).toBe('PENDING');
    expect(safeZoneServices.searchSafeZones).toHaveBeenCalledWith(expect.objectContaining({ includeDemo: false }));
    await request(app).get(`/api/v1/safe-zones/${zone.id}`).expect(200);
  });
  it('rejects malformed coordinates and ids before database work', async () => {
    const safeZoneServices = services();
    const app = createApp({ safeZoneServices });
    await request(app).get('/api/v1/safe-zones?latitude=91&longitude=0').expect(422);
    await request(app).get('/api/v1/safe-zones/invalid').expect(422);
    expect(safeZoneServices.searchSafeZones).not.toHaveBeenCalled();
    expect(safeZoneServices.getSafeZone).not.toHaveBeenCalled();
  });
  it('isolates sanitized database failure from health, weather and HeatLab', async () => {
    const safeZoneServices = services();
    safeZoneServices.searchSafeZones.mockRejectedValue(new Error('private connection credential'));
    const app = createApp({ safeZoneServices, weatherProvider: { getWeather: async () => weather() } });
    const result = await request(app).get('/api/v1/safe-zones?latitude=0&longitude=0').expect(503);
    expect(result.body.error.code).toBe('SAFE_ZONES_UNAVAILABLE');
    expect(JSON.stringify(result.body)).not.toContain('credential');
    expect(result.body.error.requestId).toBe(result.headers['x-request-id']);
    await request(app).get('/api/v1/health').expect(200);
    await request(app).get('/api/v1/weather?latitude=0&longitude=0').expect(200);
    await request(app).post('/api/v1/simulation/evaluate').send({ profile, weatherOverride: { temperatureC: 35, humidityPercent: 50, windSpeedKmh: 5 } }).expect(200);
  });
  it('keeps both community writes disabled without explicit configuration', async () => {
    const safeZoneServices = services();
    const app = createApp({ safeZoneServices, communityWritesEnabled: false });
    await request(app).post('/api/v1/safe-zones').send({}).expect(503);
    await request(app).post(`/api/v1/safe-zones/${zone.id}/reports`).send({}).expect(503);
    expect(safeZoneServices.submitSafeZone).not.toHaveBeenCalled();
    expect(safeZoneServices.createSafeZoneReport).not.toHaveBeenCalled();
  });
  it('shares a bounded community-write limiter and forbids verification assignment', async () => {
    const safeZoneServices = services();
    const app = createApp({ safeZoneServices, communityWritesEnabled: true });
    await request(app).post('/api/v1/safe-zones').send({ ...zone, verificationStatus: 'VERIFIED' }).expect(422);
    const input = { name: zone.name, category: zone.category, latitude: zone.latitude, longitude: zone.longitude, address: zone.address };
    const response = await request(app).post('/api/v1/safe-zones').send(input).expect(201);
    expect(response.body.verificationStatus).toBe('PENDING');
    for (let index = 0; index < 8; index++) await request(app).post(`/api/v1/safe-zones/${zone.id}/reports`).send({ availabilityStatus: 'UNKNOWN' }).expect(201);
    const limited = await request(app).post('/api/v1/safe-zones').send(input).expect(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    expect(limited.headers['retry-after']).toBeTruthy();
  });
});

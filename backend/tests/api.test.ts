import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { assessmentResponseSchema } from '../src/schemas/shared.schema.js';
import { protectionPlanSchema } from '../src/schemas/protection.schema.js';
import { now, profile, weather } from './fixtures.js';

const scenario = { profile, weatherOverride: { temperatureC: 42, humidityPercent: 65, windSpeedKmh: 5 } };

describe('business API integration', () => {
  it('validates assessment and planner responses and passes coordinates to the provider', async () => {
    const getWeather = vi.fn(async () => weather());
    const app = createApp({ weatherProvider: { getWeather }, now: () => now });
    const heat = await request(app).post('/api/v1/heat/assess').send({ profile }).expect(200);
    expect(assessmentResponseSchema.safeParse(heat.body).success).toBe(true);
    expect(getWeather).toHaveBeenCalledWith(18.5204, 73.8567);
    const plan = await request(app).post('/api/v1/protection/plan').send({ profile }).expect(200);
    expect(protectionPlanSchema.safeParse(plan.body).success).toBe(true);
    expect(plan.body.timeline).toHaveLength(9);
  });
  it('returns UNKNOWN for missing weather from an integrated provider', async () => {
    const app = createApp({ weatherProvider: { getWeather: async () => ({ ...weather(), current: null }) }, now: () => now });
    const response = await request(app).post('/api/v1/heat/assess').send({ profile }).expect(200);
    expect(response.body.assessment.advisoryLevel).toBe('UNKNOWN');
  });
  it('runs simulation without a provider or database', async () => {
    const response = await request(createApp({ now: () => now })).post('/api/v1/simulation/evaluate').send(scenario).expect(200);
    expect(response.body.dataMode).toBe('SIMULATION');
    expect(response.body.assessment.advisoryLevel).toBe('CRITICAL');
  });
  it('keeps scenarios independent and does not call or mutate live weather', async () => {
    const liveWeather = weather();
    const snapshot = structuredClone(liveWeather);
    const getWeather = vi.fn(async () => liveWeather);
    const app = createApp({ weatherProvider: { getWeather }, now: () => now });
    const first = await request(app).post('/api/v1/simulation/evaluate').send(scenario).expect(200);
    await request(app).post('/api/v1/simulation/evaluate').send({ ...scenario, weatherOverride: { temperatureC: 20, humidityPercent: 40, windSpeedKmh: 10 } }).expect(200);
    const repeat = await request(app).post('/api/v1/simulation/evaluate').send(scenario).expect(200);
    expect(repeat.body).toEqual(first.body);
    expect(getWeather).not.toHaveBeenCalled();
    expect(liveWeather).toEqual(snapshot);
  });
  it('does not silently fall back to simulation for missing or failing providers', async () => {
    await request(createApp()).post('/api/v1/heat/assess').send({ profile }).expect(503);
    const app = createApp({ weatherProvider: { getWeather: async () => { throw new Error('DATABASE_SECRET'); } } });
    const response = await request(app).post('/api/v1/protection/plan').send({ profile }).expect(503);
    expect(JSON.stringify(response.body)).not.toContain('DATABASE_SECRET');
    expect(response.body.error.requestId).toBeTruthy();
  });
  it('rejects simulated data from a live provider', async () => {
    const app = createApp({ weatherProvider: { getWeather: async () => ({ ...weather(), dataMode: 'SIMULATION' }) } });
    await request(app).post('/api/v1/heat/assess').send({ profile }).expect(503);
  });
  it.each(['/heat/assess', '/protection/plan', '/simulation/evaluate'])('rejects incomplete profiles at %s', async path => {
    const response = await request(createApp()).post(`/api/v1${path}`).send({ profile: {} }).expect(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toContain('profile.occupation');
  });
  it('rejects invalid scenarios before invoking the provider', async () => {
    const getWeather = vi.fn(async () => weather());
    const app = createApp({ weatherProvider: { getWeather } });
    await request(app).post('/api/v1/simulation/evaluate').send({ ...scenario, weatherOverride: { ...scenario.weatherOverride, humidityPercent: 101 } }).expect(422);
    expect(getWeather).not.toHaveBeenCalled();
  });
  it('limits body size and returns a standardized error', async () => {
    const response = await request(createApp()).post('/api/v1/heat/assess').send({ text: 'x'.repeat(40_000) }).expect(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
  it('restricts CORS to the configured frontend', async () => {
    const app = createApp();
    const allowed = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const denied = await request(app).get('/api/v1/health').set('Origin', 'https://example.invalid');
    expect(denied.headers['access-control-allow-origin']).not.toBe('https://example.invalid');
  });
  it('serves schemas for each implemented endpoint', async () => {
    const app = createApp();
    const response = await request(app).get('/openapi.json').expect(200);
    expect(response.body.openapi).toBe('3.1.0');
    expect(Object.keys(response.body.paths)).toEqual(['/api/v1/health', '/api/v1/heat/assess', '/api/v1/protection/plan', '/api/v1/simulation/evaluate', '/api/v1/weather', '/api/v1/safe-zones', '/api/v1/safe-zones/{id}', '/api/v1/safe-zones/{id}/reports']);
    await request(app).get('/docs/').expect(200);
  });
});

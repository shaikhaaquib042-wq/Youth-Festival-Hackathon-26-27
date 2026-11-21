import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';

describe('application foundation', () => {
  const app = createApp();
  it('reports health without a database', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);
    expect(response.body).toEqual({ status: 'UP', application: 'SunShield', version: '1.0.0' });
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
  it('standardizes unknown routes and invalid JSON', async () => {
    const missing = await request(app).get('/missing').expect(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
    const invalid = await request(app).post('/api/v1/heat/assess').set('Content-Type', 'application/json').send('{').expect(400);
    expect(invalid.body.error.code).toBe('INVALID_JSON');
    expect(invalid.body.error.requestId).toBe(invalid.headers['x-request-id']);
  });
  it('validates configuration without exposing values', () => {
    expect(parseEnv({}).PORT).toBe(8000);
    expect(() => parseEnv({ PORT: 'secret' })).toThrow('PORT');
    expect(() => parseEnv({ PORT: 'secret' })).not.toThrow('secret');
    expect(() => parseEnv({ WEATHER_CACHE_TTL_SECONDS: '3601' })).toThrow('WEATHER_CACHE_TTL_SECONDS');
    expect(parseEnv({ WEATHER_CACHE_TTL_SECONDS: '3600', COMMUNITY_WRITES_ENABLED: 'false' }).COMMUNITY_WRITES_ENABLED).toBe(false);
  });
});

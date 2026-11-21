import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { weather } from './fixtures.js';

describe('weather API composition', () => {
  it('passes validated coordinates and retains CACHED metadata', async () => {
    const value = { ...weather(), dataMode: 'CACHED' as const };
    const getWeather = vi.fn(async () => value);
    const response = await request(createApp({ weatherProvider: { getWeather } }))
      .get('/api/v1/weather?latitude=18.5204&longitude=73.8567').expect(200);
    expect(getWeather).toHaveBeenCalledWith(18.5204, 73.8567);
    expect(response.body).toEqual(value);
    const missing = { ...weather(), current: null, hourly: [] };
    const nullable = await request(createApp({ weatherProvider: { getWeather: async () => missing } }))
      .get('/api/v1/weather?latitude=0&longitude=0').expect(200);
    expect(nullable.body.current).toBeNull();
    expect(nullable.body.hourly).toEqual([]);
  });
  it.each(['', '?latitude=&longitude=0', '?latitude=91&longitude=0', '?latitude=0&longitude=Infinity', '?latitude=0&longitude=0&extra=1', '?latitude=0&latitude=1&longitude=0'])('rejects malformed query %s before fetching', async query => {
    const getWeather = vi.fn(async () => weather());
    await request(createApp({ weatherProvider: { getWeather } })).get(`/api/v1/weather${query}`).expect(422);
    expect(getWeather).not.toHaveBeenCalled();
  });
  it('keeps absent and failing providers sanitized without blocking health/HeatLab', async () => {
    await request(createApp()).get('/api/v1/weather?latitude=0&longitude=0').expect(503);
    const getWeather = vi.fn(async () => { throw new Error('upstream private detail'); });
    const app = createApp({ weatherProvider: { getWeather } });
    const response = await request(app).get('/api/v1/weather?latitude=0&longitude=0').expect(503);
    expect(response.body.error.code).toBe('WEATHER_UNAVAILABLE');
    expect(JSON.stringify(response.body)).not.toContain('private detail');
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
    await request(app).get('/api/v1/health').expect(200);
    expect(getWeather).toHaveBeenCalledTimes(1);
  });
  it('rejects simulated provider output on the real-weather endpoint', async () => {
    await request(createApp({ weatherProvider: { getWeather: async () => ({ ...weather(), dataMode: 'SIMULATION' }) } }))
      .get('/api/v1/weather?latitude=0&longitude=0').expect(503);
  });
});

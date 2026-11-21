import { describe, expect, it, vi } from 'vitest';
import { weatherResponseSchema } from '../src/schemas/shared.schema.js';
import { createOpenMeteoWeatherProvider } from '../src/services/open-meteo-weather.provider.js';

const currentEpoch = Date.parse('2026-11-21T08:00:00.000Z') / 1_000;
const responseBody = {
  timezone: 'Asia/Kolkata',
  current: {
    time: currentEpoch,
    temperature_2m: 32.4,
    relative_humidity_2m: 48,
    apparent_temperature: null,
    wind_speed_10m: 0,
  },
  hourly: {
    time: [currentEpoch, currentEpoch + 3_600, currentEpoch + 7_200],
    temperature_2m: [32.4, 33, null],
    relative_humidity_2m: [48, 46, 44],
    apparent_temperature: [null, 35, 47],
    wind_speed_10m: [0, 8, 10],
  },
};

function jsonFetch(body: unknown, status = 200): typeof fetch {
  return async () => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Open-Meteo WeatherProvider', () => {
  it('normalizes current and hourly weather and validates the shared response schema', async () => {
    const provider = createOpenMeteoWeatherProvider({
      fetch: jsonFetch(responseBody),
      now: () => new Date('2026-11-21T08:02:00.000Z'),
    });
    const result = await provider.getWeather(18.5204, 73.8567);

    expect(weatherResponseSchema.safeParse(result).success).toBe(true);
    expect(result).toMatchObject({
      dataMode: 'LIVE',
      source: 'Open-Meteo Forecast API',
      timezone: 'Asia/Kolkata',
      fetchedAt: '2026-11-21T08:02:00.000Z',
      current: {
        temperatureC: 32.4,
        humidityPercent: 48,
        apparentTemperatureC: null,
        windSpeedKmh: 0,
        observedAt: '2026-11-21T13:30:00.000+05:30',
      },
    });
    expect(result.hourly).toHaveLength(2);
    expect(result.hourly[0]).toMatchObject({
      time: '2026-11-21T13:30:00.000+05:30',
      apparentTemperatureC: null,
      windSpeedKmh: 0,
    });
    expect(result.hourly[1]?.time).toBe('2026-11-21T14:30:00.000+05:30');
  });

  it('requests Celsius, km/h, current values, hourly values and timezone-aware Unix timestamps', async () => {
    let requestedUrl: URL | undefined;
    const fetch: typeof globalThis.fetch = async (input) => {
      requestedUrl = new URL(String(input));
      return new Response(JSON.stringify(responseBody), { status: 200 });
    };
    const provider = createOpenMeteoWeatherProvider({ fetch });
    await provider.getWeather(18.5204, 73.8567);

    expect(requestedUrl?.pathname).toBe('/v1/forecast');
    expect(requestedUrl?.searchParams.get('timezone')).toBe('auto');
    expect(requestedUrl?.searchParams.get('timeformat')).toBe('unixtime');
    expect(requestedUrl?.searchParams.get('temperature_unit')).toBe('celsius');
    expect(requestedUrl?.searchParams.get('wind_speed_unit')).toBe('kmh');
    expect(requestedUrl?.searchParams.get('current')).toContain('relative_humidity_2m');
    expect(requestedUrl?.searchParams.get('hourly')).toContain('apparent_temperature');
  });

  it('returns a CACHED response with original freshness timestamps until the location TTL expires', async () => {
    let currentTime = new Date('2026-11-21T08:02:00.000Z');
    const fetch = vi.fn(jsonFetch(responseBody));
    const provider = createOpenMeteoWeatherProvider({
      fetch,
      now: () => currentTime,
      cacheTtlMs: 1_000,
    });

    const live = await provider.getWeather(18.5204, 73.8567);
    currentTime = new Date('2026-11-21T08:02:00.999Z');
    const cached = await provider.getWeather(18.5204, 73.8567);
    expect(cached.dataMode).toBe('CACHED');
    expect(cached.fetchedAt).toBe(live.fetchedAt);
    expect(cached.current?.observedAt).toBe(live.current?.observedAt);
    expect(fetch).toHaveBeenCalledOnce();

    currentTime = new Date('2026-11-21T08:02:01.000Z');
    const refreshed = await provider.getWeather(18.5204, 73.8567);
    expect(refreshed.dataMode).toBe('LIVE');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('bounds a request even when a fetch implementation does not settle on abort', async () => {
    const fetch: typeof globalThis.fetch = () => new Promise<Response>(() => undefined);
    const provider = createOpenMeteoWeatherProvider({ fetch, timeoutMs: 20 });

    await expect(provider.getWeather(18.5204, 73.8567)).rejects.toThrow('timed out');
  });

  it('propagates upstream HTTP and malformed payload failures without synthetic weather', async () => {
    const unavailable = createOpenMeteoWeatherProvider({ fetch: jsonFetch({ reason: 'offline' }, 503) });
    await expect(unavailable.getWeather(18.5204, 73.8567)).rejects.toThrow('HTTP 503');

    const malformed = createOpenMeteoWeatherProvider({ fetch: jsonFetch({ timezone: 'not-a-timezone' }) });
    await expect(malformed.getWeather(18.5204, 73.8567)).rejects.toThrow('invalid timezone');
  });

  it('keeps independently requested locations in separate cache entries', async () => {
    const fetch = vi.fn(jsonFetch(responseBody));
    const provider = createOpenMeteoWeatherProvider({ fetch });
    await provider.getWeather(18.5204, 73.8567);
    await provider.getWeather(19.076, 72.8777);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

import { DateTime, IANAZone } from 'luxon';
import { weatherResponseSchema } from '../schemas/shared.schema.js';
import type { WeatherProvider, WeatherResponse } from '../types/index.js';

const DEFAULT_BASE_URL = 'https://api.open-meteo.com/v1';
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_CACHE_TTL_SECONDS = 600;
const MAX_CACHE_TTL_SECONDS = 3_600;
const DEFAULT_MAX_CACHE_ENTRIES = 500;
const EARTH_METRIC_BOUNDS = {
  temperatureC: [-90, 65],
  humidityPercent: [0, 100],
  apparentTemperatureC: [-120, 100],
  windSpeedKmh: [0, 500],
} as const;

type JsonObject = Record<string, unknown>;
type TimeSeries = {
  time?: unknown[];
  temperature_2m?: unknown[];
  relative_humidity_2m?: unknown[];
  apparent_temperature?: unknown[];
  wind_speed_10m?: unknown[];
};

type CacheEntry = {
  fetchedAtMs: number;
  response: WeatherResponse;
};

export type OpenMeteoWeatherProviderOptions = {
  /** Test seam. Production uses the global fetch implementation. */
  fetch?: typeof fetch;
  /** Test seam. Production uses the current system time. */
  now?: () => Date;
  /** Request timeout in milliseconds. Production default is five seconds. */
  timeoutMs?: number;
  /** Cache lifetime in milliseconds. Defaults to WEATHER_CACHE_TTL_SECONDS or ten minutes. */
  cacheTtlMs?: number;
  /** Upper bound for the in-memory location cache. */
  maxCacheEntries?: number;
  /** Defaults to OPEN_METEO_BASE_URL or https://api.open-meteo.com/v1. */
  baseUrl?: string;
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asSeries(value: unknown): TimeSeries | null {
  return isObject(value) ? value as TimeSeries : null;
}

function metric(value: unknown, bounds: readonly [number, number]): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= bounds[0] && value <= bounds[1]
    ? value
    : null;
}

function epochToIso(value: unknown, timezone: string): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const dateTime = DateTime.fromSeconds(value, { zone: timezone });
  return dateTime.isValid ? dateTime.toISO({ includeOffset: true }) : null;
}

function readCacheTtlMs(): number {
  const value = process.env.WEATHER_CACHE_TTL_SECONDS;
  if (value === undefined || value.trim() === '') return DEFAULT_CACHE_TTL_SECONDS * 1_000;
  const seconds = Number(value);
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > MAX_CACHE_TTL_SECONDS) {
    throw new Error(`WEATHER_CACHE_TTL_SECONDS must be an integer from 1 to ${MAX_CACHE_TTL_SECONDS}`);
  }
  return seconds * 1_000;
}

function validateCoordinates(latitude: number, longitude: number): void {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RangeError('latitude must be between -90 and 90');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError('longitude must be between -180 and 180');
  }
}

function cacheKey(latitude: number, longitude: number): string {
  // Open-Meteo selects weather grid cells several kilometres wide. Four decimal
  // places coalesce requests for the same neighbourhood without broad caching.
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

function createRequestUrl(baseUrl: string, latitude: number, longitude: number): URL {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:') throw new Error('Open-Meteo base URL must use HTTPS');
  base.pathname = `${base.pathname.replace(/\/+$/, '')}/forecast`;
  base.search = '';
  base.hash = '';

  for (const [key, value] of Object.entries({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m',
    hourly: 'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
    timeformat: 'unixtime',
    forecast_days: '2',
  })) base.searchParams.set(key, value);
  return base;
}

function normalizeWeather(payload: unknown, fetchedAt: Date): WeatherResponse {
  if (!isObject(payload)) throw new Error('Open-Meteo returned an invalid response');
  const timezone = payload.timezone;
  if (typeof timezone !== 'string' || !IANAZone.isValidZone(timezone)) {
    throw new Error('Open-Meteo returned an invalid timezone');
  }

  const currentSeries = asSeries(payload.current);
  let current: WeatherResponse['current'] = null;
  if (currentSeries) {
    const observedAt = epochToIso(currentSeries.time, timezone);
    const temperatureC = metric(currentSeries.temperature_2m, EARTH_METRIC_BOUNDS.temperatureC);
    const humidityPercent = metric(currentSeries.relative_humidity_2m, EARTH_METRIC_BOUNDS.humidityPercent);
    if (observedAt && temperatureC !== null && humidityPercent !== null) {
      current = {
        temperatureC,
        humidityPercent,
        apparentTemperatureC: metric(currentSeries.apparent_temperature, EARTH_METRIC_BOUNDS.apparentTemperatureC),
        windSpeedKmh: metric(currentSeries.wind_speed_10m, EARTH_METRIC_BOUNDS.windSpeedKmh),
        observedAt,
      };
    }
  }

  const hourlySeries = asSeries(payload.hourly);
  const times = hourlySeries?.time;
  const hourly: WeatherResponse['hourly'] = [];
  if (hourlySeries && Array.isArray(times)) {
    for (let index = 0; index < times.length; index += 1) {
      const time = epochToIso(times[index], timezone);
      const temperatureC = metric(hourlySeries.temperature_2m?.[index], EARTH_METRIC_BOUNDS.temperatureC);
      const humidityPercent = metric(hourlySeries.relative_humidity_2m?.[index], EARTH_METRIC_BOUNDS.humidityPercent);
      // These two metrics are required by the shared hourly contract. Omit an
      // incomplete period instead of filling it with a synthetic estimate.
      if (!time || temperatureC === null || humidityPercent === null) continue;
      hourly.push({
        time,
        temperatureC,
        humidityPercent,
        apparentTemperatureC: metric(hourlySeries.apparent_temperature?.[index], EARTH_METRIC_BOUNDS.apparentTemperatureC),
        windSpeedKmh: metric(hourlySeries.wind_speed_10m?.[index], EARTH_METRIC_BOUNDS.windSpeedKmh),
      });
    }
  }

  return weatherResponseSchema.parse({
    dataMode: 'LIVE',
    source: 'Open-Meteo Forecast API',
    timezone,
    fetchedAt: fetchedAt.toISOString(),
    current,
    hourly,
  });
}

async function fetchJsonWithTimeout(fetchImpl: typeof fetch, url: URL, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const request = (async () => {
    const response = await fetchImpl(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Open-Meteo request failed with HTTP ${response.status}`);
    return response.json() as Promise<unknown>;
  })();
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error('Open-Meteo request timed out'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([request, deadline]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

/**
 * Creates the production WeatherProvider for the finalized shared contract.
 * It requests Open-Meteo's current and hourly Celsius/km/h values, converts
 * Unix timestamps in the returned IANA timezone, validates every response
 * with weatherResponseSchema, and caches successful responses by location.
 * Cache hits are marked CACHED while retaining the original fetchedAt and
 * current.observedAt. Upstream errors reject; no fallback weather is created.
 */
export function createOpenMeteoWeatherProvider(
  options: OpenMeteoWeatherProviderOptions = {},
): WeatherProvider {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const now = options.now ?? (() => new Date());
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cacheTtlMs = options.cacheTtlMs ?? readCacheTtlMs();
  const maxCacheEntries = options.maxCacheEntries ?? DEFAULT_MAX_CACHE_ENTRIES;
  const baseUrl = options.baseUrl ?? process.env.OPEN_METEO_BASE_URL ?? DEFAULT_BASE_URL;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    throw new RangeError('timeoutMs must be between 1 and 30000');
  }
  if (!Number.isFinite(cacheTtlMs) || cacheTtlMs < 1 || cacheTtlMs > MAX_CACHE_TTL_SECONDS * 1_000) {
    throw new RangeError(`cacheTtlMs must be between 1 and ${MAX_CACHE_TTL_SECONDS * 1_000}`);
  }
  if (!Number.isInteger(maxCacheEntries) || maxCacheEntries < 1) {
    throw new RangeError('maxCacheEntries must be a positive integer');
  }
  if (typeof fetchImpl !== 'function') throw new Error('A Fetch API implementation is required');
  // Validate configuration at initialization, before a request is handled.
  const validatedBaseUrl = new URL(baseUrl);
  if (validatedBaseUrl.protocol !== 'https:') throw new Error('Open-Meteo base URL must use HTTPS');

  const cache = new Map<string, CacheEntry>();

  return {
    async getWeather(latitude, longitude) {
      validateCoordinates(latitude, longitude);
      const key = cacheKey(latitude, longitude);
      const checkedAt = now().getTime();
      const cached = cache.get(key);
      if (cached) {
        const ageMs = checkedAt - cached.fetchedAtMs;
        if (ageMs >= 0 && ageMs < cacheTtlMs) {
          cache.delete(key);
          cache.set(key, cached);
          return weatherResponseSchema.parse({ ...cached.response, dataMode: 'CACHED' });
        }
        cache.delete(key);
      }

      const payload = await fetchJsonWithTimeout(
        fetchImpl,
        createRequestUrl(baseUrl, latitude, longitude),
        timeoutMs,
      );
      const fetchedAt = now();
      const response = normalizeWeather(payload, fetchedAt);
      cache.set(key, { fetchedAtMs: fetchedAt.getTime(), response });
      while (cache.size > maxCacheEntries) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey === undefined) break;
        cache.delete(oldestKey);
      }
      return response;
    },
  };
}

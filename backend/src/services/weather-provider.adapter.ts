import type { WeatherProvider, WeatherResponse } from '../types/index.js';
import { weatherResponseSchema } from '../schemas/shared.schema.js';
import { ApiException } from '../middleware/error.middleware.js';

export async function requestWeather(provider: WeatherProvider | undefined, latitude: number, longitude: number): Promise<WeatherResponse> {
  if (!provider) throw new ApiException(503, 'WEATHER_PROVIDER_UNAVAILABLE', 'Live weather provider has not been integrated');
  let weather: WeatherResponse;
  try { weather = await provider.getWeather(latitude, longitude); }
  catch { throw new ApiException(503, 'WEATHER_UNAVAILABLE', 'Weather is temporarily unavailable'); }
  // Validate metadata here; the engine handles missing/invalid observations as UNKNOWN.
  const metadata = weatherResponseSchema.omit({ current: true, hourly: true }).safeParse(
    weather && { dataMode: weather.dataMode, source: weather.source, timezone: weather.timezone, fetchedAt: weather.fetchedAt },
  );
  if (!metadata.success || weather.dataMode === 'SIMULATION') {
    throw new ApiException(503, 'INVALID_WEATHER_RESPONSE', 'Weather provider returned unusable metadata');
  }
  return weather;
}

import type { AssessmentResponse, CurrentWeather, WorkerProfile, WeatherResponse } from '../types/index.js';
import { currentWeatherSchema, dataModeSchema } from '../schemas/shared.schema.js';
import { BASE_LIMITATIONS, HEAT_RULES } from '../constants/heat-rules.js';
import { environmentalAssessment } from './environmental-assessment.service.js';
import { occupationalAssessment } from './occupational-assessment.service.js';
import { recommendations } from './recommendation.service.js';

export interface EngineContext { now: Date; forecast?: boolean }
export function assessHeat(profile: WorkerProfile, weather: WeatherResponse | null, context: EngineContext): AssessmentResponse {
  const { now, forecast = false } = context;
  const mode = dataModeSchema.safeParse(weather?.dataMode);
  const dataMode = mode.success ? mode.data : 'CACHED';
  const limitations = [...BASE_LIMITATIONS];
  const parsed = currentWeatherSchema.safeParse(weather?.current);
  const fetched = weather?.fetchedAt ? Date.parse(weather.fetchedAt) : NaN;
  let current: CurrentWeather | null = parsed.success ? parsed.data : null;
  const observed = current ? Date.parse(current.observedAt) : NaN;
  let reason: string | null = null;
  if (!current) reason = 'MISSING_OR_INVALID_WEATHER';
  else if (!mode.success || typeof weather?.source !== 'string' || !weather.source.trim() || !Number.isFinite(fetched)) reason = 'INVALID_WEATHER_METADATA';
  else if (fetched - now.getTime() > HEAT_RULES.maxFutureObservationMs) reason = 'FUTURE_FETCH_TIMESTAMP';
  else if (forecast) {
    if (now.getTime() - fetched > HEAT_RULES.maxForecastFetchAgeMs) reason = 'STALE_FORECAST';
    else if (observed > now.getTime() + HEAT_RULES.maxForecastHorizonMs || observed < now.getTime() - 24 * 60 * 60_000) reason = 'FORECAST_OUTSIDE_HORIZON';
  } else if (dataMode !== 'SIMULATION') {
    if (now.getTime() - observed > HEAT_RULES.maxObservationAgeMs || now.getTime() - fetched > HEAT_RULES.maxObservationAgeMs) reason = 'STALE_WEATHER';
    else if (observed - now.getTime() > HEAT_RULES.maxFutureObservationMs) reason = 'FUTURE_OBSERVATION';
  }
  if (reason) { limitations.push(reason); current = null; }
  if (dataMode === 'CACHED') limitations.push('CACHED_WEATHER');
  if (dataMode === 'SIMULATION') limitations.push('SIMULATED_CONDITIONS');
  if (forecast) limitations.push('FORECAST_ESTIMATE');
  const indicators = current ? environmentalAssessment(current) : {
    temperatureC: null, humidityPercent: null, apparentTemperatureC: null, windSpeedKmh: null,
    heatIndexC: null, heatIndexMethod: 'NOT_APPLICABLE' as const, environmentalAdvisoryLevel: 'UNKNOWN' as const,
  };
  if (current && indicators.heatIndexC === null) limitations.push('HEAT_INDEX_OUTSIDE_REPORTING_ENVELOPE');
  const occupational = occupationalAssessment(profile, indicators.environmentalAdvisoryLevel, indicators.temperatureC);
  return { dataMode, assessment: {
    advisoryLevel: occupational.advisoryLevel, engineVersion: HEAT_RULES.engineVersion,
    factors: occupational.factors, recommendations: recommendations(profile, occupational.advisoryLevel),
    medicalValidation: false, disclaimerCode: 'ESTIMATED_ADVISORY_ONLY',
    environmentalIndicators: indicators, limitations,
    source: typeof weather?.source === 'string' ? weather.source : null,
    observedAt: parsed.success ? parsed.data.observedAt : null,
    fetchedAt: Number.isFinite(fetched) ? weather!.fetchedAt : null,
    assessedAt: now.toISOString(),
  } };
}

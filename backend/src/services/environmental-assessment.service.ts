import type { AdvisoryLevel, CurrentWeather, HeatAssessment } from '../types/index.js';
import { HEAT_RULES } from '../constants/heat-rules.js';
import { heatIndexC } from '../utils/heat-index.js';

export function environmentalAssessment(current: CurrentWeather): HeatAssessment['environmentalIndicators'] {
  const hi = heatIndexC(current.temperatureC, current.humidityPercent);
  // Provider apparent temperature is separate; no cooling indicator can lower raw temperature concerns.
  const indicator = Math.max(current.temperatureC, hi ?? -Infinity, current.apparentTemperatureC ?? -Infinity);
  let level: AdvisoryLevel = 'CAUTION';
  if (indicator >= HEAT_RULES.elevatedC) level = 'ELEVATED';
  if (indicator >= HEAT_RULES.highC) level = 'HIGH';
  if (indicator >= HEAT_RULES.criticalC || current.temperatureC >= HEAT_RULES.extremeAirTemperatureC) level = 'CRITICAL';
  if ((current.temperatureC >= HEAT_RULES.humidCriticalC && current.humidityPercent >= HEAT_RULES.humidCriticalPercent) ||
      (current.temperatureC >= HEAT_RULES.hotHumidCriticalC && current.humidityPercent >= HEAT_RULES.hotHumidCriticalPercent)) level = 'CRITICAL';
  return {
    temperatureC: current.temperatureC, humidityPercent: current.humidityPercent,
    apparentTemperatureC: current.apparentTemperatureC ?? null,
    windSpeedKmh: current.windSpeedKmh ?? null,
    heatIndexC: hi === null ? null : Math.round(hi * 100) / 100,
    heatIndexMethod: hi === null ? 'NOT_APPLICABLE' : 'NWS_ROTHFUSZ',
    environmentalAdvisoryLevel: level,
  };
}

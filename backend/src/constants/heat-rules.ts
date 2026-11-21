// All thresholds below are prototype product rules, NOT validated occupational limits.
export const HEAT_RULES = {
  engineVersion: '1.0.0-prototype' as const,
  maxObservationAgeMs: 60 * 60_000,
  maxFutureObservationMs: 5 * 60_000,
  maxForecastFetchAgeMs: 3 * 60 * 60_000,
  maxForecastHorizonMs: 48 * 60 * 60_000,
  // Product labels, not official NWS risk categories.
  elevatedC: 32, highC: 39, criticalC: 46,
  extremeAirTemperatureC: 40,
  humidCriticalC: 32, humidCriticalPercent: 85,
  hotHumidCriticalC: 35, hotHumidCriticalPercent: 70,
  occupationalEscalationStartsC: 27,
  // Conservative implementation envelope; outside it report no regression result.
  minRegressionF: 80, maxRegressionF: 112, maxReportedHeatIndexF: 137,
};
export const LEVELS = ['CAUTION', 'ELEVATED', 'HIGH', 'CRITICAL'] as const;
export const BASE_LIMITATIONS = [
  'PROTOTYPE_OCCUPATIONAL_RULES_UNVALIDATED', 'NOT_MEDICALLY_VALIDATED',
  'NOT_PERMISSION_TO_CONTINUE_WORK', 'NO_GUARANTEED_SAFE_DURATION',
  'HEAT_INDEX_IS_NOT_WBGT', 'PERSONAL_HEALTH_CLOTHING_AND_ACCLIMATIZATION_NOT_ASSESSED',
  'HYDRATION_ONLY_WHEN_CONSCIOUS_AND_ABLE_TO_SWALLOW',
];

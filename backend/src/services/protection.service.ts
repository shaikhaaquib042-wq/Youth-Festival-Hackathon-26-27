import { DateTime } from 'luxon';
import type { ProtectionPlan, WeatherResponse, WorkerProfile } from '../types/index.js';
import { hourlyWeatherSchema } from '../schemas/shared.schema.js';
import { ApiException } from '../middleware/error.middleware.js';
import { assessHeat } from './heat-engine.service.js';

export function createProtectionPlan(profile: WorkerProfile, weather: WeatherResponse, now: Date): ProtectionPlan {
  const zone = profile.location.timezone;
  const workDate = DateTime.fromJSDate(now, { zone }).toISODate()!;
  const start = DateTime.fromISO(`${workDate}T${profile.workStart}`, { zone });
  const end = DateTime.fromISO(`${workDate}T${profile.workEnd}`, { zone });
  // Reject local times that shift across a DST gap or map to two instants.
  if (!start.isValid || !end.isValid || start.toFormat('HH:mm') !== profile.workStart ||
      end.toFormat('HH:mm') !== profile.workEnd || start.getPossibleOffsets().length !== 1 ||
      end.getPossibleOffsets().length !== 1 || end.toMillis() <= start.toMillis()) {
    throw new ApiException(422, 'INVALID_SCHEDULE', 'Work schedule is invalid or ambiguous in the selected timezone');
  }
  const rows = (Array.isArray(weather.hourly) ? weather.hourly : []).flatMap(raw => {
    const row = hourlyWeatherSchema.safeParse(raw);
    if (!row.success) return [];
    const time = DateTime.fromISO(row.data.time, { zone: weather.timezone, setZone: true });
    if (!time.isValid || time.getPossibleOffsets().length !== 1) return [];
    // Reject silently normalized nonexistent local forecast times.
    if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(row.data.time) && time.toFormat("yyyy-MM-dd'T'HH:mm") !== row.data.time.slice(0, 16)) return [];
    return [{ time: time.toMillis(), row: row.data }];
  });
  const boundaries = new Set([start.toMillis(), end.toMillis()]);
  for (const row of rows) for (const edge of [row.time, row.time + 3_600_000]) {
    if (edge > start.toMillis() && edge < end.toMillis()) boundaries.add(edge);
  }
  const points = [...boundaries].sort((a, b) => a - b);
  const timeline: ProtectionPlan['timeline'] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const matching = rows.filter(row => row.time <= a && row.time + 3_600_000 >= b);
    const row = matching.length === 1 ? matching[0]! : null;
    const current = row ? {
      temperatureC: row.row.temperatureC, humidityPercent: row.row.humidityPercent,
      apparentTemperatureC: row.row.apparentTemperatureC,
      windSpeedKmh: row.row.windSpeedKmh,
      observedAt: new Date(row.time).toISOString(),
    } : null;
    const { assessment } = assessHeat(profile, { ...weather, current }, { now, forecast: true });
    if (!row) assessment.limitations.push(matching.length > 1 ? 'AMBIGUOUS_FORECAST_COVERAGE' : 'FORECAST_PERIOD_UNAVAILABLE');
    timeline.push({
      start: DateTime.fromMillis(a, { zone }).toISO()!, end: DateTime.fromMillis(b, { zone }).toISO()!,
      advisoryLevel: assessment.advisoryLevel,
      temperatureC: assessment.environmentalIndicators.temperatureC,
      factors: assessment.factors, recommendationCodes: assessment.recommendations.map(r => r.code),
      availability: assessment.advisoryLevel === 'UNKNOWN' ? 'UNAVAILABLE' : 'AVAILABLE', assessment,
    });
  }
  return {
    dataMode: weather.dataMode, timezone: zone, workDate, workStart: profile.workStart, workEnd: profile.workEnd,
    timeline, disclaimerCode: 'NOT_A_CERTIFIED_WORK_REST_PLAN',
    limitations: ['SAME_DAY_SCHEDULE_ONLY', 'NO_GUARANTEED_SAFE_DURATION', 'PROTOTYPE_OCCUPATIONAL_RULES_UNVALIDATED'],
    optionalScheduleAdvice: profile.scheduleFlexibility === 'FLEXIBLE' ? ['CONSIDER_OPTIONAL_SCHEDULE_ADJUSTMENT'] : [],
  };
}

import { z } from 'zod';
import { IANAZone } from 'luxon';

export const occupationSchema = z.enum(['CONSTRUCTION', 'DELIVERY', 'STREET_VENDOR', 'AGRICULTURE', 'ROAD_WORKER', 'TRAFFIC_POLICE', 'OTHER']);
export const workloadSchema = z.enum(['LIGHT', 'MODERATE', 'HEAVY']);
export const environmentSchema = z.enum(['DIRECT_SUNLIGHT', 'PARTIAL_SHADE', 'MOSTLY_SHADED']);
export const accessSchema = z.enum(['AVAILABLE', 'LIMITED', 'UNAVAILABLE']);
export const flexibilitySchema = z.enum(['FLEXIBLE', 'FIXED', 'EMPLOYER_CONTROLLED']);
export const dataModeSchema = z.enum(['LIVE', 'CACHED', 'SIMULATION']);
export const advisorySchema = z.enum(['CAUTION', 'ELEVATED', 'HIGH', 'CRITICAL', 'UNKNOWN']);
export const locationSchema = z.strictObject({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().trim().min(1).max(150),
  timezone: z.string().refine(value => IANAZone.isValidZone(value), 'Use a valid IANA timezone'),
});
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');
export const workerProfileSchema = z.strictObject({
  occupation: occupationSchema,
  workload: workloadSchema,
  environment: environmentSchema,
  waterAccess: accessSchema,
  shadeAccess: accessSchema,
  scheduleFlexibility: flexibilitySchema,
  alternativeDutiesAvailable: z.boolean(),
  workStart: timeSchema,
  workEnd: timeSchema,
  language: z.enum(['en', 'hi', 'mr']),
  location: locationSchema,
}).refine(p => p.workEnd > p.workStart, {
  path: ['workEnd'], message: 'MVP requires a same-day schedule with workEnd after workStart',
});
export const weatherMetricsSchema = z.strictObject({
  temperatureC: z.number().min(-90).max(65),
  humidityPercent: z.number().min(0).max(100),
  apparentTemperatureC: z.number().min(-120).max(100).nullable().optional(),
  windSpeedKmh: z.number().min(0).max(500).nullable().optional(),
});
export const currentWeatherSchema = weatherMetricsSchema.extend({ observedAt: z.iso.datetime({ offset: true }) });
// Offset-bearing ISO timestamps and local ISO timestamps in WeatherResponse.timezone are supported.
export const hourlyWeatherSchema = weatherMetricsSchema.extend({ time: z.string().min(1) });
export const weatherResponseSchema = z.strictObject({
  dataMode: dataModeSchema,
  source: z.string().trim().min(1).max(200),
  timezone: z.string().refine(value => IANAZone.isValidZone(value), 'Use a valid IANA timezone'),
  fetchedAt: z.iso.datetime({ offset: true }),
  current: currentWeatherSchema.nullable(),
  hourly: z.array(hourlyWeatherSchema),
});
export const recommendationSchema = z.strictObject({
  code: z.enum(['MAINTAIN_HYDRATION', 'IMPROVE_WATER_ACCESS', 'ARRANGE_SHADED_RECOVERY', 'REDUCE_STRENUOUS_ACTIVITY', 'ESCALATE_TO_SUPERVISOR', 'FIND_COOLING_RESOURCE', 'CONSIDER_ALTERNATIVE_DUTIES', 'STOP_UNSAFE_ACTIVITY', 'SEEK_EMERGENCY_HELP', 'MONITOR_SYMPTOMS']),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
});
export const heatAssessmentSchema = z.strictObject({
  advisoryLevel: advisorySchema,
  engineVersion: z.literal('1.0.0-prototype'),
  factors: z.array(z.string()),
  recommendations: z.array(recommendationSchema),
  medicalValidation: z.literal(false),
  disclaimerCode: z.literal('ESTIMATED_ADVISORY_ONLY'),
  environmentalIndicators: z.object({
    temperatureC: z.number().nullable(), humidityPercent: z.number().nullable(),
    apparentTemperatureC: z.number().nullable(), windSpeedKmh: z.number().nullable(),
    heatIndexC: z.number().nullable(), heatIndexMethod: z.enum(['NWS_ROTHFUSZ', 'NOT_APPLICABLE']),
    environmentalAdvisoryLevel: advisorySchema,
  }),
  limitations: z.array(z.string()),
  source: z.string().nullable(),
  observedAt: z.string().nullable(),
  fetchedAt: z.string().nullable(),
  assessedAt: z.string(),
});
export const assessmentResponseSchema = z.strictObject({ dataMode: dataModeSchema, assessment: heatAssessmentSchema });
export const apiErrorSchema = z.strictObject({ error: z.strictObject({
  code: z.string(), message: z.string(), requestId: z.string(),
}) });

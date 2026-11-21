import { z } from 'zod';

// Deterministic validation without runtime code generation under a strict script CSP.
z.config({ jitless: true });

export const occupations = [
  'CONSTRUCTION',
  'DELIVERY',
  'STREET_VENDOR',
  'AGRICULTURE',
  'ROAD_WORKER',
  'TRAFFIC_POLICE',
  'OTHER',
] as const;
export const workloads = ['LIGHT', 'MODERATE', 'HEAVY'] as const;
export const environments = ['DIRECT_SUNLIGHT', 'PARTIAL_SHADE', 'MOSTLY_SHADED'] as const;
export const accessLevels = ['AVAILABLE', 'LIMITED', 'UNAVAILABLE'] as const;
export const flexibilities = ['FLEXIBLE', 'FIXED', 'EMPLOYER_CONTROLLED'] as const;
export const languages = ['en', 'hi', 'mr'] as const;
export const categories = [
  'DRINKING_WATER',
  'SHADED_REST_AREA',
  'COOLING_CENTER',
  'COMMUNITY_SHOP',
  'MEDICAL_FACILITY',
] as const;
export const verificationStatuses = ['PENDING', 'VERIFIED', 'REJECTED', 'DEMO'] as const;
export const availabilityStatuses = ['AVAILABLE', 'LIMITED', 'UNAVAILABLE', 'UNKNOWN'] as const;
export function validTimezone(value: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
export const locationSchema = z.strictObject({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().trim().min(1).max(150),
  timezone: z.string().refine(validTimezone),
});
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const workerSchema = z
  .strictObject({
    occupation: z.enum(occupations),
    workload: z.enum(workloads),
    environment: z.enum(environments),
    waterAccess: z.enum(accessLevels),
    shadeAccess: z.enum(accessLevels),
    scheduleFlexibility: z.enum(flexibilities),
    alternativeDutiesAvailable: z.boolean(),
    workStart: time,
    workEnd: time,
    language: z.enum(languages),
    location: locationSchema,
  })
  .refine((profile) => profile.workEnd > profile.workStart, {
    path: ['workEnd'],
    message: 'sameDay',
  });
export const conditionsSchema = z.strictObject({
  temperatureC: z.number().min(-90).max(65),
  humidityPercent: z.number().min(0).max(100),
  windSpeedKmh: z.number().min(0).max(500),
});
export const simulationRequestSchema = z.strictObject({
  profile: workerSchema,
  weatherOverride: conditionsSchema,
});
export const modeSchema = z.enum(['LIVE', 'CACHED', 'SIMULATION']);
export const advisorySchema = z.enum(['CAUTION', 'ELEVATED', 'HIGH', 'CRITICAL', 'UNKNOWN']);
export const recommendationSchema = z.object({
  code: z.string().min(1),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
});
export const indicatorsSchema = z.object({
  temperatureC: z.number().nullable(),
  humidityPercent: z.number().nullable(),
  apparentTemperatureC: z.number().nullable(),
  windSpeedKmh: z.number().nullable(),
  heatIndexC: z.number().nullable(),
  heatIndexMethod: z.enum(['NWS_ROTHFUSZ', 'NOT_APPLICABLE']),
  environmentalAdvisoryLevel: advisorySchema,
});
export const assessmentSchema = z.object({
  advisoryLevel: advisorySchema,
  engineVersion: z.string(),
  factors: z.array(z.string()),
  recommendations: z.array(recommendationSchema),
  medicalValidation: z.literal(false),
  disclaimerCode: z.string(),
  environmentalIndicators: indicatorsSchema,
  limitations: z.array(z.string()),
  source: z.string().nullable(),
  observedAt: z.string().nullable(),
  fetchedAt: z.string().nullable(),
  assessedAt: z.string(),
});
export const assessmentResponseSchema = z.object({
  dataMode: modeSchema,
  assessment: assessmentSchema,
});
const weatherMetrics = z.object({
  temperatureC: z.number().min(-90).max(65),
  humidityPercent: z.number().min(0).max(100),
  apparentTemperatureC: z.number().min(-120).max(100).nullable().optional(),
  windSpeedKmh: z.number().min(0).max(500).nullable().optional(),
});
export const weatherSchema = z.object({
  dataMode: modeSchema,
  source: z.string().min(1),
  timezone: z.string().refine(validTimezone),
  fetchedAt: z.iso.datetime({ offset: true }),
  current: weatherMetrics.extend({ observedAt: z.iso.datetime({ offset: true }) }).nullable(),
  hourly: z.array(weatherMetrics.extend({ time: z.string().min(1) })),
});
export const protectionSchema = z.object({
  dataMode: modeSchema,
  timezone: z.string(),
  workDate: z.string(),
  workStart: time,
  workEnd: time,
  timeline: z.array(
    z.object({
      start: z.string(),
      end: z.string(),
      advisoryLevel: advisorySchema,
      temperatureC: z.number().nullable(),
      factors: z.array(z.string()),
      recommendationCodes: z.array(z.string()),
      availability: z.enum(['AVAILABLE', 'UNAVAILABLE']),
      assessment: assessmentSchema,
    }),
  ),
  disclaimerCode: z.string(),
  limitations: z.array(z.string()),
  optionalScheduleAdvice: z.array(z.string()),
});
const facilityBase = z.object({
  id: z.uuid(),
  name: z.string(),
  category: z.enum(categories),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  waterAvailable: z.boolean(),
  shadeAvailable: z.boolean(),
  verificationStatus: z.enum(verificationStatuses),
  lastVerifiedAt: z.string().nullable(),
});
export const facilitySchema = facilityBase.extend({ distanceKm: z.number().nonnegative() });
export const facilityDetailSchema = facilityBase.extend({
  distanceKm: z.number().nonnegative().optional(),
  address: z.string().optional(),
  openingHours: z.string().nullable().optional(),
  seatingAvailable: z.boolean().optional(),
  availabilityStatus: z.enum(availabilityStatuses).optional(),
});
export const facilitiesSchema = z.object({
  distanceMethod: z.literal('STRAIGHT_LINE'),
  facilities: z.array(facilitySchema),
});
export const submissionSchema = z.strictObject({
  name: z.string().trim().min(1).max(150),
  category: z.enum(categories),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().trim().min(1),
  waterAvailable: z.boolean(),
  shadeAvailable: z.boolean(),
  seatingAvailable: z.boolean(),
  openingHours: z.string().max(1000).nullable().optional(),
});
export const reportInputSchema = z.strictObject({
  availabilityStatus: z.enum(availabilityStatuses),
  comment: z.string().max(500).optional(),
});
export const reportResponseSchema = z.object({
  id: z.uuid(),
  safeZoneId: z.uuid(),
  availabilityStatus: z.enum(availabilityStatuses),
  comment: z.string().nullable().optional(),
  createdAt: z.string(),
});
export const healthSchema = z.object({
  status: z.literal('UP'),
  application: z.literal('SunShield'),
  version: z.string(),
});
export type WorkerProfile = z.infer<typeof workerSchema>;
export type Location = z.infer<typeof locationSchema>;
export type Language = (typeof languages)[number];
export type Conditions = z.infer<typeof conditionsSchema>;
export type AssessmentResponse = z.infer<typeof assessmentResponseSchema>;
export type Assessment = z.infer<typeof assessmentSchema>;
export type WeatherResponse = z.infer<typeof weatherSchema>;
export type ProtectionPlan = z.infer<typeof protectionSchema>;
export type Facility = z.infer<typeof facilitySchema>;
export type FacilityDetail = z.infer<typeof facilityDetailSchema>;
export type Submission = z.infer<typeof submissionSchema>;

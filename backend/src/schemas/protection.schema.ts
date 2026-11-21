import { z } from 'zod';
import { advisorySchema, dataModeSchema, workerProfileSchema, heatAssessmentSchema } from './shared.schema.js';
export const protectionRequestSchema = z.strictObject({ profile: workerProfileSchema });
export const protectionPlanSchema = z.strictObject({
  dataMode: dataModeSchema,
  timezone: z.string(), workDate: z.string(), workStart: z.string(), workEnd: z.string(),
  timeline: z.array(z.object({
    start: z.string(), end: z.string(), advisoryLevel: advisorySchema,
    temperatureC: z.number().nullable(), factors: z.array(z.string()),
    recommendationCodes: z.array(z.string()), availability: z.enum(['AVAILABLE', 'UNAVAILABLE']),
    assessment: heatAssessmentSchema,
  })),
  disclaimerCode: z.literal('NOT_A_CERTIFIED_WORK_REST_PLAN'),
  limitations: z.array(z.string()),
  optionalScheduleAdvice: z.array(z.string()),
});

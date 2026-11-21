import { z } from 'zod';
import { workerProfileSchema, weatherMetricsSchema } from './shared.schema.js';
export const simulationRequestSchema = z.strictObject({
  profile: workerProfileSchema,
  weatherOverride: weatherMetricsSchema.pick({ temperatureC: true, humidityPercent: true, windSpeedKmh: true })
    .extend({ windSpeedKmh: z.number().min(0).max(500) }),
});

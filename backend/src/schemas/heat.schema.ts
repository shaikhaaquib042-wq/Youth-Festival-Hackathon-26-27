import { z } from 'zod';
import { workerProfileSchema } from './shared.schema.js';
export const heatRequestSchema = z.strictObject({ profile: workerProfileSchema });

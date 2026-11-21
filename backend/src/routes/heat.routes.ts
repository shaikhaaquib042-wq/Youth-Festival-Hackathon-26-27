import { Router } from 'express';
import type { AppDependencies } from '../types/index.js';
import { validate } from '../middleware/validation.middleware.js';
import { heatRequestSchema } from '../schemas/heat.schema.js';
import { heatController } from '../controllers/heat.controller.js';
export function heatRoutes(dependencies: AppDependencies) {
  return Router().post('/assess', validate(heatRequestSchema), heatController(dependencies));
}

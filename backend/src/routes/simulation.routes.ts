import { Router } from 'express';
import type { AppDependencies } from '../types/index.js';
import { validate } from '../middleware/validation.middleware.js';
import { simulationRequestSchema } from '../schemas/simulation.schema.js';
import { simulationController } from '../controllers/simulation.controller.js';
export function simulationRoutes(dependencies: AppDependencies) {
  return Router().post('/evaluate', validate(simulationRequestSchema), simulationController(dependencies));
}

import { Router } from 'express';
import type { AppDependencies } from '../types/index.js';
import { validate } from '../middleware/validation.middleware.js';
import { protectionRequestSchema } from '../schemas/protection.schema.js';
import { protectionController } from '../controllers/protection.controller.js';
export function protectionRoutes(dependencies: AppDependencies) {
  return Router().post('/plan', validate(protectionRequestSchema), protectionController(dependencies));
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { openapi } from './docs/openapi.js';
import { env } from './config/env.js';
import { requestId } from './middleware/request-id.middleware.js';
import { ApiException, errorHandler } from './middleware/error.middleware.js';
import { createApiRouter } from './routes/index.js';
import type { AppDependencies } from './types/index.js';

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestId);
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, exposedHeaders: ['X-Request-Id'] }));
  app.use('/api/v1', rateLimit({
    windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, _res, next) => next(new ApiException(429, 'RATE_LIMITED', 'Too many requests; retry later')),
  }));
  app.use(express.json({ limit: '32kb' }));
  app.get('/openapi.json', (_req, res) => res.json(openapi));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));
  app.use('/api/v1', createApiRouter(dependencies));
  app.use((_req, _res, next) => next(new ApiException(404, 'NOT_FOUND', 'Route not found')));
  app.use(errorHandler);
  return app;
}

import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createSafeZoneRouter } from '../../../dist/src/routes/safezone.routes.js';
import type { SafeZoneRouterDependencies } from '../../../dist/src/routes/safezone.routes.js';
import type { AppDependencies } from '../types/index.js';
import { env } from '../config/env.js';
import { ApiException } from '../middleware/error.middleware.js';

type Services = SafeZoneRouterDependencies['services'];
let productionServices: Promise<Services> | undefined;
export async function disconnectSafeZoneStorage(): Promise<void> {
  if (!productionServices) return;
  const loaded = await productionServices.catch(() => undefined);
  if (loaded) await (await import('../../../dist/src/config/database.js')).disconnectDatabase();
}
async function loadServices(): Promise<Services> {
  if (!process.env.DATABASE_URL?.trim()) throw new ApiException(503, 'SAFE_ZONES_UNAVAILABLE', 'Safe Zone storage is unavailable');
  productionServices ??= Promise.all([
    import('../../../dist/src/services/safezone.service.js'),
    import('../../../dist/src/services/safezone-report.service.js'),
  ]).then(([zones, reports]) => ({ ...zones, ...reports })).catch(() => {
    productionServices = undefined;
    throw new ApiException(503, 'SAFE_ZONES_UNAVAILABLE', 'Safe Zone storage is unavailable');
  });
  return productionServices;
}

async function databaseOperation<T>(operation: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Database operation timeout')), 8000);
      }),
    ]);
  } catch {
    throw new ApiException(503, 'SAFE_ZONES_UNAVAILABLE', 'Safe Zone storage is temporarily unavailable');
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function safeZoneRoutes(dependencies: AppDependencies) {
  const services: Services = {
    searchSafeZones: input => databaseOperation(async () => (dependencies.safeZoneServices ?? await loadServices()).searchSafeZones(input)),
    getSafeZone: id => databaseOperation(async () => (dependencies.safeZoneServices ?? await loadServices()).getSafeZone(id)),
    submitSafeZone: input => databaseOperation(async () => (dependencies.safeZoneServices ?? await loadServices()).submitSafeZone(input)),
    createSafeZoneReport: input => databaseOperation(async () => (dependencies.safeZoneServices ?? await loadServices()).createSafeZoneReport(input)),
  };
  const writeLimit = rateLimit({
    windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, _res, next) => next(new ApiException(429, 'RATE_LIMITED', 'Too many community writes; retry later')),
  });
  const communityWriteRateLimit: RequestHandler = (req, res, next) => {
    if (!(dependencies.communityWritesEnabled ?? env.COMMUNITY_WRITES_ENABLED)) {
      next(new ApiException(503, 'COMMUNITY_WRITES_DISABLED', 'Community writes await an authorized test environment'));
      return;
    }
    return writeLimit(req, res, next);
  };
  return createSafeZoneRouter({ services, communityWriteRateLimit });
}

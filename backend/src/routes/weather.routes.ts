import { Router } from 'express';
import { z } from 'zod';
import type { AppDependencies } from '../types/index.js';
import { ApiException } from '../middleware/error.middleware.js';
import { requestWeather } from '../services/weather-provider.adapter.js';
import { weatherResponseSchema } from '../schemas/shared.schema.js';

const coordinate = (min: number, max: number) => z.string().trim().min(1)
  .transform(Number).pipe(z.number().min(min).max(max));
const querySchema = z.strictObject({ latitude: coordinate(-90, 90), longitude: coordinate(-180, 180) });

export function weatherRoutes(dependencies: AppDependencies) {
  return Router().get('/', async (req, res) => {
    const query = querySchema.safeParse(req.query);
    if (!query.success) throw new ApiException(422, 'VALIDATION_ERROR', 'Valid latitude and longitude are required');
    const weather = await requestWeather(dependencies.weatherProvider, query.data.latitude, query.data.longitude);
    const result = weatherResponseSchema.safeParse(weather);
    if (!result.success) throw new ApiException(503, 'INVALID_WEATHER_RESPONSE', 'Weather provider returned unusable observations');
    res.json(result.data);
  });
}

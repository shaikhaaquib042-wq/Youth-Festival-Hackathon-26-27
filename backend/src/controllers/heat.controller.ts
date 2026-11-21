import type { RequestHandler } from 'express';
import type { AppDependencies } from '../types/index.js';
import type { z } from 'zod';
import type { heatRequestSchema } from '../schemas/heat.schema.js';
import { requestWeather } from '../services/weather-provider.adapter.js';
import { assessHeat } from '../services/heat-engine.service.js';

export function heatController(dependencies: AppDependencies): RequestHandler {
  return async (req, res) => {
    const { profile } = req.body as z.infer<typeof heatRequestSchema>;
    const weather = await requestWeather(dependencies.weatherProvider, profile.location.latitude, profile.location.longitude);
    res.json(assessHeat(profile, weather, { now: (dependencies.now ?? (() => new Date()))() }));
  };
}

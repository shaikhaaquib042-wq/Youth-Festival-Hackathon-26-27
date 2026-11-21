import type { RequestHandler } from 'express';
import type { AppDependencies } from '../types/index.js';
import type { z } from 'zod';
import type { protectionRequestSchema } from '../schemas/protection.schema.js';
import { requestWeather } from '../services/weather-provider.adapter.js';
import { createProtectionPlan } from '../services/protection.service.js';

export function protectionController(dependencies: AppDependencies): RequestHandler {
  return async (req, res) => {
    const { profile } = req.body as z.infer<typeof protectionRequestSchema>;
    const weather = await requestWeather(dependencies.weatherProvider, profile.location.latitude, profile.location.longitude);
    res.json(createProtectionPlan(profile, weather, (dependencies.now ?? (() => new Date()))()));
  };
}

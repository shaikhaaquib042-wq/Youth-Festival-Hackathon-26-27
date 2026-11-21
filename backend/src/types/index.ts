import type { z } from 'zod';
import type { locationSchema, workerProfileSchema, currentWeatherSchema, hourlyWeatherSchema, weatherResponseSchema, heatAssessmentSchema, recommendationSchema, assessmentResponseSchema, apiErrorSchema, advisorySchema } from '../schemas/shared.schema.js';
import type { simulationRequestSchema } from '../schemas/simulation.schema.js';
import type { protectionPlanSchema } from '../schemas/protection.schema.js';
import type { SafeZoneRouterDependencies } from '../../../dist/src/routes/safezone.routes.js';

export type Location = z.infer<typeof locationSchema>;
export type WorkerProfile = z.infer<typeof workerProfileSchema>;
export type CurrentWeather = z.infer<typeof currentWeatherSchema>;
export type HourlyWeather = z.infer<typeof hourlyWeatherSchema>;
export type WeatherResponse = z.infer<typeof weatherResponseSchema>;
export type HeatAssessment = z.infer<typeof heatAssessmentSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export type AssessmentResponse = z.infer<typeof assessmentResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type AdvisoryLevel = z.infer<typeof advisorySchema>;
export type ProtectionPlan = z.infer<typeof protectionPlanSchema>;
export type SimulationRequest = z.infer<typeof simulationRequestSchema>;
export interface WeatherProvider {
  getWeather(latitude: number, longitude: number): Promise<WeatherResponse>;
}
export interface AppDependencies {
  weatherProvider?: WeatherProvider;
  now?: () => Date;
  safeZoneServices?: SafeZoneRouterDependencies['services'];
  communityWritesEnabled?: boolean;
}

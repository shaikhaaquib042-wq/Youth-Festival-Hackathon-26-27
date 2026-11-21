import type { SimulationRequest } from '../types/index.js';
import { assessHeat } from './heat-engine.service.js';
export function evaluateSimulation(input: SimulationRequest, now: Date) {
  return assessHeat(input.profile, {
    dataMode: 'SIMULATION', source: 'HeatLab', timezone: input.profile.location.timezone,
    fetchedAt: now.toISOString(),
    current: { ...input.weatherOverride, observedAt: now.toISOString() }, hourly: [],
  }, { now });
}

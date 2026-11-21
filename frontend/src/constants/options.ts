import type { Conditions, Location, WorkerProfile } from '../schemas/contracts';
export const cities: Location[] = [
  { city: 'Pune', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata' },
  { city: 'Mumbai', latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata' },
  { city: 'New Delhi', latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' },
];
// Explicit HeatLab sample, never an implicit worker location or a calculated advisory.
export const constructionScenario: WorkerProfile = {
  occupation: 'CONSTRUCTION',
  workload: 'HEAVY',
  environment: 'DIRECT_SUNLIGHT',
  waterAccess: 'LIMITED',
  shadeAccess: 'UNAVAILABLE',
  scheduleFlexibility: 'EMPLOYER_CONTROLLED',
  alternativeDutiesAvailable: false,
  workStart: '09:00',
  workEnd: '18:00',
  language: 'en',
  location: cities[0],
};
export const vendorScenario: WorkerProfile = {
  ...constructionScenario,
  occupation: 'STREET_VENDOR',
  workload: 'LIGHT',
  environment: 'PARTIAL_SHADE',
  waterAccess: 'AVAILABLE',
  shadeAccess: 'AVAILABLE',
  scheduleFlexibility: 'FLEXIBLE',
};
export const demoConditions: Conditions = {
  temperatureC: 35,
  humidityPercent: 50,
  windSpeedKmh: 5,
};
export const presets: Record<string, Conditions> = {
  comparison: demoConditions,
  summer: { temperatureC: 34, humidityPercent: 40, windSpeedKmh: 12 },
  dry: { temperatureC: 44, humidityPercent: 45, windSpeedKmh: 12 },
  humid: { temperatureC: 39, humidityPercent: 82, windSpeedKmh: 5 },
  heavy: { temperatureC: 42, humidityPercent: 55, windSpeedKmh: 5 },
};

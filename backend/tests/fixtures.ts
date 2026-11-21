import type { WeatherResponse, WorkerProfile, WeatherProvider } from '../src/types/index.js';
export const now = new Date('2026-11-21T03:30:00Z');
export const profile: WorkerProfile = {
  occupation: 'CONSTRUCTION', workload: 'HEAVY', environment: 'DIRECT_SUNLIGHT',
  waterAccess: 'LIMITED', shadeAccess: 'UNAVAILABLE', scheduleFlexibility: 'EMPLOYER_CONTROLLED',
  alternativeDutiesAvailable: false, workStart: '09:00', workEnd: '18:00', language: 'mr',
  location: { latitude: 18.5204, longitude: 73.8567, city: 'Pune', timezone: 'Asia/Kolkata' },
};
export function weather(temperatureC = 32, humidityPercent = 50): WeatherResponse {
  return {
    dataMode: 'LIVE', source: 'Deterministic test fixture', timezone: 'Asia/Kolkata',
    fetchedAt: now.toISOString(), current: { temperatureC, humidityPercent, observedAt: now.toISOString(), windSpeedKmh: 5 },
    hourly: Array.from({ length: 24 }, (_, hour) => ({ time: `2026-11-21T${String(hour).padStart(2, '0')}:00`, temperatureC, humidityPercent, windSpeedKmh: 5 })),
  };
}
export const provider: WeatherProvider = { getWeather: async () => weather() };

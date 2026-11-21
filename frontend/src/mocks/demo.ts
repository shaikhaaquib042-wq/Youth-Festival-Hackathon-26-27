// Explicit fixtures only. No heat assessment or simulation calculation lives here.
export const demoWeather = {
  dataMode: 'SIMULATION',
  source: 'SunShield demonstration fixture',
  timezone: 'Asia/Kolkata',
  fetchedAt: '2026-11-21T09:00:00Z',
  current: {
    temperatureC: 35,
    humidityPercent: 50,
    apparentTemperatureC: null,
    windSpeedKmh: 5,
    observedAt: '2026-11-21T09:00:00Z',
  },
  hourly: [],
};
export const demoFacilities = [
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    name: 'Demonstration water resource',
    category: 'DRINKING_WATER',
    latitude: 18.5204,
    longitude: 73.8567,
    distanceKm: 0,
    waterAvailable: true,
    shadeAvailable: false,
    verificationStatus: 'DEMO',
    lastVerifiedAt: null,
  },
];

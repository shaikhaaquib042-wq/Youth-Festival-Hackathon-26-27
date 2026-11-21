import { createApp } from './app.js';
import { env } from './config/env.js';
import { createOpenMeteoWeatherProvider } from './services/open-meteo-weather.provider.js';
import { disconnectSafeZoneStorage } from './routes/safe-zones.routes.js';

const weatherProvider = createOpenMeteoWeatherProvider({
  baseUrl: env.OPEN_METEO_BASE_URL,
  cacheTtlMs: env.WEATHER_CACHE_TTL_SECONDS * 1000,
});
const server = createApp({ weatherProvider }).listen(env.PORT, () => {
  console.log(`SunShield listening on port ${env.PORT}`);
});
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 10_000);
  timeout.unref();
  server.close(async error => {
    try { await disconnectSafeZoneStorage(); }
    catch { error ??= new Error('Database shutdown failed'); }
    clearTimeout(timeout);
    process.exit(error ? 1 : 0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
server.on('error', () => { console.error('SunShield failed to listen'); process.exitCode = 1; });

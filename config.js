// Mausam Mitra runtime config — ORCHESTRATOR-OWNED (see AGENTS.md).
// Everything tunable lives here so it can be changed without touching engine code.
import pune from './citypacks/pune.json';
import mumbai from './citypacks/mumbai.json';
import bengaluru from './citypacks/bengaluru.json';
import hyderabad from './citypacks/hyderabad.json';

export const CITY_PACKS = { pune, mumbai, bengaluru, hyderabad };

const env = import.meta.env;
const urlCity = new URLSearchParams(globalThis.location?.search ?? '').get('city');

export const CONFIG = {
  // ?city=mumbai in the URL overrides (City Pack demo); else VITE_CITY; else Pune.
  CITY: CITY_PACKS[urlCity] ? urlCity : (env.VITE_CITY ?? 'pune'),

  // Routing (§10). Dev → laptop OSRM in Docker; deployed build → public OSRM.
  OSRM_URL: env.VITE_OSRM_URL ?? (env.DEV ? 'http://localhost:5000' : 'https://router.project-osrm.org'),
  OSRM_ALTERNATIVES: 3,
  ROUTE_BUFFER_M: 300,
  DETOUR_OFFSET_M: 1000, // via-point offset when no alternative is clean (REQUIRED — OSRM often returns 1 route)

  // Tiles (§11). '/tiles' = Vite public/ dev fallback; set VITE_TILES_BASE to the R2 public URL when ready.
  TILES_BASE: env.VITE_TILES_BASE ?? '/tiles',

  // Reports & lifecycle (§5, §6, Q7, Q8)
  PHOTO_REQUIRED: false,
  EXPIRY_MIN: { flood: 120, clog: 360 },
  CONFIRM_RADIUS_M: 500,
  CONFIRM_WINDOW_MIN: 30,
  CONFIRM_TAPS: 3,

  // Feeds
  SACHET_PATH: '/api/sachet', // Vite proxy in dev, Pages Function in prod
  SACHET_POLL_MS: 5 * 60 * 1000,
  SACHET_ACTIVE_HOURS: 24, // RSS has no expiry field; alerts older than this are history, not banners
  RAINVIEWER_MAXZOOM: 7, // free API cap since 1 Jan 2026
  OPENMETEO_REFRESH_MS: 15 * 60 * 1000,

  // Scenario (§6.6): 1 real second = 1 scenario minute
  SCENARIO_SPEED: 60,
};

export const cityPack = () => CITY_PACKS[CONFIG.CITY];

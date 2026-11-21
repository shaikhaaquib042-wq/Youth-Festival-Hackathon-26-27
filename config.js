// Sajag runtime config — ORCHESTRATOR-OWNED (see AGENTS.md).
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
  EXPIRY_MIN: { flood: 120, clog: 360, cooling: 7 * 24 * 60 },
  CONFIRM_RADIUS_M: 500,
  CONFIRM_WINDOW_MIN: 30,
  CONFIRM_TAPS: 3,
  CLEAR_TAPS: 2,              // 'water cleared' taps that clear a report (when they outnumber 'still there')
  REQUIRE_GPS: false,         // true = refuse reports without a GPS fix; false lets the laptop demo place pins by map centre
  REPORT_MAX_DISTANCE_M: 300, // GPS-at-spot: report must be this close to the device fix (PRD §22.3)
  LANDMARK_RADIUS_M: 400,     // label pins 'Near <gazetteer name>' within this distance
  HOTSPOT_PRIOR_M: 150,       // report near a seeded hotspot starts as 'likely'

  // Feeds
  SACHET_PATH: '/api/sachet', // Vite proxy in dev, Pages Function in prod
  SACHET_POLL_MS: 5 * 60 * 1000,
  SACHET_ACTIVE_HOURS: 24, // RSS has no expiry field; alerts older than this are history, not banners
  RAINVIEWER_MAXZOOM: 7, // free API cap since 1 Jan 2026
  OPENMETEO_REFRESH_MS: 15 * 60 * 1000,

  // Heat module (PRD §21)
  HEAT: {
    MAP_BANDS_C: { amber: 37, red: 40, severe: 45 }, // Layer C cells, IMD-style air temperature
    SUN_SR_WM2: 600, SUN_WBGT_ADD_C: 2,               // WBGT_sun = WBGT_shade + 2 when shortwave > 600 W/m²
    UNACCLIMATISED_OFFSET_C: 2.5,
    SHIFT_CHECK_MIN: 30,
    HYDRATION_MIN: 20,
    EMERGENCY_NUMBERS: ['108', '112'],
    VOICE_LANGS: ['mr-IN', 'hi-IN', 'en-IN'],
    AUDIO_CLIP_LANGS: [], // add 'mr', 'hi', 'kn', 'te' once public/audio/<lang>/*.mp3 exist (docs/audio-script.md)
    ALERT_KEYWORDS: ['heat wave', 'heatwave', 'उष्णतेची लाट', 'उष्ण', 'लू', 'heat'],
  },

  // Scenario (§6.6): 1 real second = 1 scenario minute
  SCENARIO_SPEED: 60,
};

export const cityPack = () => CITY_PACKS[CONFIG.CITY];

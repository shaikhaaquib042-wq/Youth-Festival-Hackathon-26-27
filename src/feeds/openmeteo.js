// Open-Meteo multi-coordinate weather feed (PRD §7, §8, §21).
// Requests all city-pack grid points in ONE call (~10–15 km spacing across the region).
// Regional honesty rule: points represent regional model cells, never street-level microclimates.
import { CONFIG, cityPack } from '../../config.js';
import { distM } from '../engine/geo.js';

let liveGrid = [];      // [{ lat, lng, current, hourly, simulated: false }]
let scenarioGrid = null; // injected by Scenario player (cells carry simulated: true)
let timer = null;
const subs = new Set();

/**
 * Returns the array of {lat, lng} points for the city pack's grid.
 */
export function gridPoints(pack = cityPack()) {
  const pts = [];
  if (!pack?.grid?.lats || !pack?.grid?.lngs) return pts;
  for (const lat of pack.grid.lats) {
    for (const lng of pack.grid.lngs) {
      pts.push({ lat, lng });
    }
  }
  return pts;
}

/**
 * Formats multi-coordinate Open-Meteo URL.
 */
function buildUrl(points) {
  const lats = points.map((p) => p.lat).join(',');
  const lngs = points.map((p) => p.lng).join(',');
  const currentParams = [
    'temperature_2m',
    'apparent_temperature',
    'relative_humidity_2m',
    'precipitation',
    'wind_gusts_10m',
    'wet_bulb_temperature_2m',
    'shortwave_radiation',
  ].join(',');
  const hourlyParams = [
    'temperature_2m',
    'precipitation',
    'precipitation_probability',
    'wet_bulb_temperature_2m',
    'shortwave_radiation',
  ].join(',');

  return (
    `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}` +
    `&current=${currentParams}&hourly=${hourlyParams}&forecast_days=1&timezone=Asia%2FKolkata`
  );
}

/**
 * Fetches current and hourly forecast for all grid points in one call.
 */
export async function fetchWeather(pack = cityPack()) {
  const points = gridPoints(pack);
  if (!points.length) return [];

  const url = buildUrl(points);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = await res.json();
    const items = Array.isArray(data) ? data : [data];

    liveGrid = points.map((pt, i) => ({
      lat: pt.lat,
      lng: pt.lng,
      current: items[i]?.current ?? null,
      hourly: items[i]?.hourly ?? null,
      simulated: false,
    }));
    notify();
    return liveGrid;
  } catch (err) {
    console.warn('[openmeteo] fetchWeather failed:', err.message);
    return liveGrid;
  }
}

/**
 * Returns current grid: scenario grid if set, else live grid.
 */
export function getGrid() {
  return scenarioGrid ?? liveGrid;
}

/**
 * Nearest cell to given {lat, lng} from the active grid.
 */
export function nearestCell(pt) {
  if (!pt || pt.lat == null || pt.lng == null) return null;
  const grid = getGrid();
  if (!grid || !grid.length) return null;
  let best = null;
  let bestD = Infinity;
  for (const cell of grid) {
    const d = distM(pt, cell);
    if (d < bestD) {
      bestD = d;
      best = cell;
    }
  }
  return best;
}

/**
 * Subscribe to grid updates. Calls fn immediately with active grid.
 */
export function onGrid(fn) {
  subs.add(fn);
  fn(getGrid());
  return () => subs.delete(fn);
}

function notify() {
  const g = getGrid();
  subs.forEach((fn) => fn(g));
}

/**
 * Scenario mode overrides the live grid. Cells carry simulated: true.
 * Pass null to revert to live grid.
 */
export function setScenarioGrid(gridOrNull) {
  if (Array.isArray(gridOrNull)) {
    scenarioGrid = gridOrNull.map((c) => ({ ...c, simulated: true }));
  } else {
    scenarioGrid = null;
  }
  notify();
}

/**
 * Starts automatic polling of Open-Meteo for the city pack grid.
 */
export function startWeather(pack = cityPack()) {
  fetchWeather(pack);
  if (timer) clearInterval(timer);
  const interval = CONFIG?.OPENMETEO_REFRESH_MS ?? 15 * 60 * 1000;
  timer = setInterval(() => fetchWeather(pack), interval);
}

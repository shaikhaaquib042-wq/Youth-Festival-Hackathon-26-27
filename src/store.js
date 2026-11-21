// Central pin store: seed data + live Supabase reports + scenario pins → one list with derived status.
// Everything that draws pins or computes verdicts reads from here. Clock is injectable (Scenario mode).
import { CONFIG } from '../config.js';
import { makePin, TIERS } from './engine/pin.js';
import { deriveStatus } from './engine/lifecycle.js';
import { nearestPlace } from './engine/geo.js';
import puneHotspots from './data/pune-hotspots.json';
import puneCooling from './data/pune-cooling.json';
import puneGazetteer from './data/pune-gazetteer.json';
import mumbaiHotspots from './data/mumbai-hotspots.json';
import mumbaiCooling from './data/mumbai-cooling.json';
import mumbaiGazetteer from './data/mumbai-gazetteer.json';
import bengaluruHotspots from './data/bengaluru-hotspots.json';
import bengaluruCooling from './data/bengaluru-cooling.json';
import bengaluruGazetteer from './data/bengaluru-gazetteer.json';
import hyderabadHotspots from './data/hyderabad-hotspots.json';
import hyderabadCooling from './data/hyderabad-cooling.json';
import hyderabadGazetteer from './data/hyderabad-gazetteer.json';
import { fetchReports, watchReports } from './backend/reports.js';

const SEEDS = {
  pune: { hotspots: puneHotspots, cooling: puneCooling, gazetteer: puneGazetteer },
  mumbai: { hotspots: mumbaiHotspots, cooling: mumbaiCooling, gazetteer: mumbaiGazetteer },
  bengaluru: { hotspots: bengaluruHotspots, cooling: bengaluruCooling, gazetteer: bengaluruGazetteer },
  hyderabad: { hotspots: hyderabadHotspots, cooling: hyderabadCooling, gazetteer: hyderabadGazetteer },
};
const { hotspots, cooling, gazetteer } = SEEDS[CONFIG.CITY] ?? SEEDS.pune;

const OSM = { kind: 'seed', name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/copyright' };
// Link each cooling point to its own OSM object (osm-n123 → node/123), not the licence page.
const OSM_TYPE = { n: 'node', w: 'way', r: 'relation' };
const osmSource = (id) => { const m = /^osm-([nwr])(\d+)$/.exec(id ?? ''); return m ? { ...OSM, url: `https://www.openstreetmap.org/${OSM_TYPE[m[1]]}/${m[2]}` } : OSM; };
const SEED_TIME = '2026-11-01T00:00:00+05:30';

const seed = [
  // Archived spots (undated lists, 2019/2024 flood history) stay in the file but not on the live map.
  ...hotspots.filter((h) => !h.archived).map((h) => makePin({ id: h.id, type: 'hotspot', lat: h.lat, lng: h.lng, name: h.name, inUnderpass: h.inUnderpass,
    tier: TIERS.SEED, source: h.source, createdAt: h.lastReported ? `${h.lastReported}T00:00:00+05:30` : SEED_TIME, status: 'unverified' })),
  ...cooling.map((c) => makePin({ id: c.id, type: 'cooling', lat: c.lat, lng: c.lng, name: c.name, amenities: c.amenities,
    tier: TIERS.SEED, source: osmSource(c.id), createdAt: SEED_TIME, status: 'confirmed' })),
];

let live = [];      // from Supabase
let scenario = [];  // injected by the Scenario player (simulated: true)
let local = [];     // optimistic submissions and pasted pins that stay on this device
let clock = () => new Date();
const subs = new Set();

/** Current time used by the engine (real clock, or the Scenario player's). */
export const now = () => clock();
export function setClock(fn) { clock = fn || (() => new Date()); notify(); }

// Clock label shown to people (HH:MM). Real time normally; the Scenario player maps its clock to the replayed time of day.
const realFmt = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
let fmt = realFmt;
export const fmtClock = (d) => fmt(d instanceof Date ? d : new Date(d));
export function setClockFormat(fn) { fmt = fn || realFmt; }

/** All pins with derived status + landmark label. Cooling seed points are excluded unless asked (1,800+ points). */
export function getPins({ includeCooling = true } = {}) {
  const t = now();
  // During a replay the clock runs ahead of real time; shift REAL reports by the same amount so they keep their real age.
  const shift = t.getTime() - Date.now();
  const real = [...live, ...local.filter((l) => !live.some((x) => x.id === l.id))]
    .map((p) => (Math.abs(shift) < 1000 ? p : { ...p, createdAt: new Date(Date.parse(p.createdAt) + shift).toISOString() }));
  const reports = [...real, ...scenario]
    .filter((p) => Date.parse(p.createdAt) <= t.getTime()); // scenario pins appear only when the clock reaches them
  const withStatus = reports.map((p) => ({ ...p }));
  for (const p of withStatus) p.status = deriveStatus(p, withStatus, t, CONFIG);
  for (const p of withStatus) {
    if (!p.name) {
      const near = nearestPlace(p, gazetteer, CONFIG.LANDMARK_RADIUS_M);
      if (near) p.near = near.name;
    }
    p.nearHotspot = hotspots.some((h) => Math.hypot((h.lat - p.lat) * 110540, (h.lng - p.lng) * 105000) <= CONFIG.HOTSPOT_PRIOR_M);
  }
  const seedPins = includeCooling ? seed : seed.filter((p) => p.type !== 'cooling');
  return [...seedPins, ...withStatus];
}

export function subscribe(fn) { subs.add(fn); fn(); return () => subs.delete(fn); }
function notify() { subs.forEach((fn) => fn()); }

export function setScenarioPins(pins) { scenario = pins.map((p) => ({ ...p, simulated: true })); notify(); }
export function addLocalPin(pin, { clockTime } = {}) {
  // Real pins are stored in wall time. getPins projects them onto the scenario clock for display.
  const createdAt = clockTime ? new Date(Date.parse(pin.createdAt) - clockTime.getTime() + Date.now()).toISOString() : pin.createdAt;
  local = [...local, { ...pin, createdAt }];
  notify();
}

export async function refreshLive() {
  try { live = await fetchReports(now()); notify(); }
  catch (e) { console.warn('[store] fetchReports failed', e.message); }
}

/** Start: load live reports, subscribe to Realtime, re-derive statuses every 30 s (expiry countdowns). */
export function startStore() {
  refreshLive();
  watchReports(() => refreshLive());
  setInterval(notify, 30_000);
}

export { gazetteer, hotspots };

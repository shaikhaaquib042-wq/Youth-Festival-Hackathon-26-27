// Flood-aware route check (PRD §6.2, §10). Pure scoring + an async planner that calls OSRM.
// Strategy: OSRM alternatives → first candidate with no RED/ORANGE pin within the buffer.
// None clean → one detour via-point ~1 km perpendicular to the worst blocking pin (both sides), re-request once.
// Still blocked → AVOID "no safe route found — do not travel".
import { distToLineM } from './geo.js';
import { pinSeverity, worst } from './lifecycle.js';

const RANK = { none: 0, grey: 0, green: 1, yellow: 2, orange: 3, red: 4 };

/**
 * Score one route geometry against pins.
 * @returns {{ level:'green'|'yellow'|'orange'|'red', hits:Array<{pin, sev, distM}>, blocker:object|null }}
 */
export function scoreRoute(coords, pins, { mode = 'commuter', bufferM = 300, heavyRainAt } = {}) {
  const hits = [];
  for (const p of pins) {
    if (p.type !== 'flood' && p.type !== 'clog') continue;
    const sev = pinSeverity(p, { mode, heavyRain: p.type === 'clog' && heavyRainAt?.(p) });
    if (RANK[sev] < RANK.yellow) continue;
    const d = distToLineM(p, coords);
    if (d <= bufferM) hits.push({ pin: p, sev, distM: Math.round(d) });
  }
  hits.sort((a, b) => RANK[b.sev] - RANK[a.sev] || a.distM - b.distM);
  return { level: worst(hits.map((h) => h.sev)), hits, blocker: hits.find((h) => RANK[h.sev] >= RANK.orange) ?? null };
}

/** Two via-points offset perpendicular (left/right) to the route at the pin's closest segment. */
export function detourPoints(coords, pin, offsetM = 1000) {
  let bi = 1, bd = Infinity;
  for (let i = 1; i < coords.length; i++) {
    const d = distToLineM(pin, [coords[i - 1], coords[i]]);
    if (d < bd) { bd = d; bi = i; }
  }
  const [x1, y1] = coords[bi - 1], [x2, y2] = coords[bi];
  const k = Math.cos((pin.lat * Math.PI) / 180);
  let nx = -(y2 - y1), ny = (x2 - x1) * k; // perpendicular in metric-ish space
  const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
  const dLng = (nx * offsetM) / (111320 * k), dLat = (ny * offsetM) / 110540;
  return [{ lat: pin.lat + dLat, lng: pin.lng + dLng }, { lat: pin.lat - dLat, lng: pin.lng - dLng }];
}

async function osrm(base, pts, alternatives, signal) {
  const path = pts.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  const url = `${base}/route/v1/driving/${path}?overview=full&geometries=geojson&steps=false${alternatives ? `&alternatives=${alternatives}` : ''}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const j = await res.json();
  if (j.code !== 'Ok') throw new Error(`OSRM ${j.code}`);
  return j.routes.map((r) => ({ coords: r.geometry.coordinates, distanceM: r.distance, durationS: r.duration }));
}

/**
 * Plan a route and return the verdict.
 * @returns {Promise<{ verdict:'safe'|'caution'|'avoid', level, primary:{route,score}, chosen:{route,score}|null, noSafe:boolean, decidingHit:object|null }>}
 */
export async function planRoute(from, to, pins, { osrmUrl, mode, bufferM, detourM, alternatives = 3, signal, heavyRainAt }) {
  const cands = await osrm(osrmUrl, [from, to], alternatives, signal);
  const scored = cands.map((route) => ({ route, score: scoreRoute(route.coords, pins, { mode, bufferM, heavyRainAt }) }));
  const primary = scored[0];
  let chosen = scored.find((s) => !s.score.blocker) ?? null;

  if (!chosen && primary.score.blocker) {
    for (const via of detourPoints(primary.route.coords, primary.score.blocker.pin, detourM)) {
      try {
        const [r] = await osrm(osrmUrl, [from, via, to], 0, signal);
        const s = scoreRoute(r.coords, pins, { mode, bufferM, heavyRainAt });
        if (!s.blocker) { chosen = { route: r, score: s, detour: true }; break; }
      } catch { signal?.throwIfAborted(); /* otherwise try the other side */ }
    }
  }

  const blocked = !!primary.score.blocker;
  const verdict = blocked ? 'avoid' : primary.score.level === 'yellow' ? 'caution' : 'safe';
  return {
    verdict,
    level: primary.score.level,
    primary,
    chosen: blocked ? chosen : primary,
    noSafe: blocked && !chosen,
    decidingHit: primary.score.blocker ?? primary.score.hits[0] ?? null,
  };
}

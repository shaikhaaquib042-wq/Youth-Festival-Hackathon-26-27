// Small geo helpers (no dependencies).
const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

/** Great-circle distance in metres between {lat,lng} points. */
export function distM(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nearest named place within maxM metres, or null. `places` = [{name, lat, lng}] (gazetteer). */
export function nearestPlace(pt, places, maxM) {
  let best = null, bestD = Infinity;
  for (const p of places) {
    const d = distM(pt, p);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best && bestD <= maxM ? { ...best, distM: Math.round(bestD) } : null;
}

/** Distance from point to a polyline [[lng,lat],...] in metres (equirectangular approximation, fine at city scale). */
export function distToLineM(pt, coords) {
  const k = Math.cos(rad(pt.lat)) * 111320, m = 110540;
  const px = pt.lng * k, py = pt.lat * m;
  let best = Infinity;
  for (let i = 1; i < coords.length; i++) {
    const ax = coords[i - 1][0] * k, ay = coords[i - 1][1] * m, bx = coords[i][0] * k, by = coords[i][1] * m;
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(px - (ax + t * dx), py - (ay + t * dy)));
  }
  return best;
}

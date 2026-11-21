import type { Env } from "../env";

export type Mode = "driving" | "walking" | "cycling";
export type LatLng = [number, number];

export interface DirectionsResult {
  provider: "ors" | "graphhopper" | "osrm";
  distance_m: number;
  duration_s: number;
  /** Simplified polyline as [lat, lng] pairs. */
  polyline: LatLng[];
}

function sqSegDist(p: LatLng, a: LatLng, b: LatLng): number {
  const x = b[1] - a[1];
  const y = b[0] - a[0];
  const l = x * x + y * y;
  let t = l ? ((p[1] - a[1]) * x + (p[0] - a[0]) * y) / l : 0;
  t = Math.max(0, Math.min(1, t));
  const dx = a[1] + t * x - p[1];
  const dy = a[0] + t * y - p[0];
  return dx * dx + dy * dy;
}

/** Ramer-Douglas-Peucker, iterative so long routes cannot overflow the stack. */
export function simplify(points: LatLng[], tolerance = 0.0002, maxPoints = 150): LatLng[] {
  if (points.length <= 2) return points;
  let tol = tolerance;
  let out = points;
  for (let round = 0; round < 8; round++) {
    const keep = new Uint8Array(points.length);
    keep[0] = keep[points.length - 1] = 1;
    const stack: [number, number][] = [[0, points.length - 1]];
    while (stack.length) {
      const [s, e] = stack.pop() as [number, number];
      let max = 0;
      let idx = -1;
      for (let i = s + 1; i < e; i++) {
        const d = sqSegDist(points[i] as LatLng, points[s] as LatLng, points[e] as LatLng);
        if (d > max) {
          max = d;
          idx = i;
        }
      }
      if (idx >= 0 && max > tol * tol) {
        keep[idx] = 1;
        stack.push([s, idx], [idx, e]);
      }
    }
    out = points.filter((_, i) => keep[i]);
    if (out.length <= maxPoints) break;
    tol *= 2;
  }
  return out;
}

export function decodePolyline5(str: string): LatLng[] {
  const out: LatLng[] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, b: number;
      do {
        b = str.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && i <= str.length);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += d;
      else lng += d;
    }
    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}

const round = (n: number) => Math.round(n * 1e5) / 1e5;
const ua = (env: Env) => env.OSM_USER_AGENT || "Raasta/1.0 (hackathon project)";

async function osrm(env: Env, from: LatLng, to: LatLng, mode: Mode): Promise<DirectionsResult> {
  const base = (env.OSRM_URL || "https://router.project-osrm.org").replace(/\/$/, "");
  const profile = mode === "walking" ? "foot" : mode === "cycling" ? "bike" : "driving";
  const url = `${base}/route/v1/${profile}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
  const res = await fetch(url, { headers: { "user-agent": ua(env) }, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error("osrm");
  const j = (await res.json()) as { routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] };
  const r = j.routes?.[0];
  if (!r) throw new Error("osrm_empty");
  return {
    provider: "osrm", distance_m: Math.round(r.distance), duration_s: Math.round(r.duration),
    polyline: simplify(r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLng)),
  };
}

async function ors(env: Env, from: LatLng, to: LatLng, mode: Mode): Promise<DirectionsResult> {
  const profile = mode === "walking" ? "foot-walking" : mode === "cycling" ? "cycling-regular" : "driving-car";
  const res = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: env.OSM_ROUTING_API_KEY as string, "user-agent": ua(env) },
    body: JSON.stringify({ coordinates: [[from[1], from[0]], [to[1], to[0]]] }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error("ors");
  const j = (await res.json()) as { routes?: { summary: { distance: number; duration: number }; geometry: string }[] };
  const r = j.routes?.[0];
  if (!r) throw new Error("ors_empty");
  return {
    provider: "ors", distance_m: Math.round(r.summary.distance), duration_s: Math.round(r.summary.duration),
    polyline: simplify(decodePolyline5(r.geometry)),
  };
}

async function graphhopper(env: Env, from: LatLng, to: LatLng, mode: Mode): Promise<DirectionsResult> {
  const profile = mode === "walking" ? "foot" : mode === "cycling" ? "bike" : "car";
  const url =
    `https://graphhopper.com/api/1/route?point=${from[0]},${from[1]}&point=${to[0]},${to[1]}` +
    `&profile=${profile}&points_encoded=false&key=${encodeURIComponent(env.OSM_ROUTING_API_KEY as string)}`;
  const res = await fetch(url, { headers: { "user-agent": ua(env) }, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error("gh");
  const j = (await res.json()) as { paths?: { distance: number; time: number; points: { coordinates: [number, number][] } }[] };
  const p = j.paths?.[0];
  if (!p) throw new Error("gh_empty");
  return {
    provider: "graphhopper", distance_m: Math.round(p.distance), duration_s: Math.round(p.time / 1000),
    polyline: simplify(p.points.coordinates.map(([lng, lat]) => [lat, lng] as LatLng)),
  };
}

/** Works with no key: ORS and GraphHopper are used only when a key exists, otherwise (or on failure) OSRM. */
export async function getDirections(env: Env, from: LatLng, to: LatLng, mode: Mode): Promise<DirectionsResult | undefined> {
  const key = `dir:${mode}:${from.map((n) => n.toFixed(4)).join(",")}:${to.map((n) => n.toFixed(4)).join(",")}`;
  if (env.CACHE) {
    try {
      const hit = await env.CACHE.get(key, "json");
      if (hit) return hit as DirectionsResult;
    } catch {
      /* best effort */
    }
  }
  const provider = (env.OSM_ROUTING_PROVIDER || "osrm").toLowerCase();
  const attempts: (() => Promise<DirectionsResult>)[] = [];
  if (provider === "ors" && env.OSM_ROUTING_API_KEY) attempts.push(() => ors(env, from, to, mode));
  if (provider === "graphhopper" && env.OSM_ROUTING_API_KEY) attempts.push(() => graphhopper(env, from, to, mode));
  attempts.push(() => osrm(env, from, to, mode));
  for (const run of attempts) {
    try {
      const r = await run();
      const rounded: DirectionsResult = { ...r, polyline: r.polyline.map(([a, b]) => [round(a), round(b)] as LatLng) };
      if (env.CACHE) {
        try {
          await env.CACHE.put(key, JSON.stringify(rounded), { expirationTtl: 60 * 60 * 24 * 7 });
        } catch {
          /* ignore */
        }
      }
      return rounded;
    } catch {
      /* next provider */
    }
  }
  return undefined;
}

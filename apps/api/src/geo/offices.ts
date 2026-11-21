import { officesPune, stateByCode } from "@raasta/data";
import type { Office } from "@raasta/data";
import type { Env } from "../env";

export interface OfficeOut {
  id: string;
  name: string;
  type: string;
  address?: string;
  phone?: string;
  email?: string;
  lat?: number;
  lng?: number;
  verified: boolean;
  distance_km?: number;
  source: "registry" | "osm";
}

export interface OfficesResult {
  source: "registry" | "overpass" | "none";
  offices: OfficeOut[];
  attribution?: string;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fromRegistry(o: Office, from?: { lat: number; lng: number }): OfficeOut {
  const out: OfficeOut = {
    id: o.id, name: o.name, type: o.type, address: o.address, phone: o.phone, email: o.email,
    lat: o.lat, lng: o.lng, verified: o.verified, source: "registry",
  };
  if (from && o.lat !== undefined && o.lng !== undefined) out.distance_km = Math.round(haversineKm(from, { lat: o.lat, lng: o.lng }) * 10) / 10;
  return out;
}

// Overpass tag per office type. Types without an honest OSM tag have no fallback.
const OSM_TAGS: Record<string, string> = {
  police: '["amenity"="police"]',
  court: '["amenity"="courthouse"]',
  ward_office: '["amenity"="townhall"]',
  municipal_hq: '["amenity"="townhall"]',
};

export const OSM_ATTRIBUTION = "Map data from OpenStreetMap contributors, ODbL.";

/** Registry offices first (Pune is the deep city). Overpass fallback for everywhere else, cached in KV. */
export async function findOffices(
  env: Env,
  q: { type?: string; lat?: number; lng?: number; state_code?: string; city?: string },
): Promise<OfficesResult> {
  const from = q.lat !== undefined && q.lng !== undefined ? { lat: q.lat, lng: q.lng } : undefined;
  const inPune = q.state_code === "MH" && (!q.city || /pune/i.test(q.city) || !!from);
  if (inPune || (!q.state_code && !from)) {
    const list = officesPune.filter((o) => !q.type || o.type === q.type).map((o) => fromRegistry(o, from));
    if (from) list.sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
    if (list.length && (!from || inPune)) return { source: "registry", offices: list.slice(0, 25) };
  }
  if (!from) return { source: "none", offices: [] };

  const tag = OSM_TAGS[q.type ?? "police"];
  if (!tag) return { source: "none", offices: [] };
  const key = `ov:${q.type ?? "police"}:${from.lat.toFixed(2)},${from.lng.toFixed(2)}`;
  if (env.CACHE) {
    try {
      const hit = await env.CACHE.get(key, "json");
      if (hit) return hit as OfficesResult;
    } catch {
      /* best effort */
    }
  }
  const query = `[out:json][timeout:15];nwr${tag}(around:8000,${from.lat.toFixed(4)},${from.lng.toFixed(4)});out center 25;`;
  try {
    const res = await fetch(env.OVERPASS_URL || "https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "user-agent": env.OSM_USER_AGENT || "Raasta/1.0 (hackathon project)", "content-type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { source: "none", offices: [] };
    const j = (await res.json()) as {
      elements?: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[];
    };
    const offices: OfficeOut[] = (j.elements ?? [])
      .map((e): OfficeOut | undefined => {
        const lat = e.lat ?? e.center?.lat;
        const lng = e.lon ?? e.center?.lon;
        const name = e.tags?.name;
        if (lat === undefined || lng === undefined || !name) return undefined;
        const addr = [e.tags?.["addr:housenumber"], e.tags?.["addr:street"], e.tags?.["addr:city"]].filter(Boolean).join(", ");
        return {
          id: `overpass:${e.type}${e.id}`, name, type: q.type ?? "police", address: addr || undefined,
          phone: e.tags?.phone ?? e.tags?.["contact:phone"], lat, lng, verified: false,
          distance_km: Math.round(haversineKm(from, { lat, lng }) * 10) / 10, source: "osm",
        };
      })
      .filter((o): o is OfficeOut => !!o)
      .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0))
      .slice(0, 15);
    const result: OfficesResult = { source: "overpass", offices, attribution: OSM_ATTRIBUTION };
    if (env.CACHE) {
      try {
        await env.CACHE.put(key, JSON.stringify(result), { expirationTtl: 60 * 60 * 24 * 30 });
      } catch {
        /* ignore */
      }
    }
    return result;
  } catch {
    return { source: "none", offices: [] };
  }
}

/** State level legal aid or grievance fallbacks come from states.json, never invented. */
export function stateFallback(code: string | undefined) {
  return code ? stateByCode(code) : undefined;
}

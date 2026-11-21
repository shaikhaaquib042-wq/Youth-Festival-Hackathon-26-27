import type { Env } from "../env";
import { sha256Hex } from "../lib/http";

export interface ForwardResult {
  lat: number;
  lng: number;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Landmark text to a point through Nominatim. Coordinates are rounded to 3 decimals. Cached by a hash of the text. */
export async function forwardGeocode(env: Env, text: string): Promise<ForwardResult | undefined> {
  const q = text.trim().slice(0, 120);
  if (q.length < 3) return undefined;
  const key = `fg:${await sha256Hex(q.toLowerCase())}`;
  if (env.CACHE) {
    try {
      const hit = await env.CACHE.get(key, "json");
      if (hit) return hit as ForwardResult;
    } catch {
      /* best effort */
    }
  }
  try {
    const base = (env.NOMINATIM_URL || "https://nominatim.openstreetmap.org").replace(/\/$/, "");
    const res = await fetch(`${base}/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`, {
      headers: { "user-agent": env.OSM_USER_AGENT || "Raasta/1.0 (hackathon project)", accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return undefined;
    const j = (await res.json()) as { lat?: string; lon?: string }[];
    const hit = j[0];
    if (!hit?.lat || !hit.lon) return undefined;
    const out = { lat: round3(Number(hit.lat)), lng: round3(Number(hit.lon)) };
    if (!Number.isFinite(out.lat) || !Number.isFinite(out.lng)) return undefined;
    if (env.CACHE) {
      try {
        await env.CACHE.put(key, JSON.stringify(out), { expirationTtl: 60 * 60 * 24 * 30 });
      } catch {
        /* ignore */
      }
    }
    return out;
  } catch {
    return undefined;
  }
}

import type { Env } from "../env";
import { stateCodeFrom, type CfLike } from "./resolver";

export interface ReverseResult {
  source: "nominatim" | "cf" | "none";
  state_code?: string;
  state?: string;
  city?: string;
  suburb?: string;
  coarse?: boolean;
}

const round3 = (n: number) => (Math.round(n * 1000) / 1000).toFixed(3);

function fromCf(cf: CfLike): ReverseResult {
  const state_code = stateCodeFrom(cf.regionCode) ?? stateCodeFrom(cf.region);
  if (!state_code && !cf.city) return { source: "none" };
  return { source: "cf", state_code, state: cf.region, city: cf.city, coarse: true };
}

/** Reverse geocode through Nominatim (1 request per second policy: results cached by 3-decimal key), else coarse request.cf. */
export async function reverseGeocode(env: Env, lat: number, lng: number, cf: CfLike): Promise<ReverseResult> {
  const key = `rg:${round3(lat)},${round3(lng)}`;
  if (env.CACHE) {
    try {
      const hit = await env.CACHE.get(key, "json");
      if (hit) return hit as ReverseResult;
    } catch {
      /* best effort */
    }
  }
  try {
    const base = (env.NOMINATIM_URL || "https://nominatim.openstreetmap.org").replace(/\/$/, "");
    const url = `${base}/reverse?format=jsonv2&zoom=14&addressdetails=1&lat=${round3(lat)}&lon=${round3(lng)}`;
    const res = await fetch(url, {
      headers: { "user-agent": env.OSM_USER_AGENT || "Raasta/1.0 (hackathon project)", accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const j = (await res.json()) as { address?: Record<string, string> };
      const a = j.address ?? {};
      const out: ReverseResult = {
        source: "nominatim",
        state: a.state,
        state_code: stateCodeFrom(a.state),
        city: a.city ?? a.town ?? a.village ?? a.county,
        suburb: a.suburb ?? a.neighbourhood,
      };
      if (env.CACHE) {
        try {
          await env.CACHE.put(key, JSON.stringify(out), { expirationTtl: 60 * 60 * 24 * 30 });
        } catch {
          /* ignore */
        }
      }
      return out;
    }
  } catch {
    /* fall back to request.cf */
  }
  return fromCf(cf);
}

export function coarseFromCf(cf: CfLike): ReverseResult {
  return fromCf(cf);
}

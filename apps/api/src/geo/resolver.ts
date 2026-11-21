import { officesPune, states, stateByCode } from "@raasta/data";
import type { GeoContext, IntakeSlots } from "@raasta/rules/types";
import { wardForPoint } from "./pune";

/** Neighbourhoods and localities that belong to Pimpri Chinchwad Municipal Corporation, not Pune Municipal Corporation. */
const PCMC_AREAS = [
  "pimpri", "chinchwad", "pimpri chinchwad", "pimpri-chinchwad", "nigdi", "akurdi", "bhosari", "wakad", "thergaon",
  "ravet", "kalewadi", "rahatani", "chikhli", "moshi", "talawade", "pimple saudagar", "pimple gurav", "pimple nilakh",
  "kasarwadi", "punawale", "chinchwadgaon", "sangvi", "new sangvi",
];

const PUNE_NAMES = ["pune", "pune city"];

const norm = (s: string | undefined) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

export function isPcmcArea(name: string | undefined): boolean {
  const n = norm(name);
  return !!n && PCMC_AREAS.some((a) => n === a || n.includes(a));
}

/** Accepts a 2 letter code or a state name ("Maharashtra"). Returns the code, or undefined. */
export function stateCodeFrom(input: string | undefined): string | undefined {
  const n = norm(input);
  if (!n) return undefined;
  if (n.length === 2 && stateByCode(n.toUpperCase())) return n.toUpperCase();
  return states.find((s) => norm(s.name) === n)?.code;
}

export interface CfLike {
  region?: string;
  regionCode?: string;
  city?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
}

export interface ResolveOptions {
  /** A ward office id picked by the user in the ward picker. */
  wardId?: string;
  /** Tenant id from env, set only when a real or sandbox DIGIT tenant is configured. */
  digitTenantId?: string;
  /** Free text area or neighbourhood (for example from a guided question). */
  area?: string;
}

export const WARD_OFFICE_IDS = new Set(officesPune.filter((o) => o.type === "ward_office").map((o) => o.id));

/** Resolves slots plus coarse request location into a GeoContext. Never ships boundary data to the browser. */
export function resolveGeo(slots: Partial<IntakeSlots>, cf: CfLike = {}, opts: ResolveOptions = {}): GeoContext {
  const state_code = slots.state_code?.toUpperCase() ?? stateCodeFrom(cf.regionCode) ?? stateCodeFrom(cf.region);
  const city = slots.city ?? cf.city;
  const ctx: GeoContext = { state_code, city, coverage: "unknown" };
  if (!state_code) return ctx;

  const info = stateByCode(state_code);
  ctx.coverage = state_code === "MH" ? "deep" : (info?.coverage ?? "standard");
  if (opts.digitTenantId) ctx.digit_tenant_id = opts.digitTenantId;
  if (state_code !== "MH") return ctx;

  const places = [city, opts.area, slots.district];
  const inPcmc = places.some((p) => isPcmcArea(p));
  const inPune = places.some((p) => PUNE_NAMES.includes(norm(p)));
  if (inPcmc) {
    ctx.ulb = "PCMC";
    return ctx;
  }
  if (inPune) {
    ctx.ulb = "PMC";
    if (opts.wardId && WARD_OFFICE_IDS.has(opts.wardId)) ctx.pmc_ward_id = opts.wardId;
    else if (slots.lat !== undefined && slots.lng !== undefined) {
      const w = wardForPoint(slots.lat, slots.lng);
      if (w) ctx.pmc_ward_id = w;
    }
  }
  return ctx;
}

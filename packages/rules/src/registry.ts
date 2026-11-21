// Read-only helpers over @raasta/data. Every fee, SLA, URL, phone and email the rule engine emits is read here.
import { platformById, officeById, stateByCode, platforms, officesPune, states } from "@raasta/data";
import type { Platform, Office } from "@raasta/data";
import type { OfficeRef } from "./types";

export const NOT_PUBLISHED = "Not published in the official registry";

type Obj = Record<string, unknown>;

export function plat(id: string): Platform {
  const p = platformById(id);
  if (!p) throw new Error(`rules: unknown platform id ${id}`);
  return p;
}

function fmtValue(key: string, v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "number") {
    if (/_working_days$/.test(key)) return `${v} working days`;
    if (/_days$/.test(key)) return `${v} days`;
    if (/_hours$/.test(key)) return `${v} hours`;
    if (/_minutes$/.test(key)) return `${v} minutes`;
    if (/_years$/.test(key)) return `${v} years`;
    if (/_months$/.test(key)) return `${v} months`;
    return String(v);
  }
  return undefined;
}

/** Upper bound in INR of a fee slab range string, e.g. "Up to INR 5 lakh". Infinity when open ended. */
function slabUpper(range: string): number {
  const m = /(?:to|Up to) INR ([\d,]+) (lakh|crore)/i.exec(range);
  if (!m) return Infinity;
  const n = Number(m[1].replace(/,/g, ""));
  return n * (m[2].toLowerCase() === "crore" ? 10_000_000 : 100_000);
}

export function feeOf(pid: string, key?: string, amountInr?: number): string {
  const fees = (plat(pid).fees ?? {}) as Obj;
  const slabs = fees.slabs_by_consideration_paid;
  if (!key && Array.isArray(slabs) && slabs.length) {
    const list = slabs as { range: string; fee_inr: number | string }[];
    const hit =
      (amountInr !== undefined ? list.find((s) => amountInr <= slabUpper(s.range)) : undefined) ?? list[0];
    return `${hit.range}: INR ${hit.fee_inr}`;
  }
  const v = fmtValue(key ?? "online", fees[key ?? "online"]);
  return v ?? NOT_PUBLISHED;
}

export function slaOf(pid: string, key?: string): string {
  if (!key) return NOT_PUBLISHED;
  const sla = (plat(pid).sla_and_timelines ?? {}) as Obj;
  return fmtValue(key, sla[key]) ?? NOT_PUBLISHED;
}

const URL_KEY_PREFERENCE = [
  "home", "home_and_project_search", "complaint_portal", "mahapolice_citizen_portal",
  "irdai_gro_directory", "nalsa_home", "bima_bharosa_portal", "play_store", "upyog_portal",
];

function isHttp(v: unknown): v is string {
  return typeof v === "string" && /^https?:\/\//.test(v);
}

export function primaryUrl(pid: string, key?: string): string {
  const urls = (plat(pid).urls ?? {}) as Obj;
  if (key && isHttp(urls[key])) return urls[key] as string;
  for (const k of URL_KEY_PREFERENCE) if (isHttp(urls[k])) return urls[k] as string;
  const first = Object.values(urls).find(isHttp);
  if (first) return first;
  throw new Error(`rules: platform ${pid} has no URL`);
}

/** Convert a handbook template ({{encoded_x}}) into the contract form ({summary}). */
export function normTemplate(t: string): string {
  return t.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => `{${name.startsWith("encoded_") ? "summary" : name}}`);
}

export function waTemplate(pid: string): string | undefined {
  const t = ((plat(pid).automation ?? {}) as Obj).whatsapp_prefill_url_template;
  return typeof t === "string" ? normTemplate(t) : undefined;
}

export function mailtoTemplate(pid: string): string | undefined {
  const t = ((plat(pid).automation ?? {}) as Obj).mailto_template;
  return typeof t === "string" ? t : undefined;
}

export function emailsOf(pid: string): string[] {
  const e = ((plat(pid).contact_channels ?? {}) as Obj).email;
  if (typeof e === "string") return [e];
  if (Array.isArray(e)) return e.filter((x): x is string => typeof x === "string");
  return [];
}

/** First helpline whose text starts with `prefix`; returns the leading phone token. */
export function helpline(pid: string, prefix: string): string | undefined {
  const list = ((plat(pid).contact_channels ?? {}) as Obj).helpline;
  if (!Array.isArray(list)) return undefined;
  const hit = list.find((h) => typeof h === "string" && h.startsWith(prefix)) as string | undefined;
  if (!hit) return undefined;
  const m = /^[\d+][\d -]*\d/.exec(hit);
  return m ? m[0].trim() : undefined;
}

export function officeRef(id: string): OfficeRef | undefined {
  const o: Office | undefined = officeById(id);
  if (!o) return undefined;
  return {
    office_id: o.id, name: o.name, phone: o.phone, email: o.email, address: o.address,
    lat: o.lat, lng: o.lng, verified: o.verified,
  };
}

export function stateName(code?: string): string | undefined {
  return code ? stateByCode(code)?.name : undefined;
}

/** Every https URL that appears anywhere in the registry (platforms + state records). */
export function registeredUrls(): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown): void => {
    if (isHttp(v)) {
      out.add(v);
      if (v.includes("{{")) out.add(normTemplate(v));
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(platforms);
  walk(states);
  return out;
}

const PHONE_RE = /\+?\d[\d -]{1,}\d/g;
function normPhone(s: string): string {
  return s.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
}

/** Every phone-like token that appears in the registry, digits only. */
export function registeredPhones(): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown): void => {
    if (typeof v === "string") {
      for (const m of v.matchAll(PHONE_RE)) out.add(normPhone(m[0]));
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(platforms);
  walk(officesPune);
  return out;
}
export { normPhone };

export function registeredEmails(): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown): void => {
    if (typeof v === "string") {
      for (const m of v.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) out.add(m[0].toLowerCase());
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(platforms);
  walk(officesPune);
  return out;
}

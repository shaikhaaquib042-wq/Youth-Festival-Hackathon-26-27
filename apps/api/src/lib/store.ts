import { redact } from "@raasta/rules";
import type { Env } from "../env";
import { HttpError, newId } from "./http";

function db(env: Env): D1Database {
  if (!env.DB) throw new HttpError(503, "unavailable");
  return env.DB;
}

const nowIso = () => new Date().toISOString();

export interface FeedbackInput {
  rating?: number;
  category?: string;
  message: string;
  page?: string;
  lang?: string;
}

export async function storeFeedback(env: Env, f: FeedbackInput): Promise<string> {
  const id = newId();
  await db(env)
    .prepare("INSERT INTO feedback (id, created_at, rating, category, message, page, lang) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)")
    .bind(id, nowIso(), f.rating ?? null, f.category ?? null, redact(f.message), f.page ?? null, f.lang ?? null)
    .run();
  return id;
}

export interface SystemRequestInput {
  state?: string;
  city: string;
  dispute_desc: string;
  portal_url?: string;
  contact_optional?: string;
}

/** Only http(s) URLs are kept; anything else is dropped rather than stored. */
export function cleanPortalUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString().slice(0, 300) : undefined;
  } catch {
    return undefined;
  }
}

export async function storeSystemRequest(env: Env, r: SystemRequestInput): Promise<string> {
  const id = newId();
  await db(env)
    .prepare(
      "INSERT INTO system_requests (id, created_at, state, city, dispute_desc, portal_url, contact_optional) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(id, nowIso(), r.state ?? null, r.city, redact(r.dispute_desc), cleanPortalUrl(r.portal_url) ?? null, r.contact_optional ?? null)
    .run();
  return id;
}

export interface DigitRow {
  id: string;
  tenant_id: string | null;
  service_request_id: string;
  status: string | null;
}

export async function storeDigitSubmission(env: Env, tenantId: string, serviceRequestId: string, status: string): Promise<string> {
  const id = newId();
  await db(env)
    .prepare("INSERT INTO digit_submissions (id, created_at, tenant_id, service_request_id, status) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(id, nowIso(), tenantId, serviceRequestId, status)
    .run();
  return id;
}

export async function findDigitByRef(env: Env, ref: string): Promise<DigitRow | null> {
  if (!env.DB) return null;
  return env.DB.prepare("SELECT id, tenant_id, service_request_id, status FROM digit_submissions WHERE id = ?1 OR service_request_id = ?1 LIMIT 1")
    .bind(ref)
    .first<DigitRow>();
}

export type SubmittedKind = "feedback" | "system_request" | "digit";

/** Finds which table holds an id so /r/submitted/:id can show the right confirmation. */
export async function findSubmitted(env: Env, id: string): Promise<{ kind: SubmittedKind; digit?: DigitRow } | null> {
  if (!env.DB) return null;
  const digit = await findDigitByRef(env, id);
  if (digit) return { kind: "digit", digit };
  const fb = await env.DB.prepare("SELECT id FROM feedback WHERE id = ?1").bind(id).first();
  if (fb) return { kind: "feedback" };
  const sr = await env.DB.prepare("SELECT id FROM system_requests WHERE id = ?1").bind(id).first();
  if (sr) return { kind: "system_request" };
  return null;
}

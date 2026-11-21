import { FLAGS } from "@raasta/config";
import type { Env } from "../env";
import { mockDigitFetch } from "./mock";

export const DEMO_TENANT = "demo.sandbox";

export interface DigitInput {
  service_code: string;
  description: string;
  tenant_id?: string;
  city?: string;
  locality_code?: string;
  lat?: number;
  lng?: number;
}

export interface DigitCreated {
  ok: true;
  demo: boolean;
  tenant_id: string;
  service_request_id: string;
  status: string;
  citizen_url?: string;
}

export interface DigitStatus {
  ok: boolean;
  demo: boolean;
  service_request_id: string;
  status?: string;
  citizen_url?: string;
}

/** Demo (mock) when no gateway URL is set or the digit_sandbox flag is on. DIGIT_SANDBOX="false" forces the live gateway. */
export function isDemo(env: Env): boolean {
  if (!env.DIGIT_BASE_URL) return true;
  if (env.DIGIT_SANDBOX === "false") return false;
  return env.DIGIT_SANDBOX === "true" || FLAGS.digit_sandbox;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

function client(env: Env): { base: string; fetcher: FetchLike; demo: boolean } {
  const demo = isDemo(env);
  return {
    demo,
    base: demo ? "https://digit.demo.invalid" : (env.DIGIT_BASE_URL as string).replace(/\/$/, ""),
    fetcher: demo ? mockDigitFetch : (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(20_000) }),
  };
}

function requestInfo(action: string, authToken: string, lang = "en_IN") {
  const ts = Date.now();
  return { apiId: "Rainmaker", ver: "1.0", ts, action, msgId: `${new Date(ts).toISOString().slice(0, 10).replace(/-/g, "")}|${lang}`, authToken };
}

/**
 * Citizen token via OAuth client credentials against the configured gateway.
 * NOTE: the exact grant used by a given ULB deployment varies; this is verified against the demo mock only.
 */
async function citizenToken(env: Env, base: string, fetcher: FetchLike): Promise<string> {
  const basic = btoa(`${env.DIGIT_CLIENT_ID ?? "egov-user-client"}:${env.DIGIT_CLIENT_SECRET ?? ""}`);
  const res = await fetcher(`${base}/user/oauth/token`, {
    method: "POST",
    headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials&scope=read",
  });
  if (!res.ok) throw new Error("digit_auth");
  const j = (await res.json()) as { access_token?: string };
  if (!j.access_token) throw new Error("digit_auth");
  return j.access_token;
}

function citizenUrl(env: Env, id: string): string | undefined {
  return env.DIGIT_CITIZEN_UI_URL ? `${env.DIGIT_CITIZEN_UI_URL.replace(/\/$/, "")}/complaints/${encodeURIComponent(id)}` : undefined;
}

/** POST pgr-services/v2/request/_create with the RequestInfo envelope (handbook 1.2). Evidence upload (egov-filestore) is a later step. */
export async function createComplaint(env: Env, input: DigitInput): Promise<DigitCreated> {
  const { base, fetcher, demo } = client(env);
  const tenantId = input.tenant_id ?? env.DIGIT_TENANT_ID ?? (demo ? DEMO_TENANT : "");
  if (!tenantId) throw new Error("digit_no_tenant");
  const token = await citizenToken(env, base, fetcher);
  const body = {
    RequestInfo: requestInfo("_create", token),
    service: {
      tenantId,
      serviceCode: input.service_code,
      description: input.description,
      address: {
        city: input.city,
        ...(input.locality_code ? { locality: { code: input.locality_code } } : {}),
        ...(input.lat !== undefined && input.lng !== undefined ? { geoLocation: { latitude: input.lat, longitude: input.lng } } : {}),
      },
    },
    workflow: { action: "APPLY" },
  };
  const res = await fetcher(`${base}/pgr-services/v2/request/_create`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("digit_create");
  const j = (await res.json()) as { ServiceWrappers?: { service?: { serviceRequestId?: string; applicationStatus?: string } }[] };
  const svc = j.ServiceWrappers?.[0]?.service;
  if (!svc?.serviceRequestId) throw new Error("digit_create");
  return {
    ok: true, demo, tenant_id: tenantId, service_request_id: svc.serviceRequestId,
    status: svc.applicationStatus ?? "PENDINGFORASSIGNMENT", citizen_url: demo ? undefined : citizenUrl(env, svc.serviceRequestId),
  };
}

export async function searchComplaint(env: Env, id: string, tenantId?: string): Promise<DigitStatus> {
  const { base, fetcher, demo } = client(env);
  const tenant = tenantId ?? env.DIGIT_TENANT_ID ?? (demo ? DEMO_TENANT : "");
  const token = await citizenToken(env, base, fetcher);
  const res = await fetcher(
    `${base}/pgr-services/v2/request/_search?tenantId=${encodeURIComponent(tenant)}&serviceRequestId=${encodeURIComponent(id)}`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ RequestInfo: requestInfo("_search", token) }) },
  );
  if (!res.ok) return { ok: false, demo, service_request_id: id };
  const j = (await res.json()) as { ServiceWrappers?: { service?: { applicationStatus?: string } }[] };
  const svc = j.ServiceWrappers?.[0]?.service;
  return { ok: !!svc, demo, service_request_id: id, status: svc?.applicationStatus, citizen_url: demo ? undefined : citizenUrl(env, id) };
}

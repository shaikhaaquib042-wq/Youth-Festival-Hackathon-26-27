// In-process mock of the DIGIT/UPYOG PGR gateway for the demo sandbox. It answers the same paths and envelope shapes
// as the real services (handbook 1.2), so the adapter code path is identical in demo and live mode.
// State is per isolate; the durable record is the digit_submissions row in D1.

interface MockRecord {
  serviceRequestId: string;
  tenantId: string;
  serviceCode: string;
  applicationStatus: string;
  createdTime: number;
}

const store = new Map<string, MockRecord>();
let counter = 0;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export function resetMock(): void {
  store.clear();
  counter = 0;
}

/** A fetch-compatible handler. `url` is the full URL the adapter would call on a real gateway. */
export async function mockDigitFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const u = new URL(url);
  const path = u.pathname;
  if (path.endsWith("/user/oauth/token")) {
    return json({ access_token: "demo-citizen-token", token_type: "bearer", expires_in: 3600 });
  }
  const body = init.body && typeof init.body === "string" ? safeParse(init.body) : {};
  const info = (body as { RequestInfo?: { authToken?: string } }).RequestInfo;
  if (!info?.authToken) return json({ Errors: [{ code: "UNAUTHORIZED" }] }, 401);

  if (path.endsWith("/pgr-services/v2/request/_create")) {
    const service = (body as { service?: { tenantId?: string; serviceCode?: string } }).service;
    if (!service?.tenantId || !service.serviceCode) return json({ Errors: [{ code: "INVALID_REQUEST" }] }, 400);
    counter += 1;
    const serviceRequestId = `DEMO-PGR-${Date.now().toString(36).toUpperCase()}-${String(counter).padStart(3, "0")}`;
    const rec: MockRecord = {
      serviceRequestId, tenantId: service.tenantId, serviceCode: service.serviceCode,
      applicationStatus: "PENDINGFORASSIGNMENT", createdTime: Date.now(),
    };
    store.set(serviceRequestId, rec);
    return json({
      ResponseInfo: { apiId: "Rainmaker", status: "successful" },
      ServiceWrappers: [{ service: { ...service, serviceRequestId, applicationStatus: rec.applicationStatus }, workflow: { action: "APPLY" } }],
    });
  }
  if (path.endsWith("/pgr-services/v2/request/_search")) {
    const id = u.searchParams.get("serviceRequestId") ?? "";
    const rec = store.get(id);
    return json({
      ResponseInfo: { apiId: "Rainmaker", status: "successful" },
      ServiceWrappers: rec ? [{ service: { serviceRequestId: rec.serviceRequestId, tenantId: rec.tenantId, applicationStatus: rec.applicationStatus } }] : [],
    });
  }
  return json({ Errors: [{ code: "NOT_FOUND" }] }, 404);
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

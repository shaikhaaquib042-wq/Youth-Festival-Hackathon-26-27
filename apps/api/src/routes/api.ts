import { Hono } from "hono";
import { z } from "zod";
import { disputeById } from "@raasta/data";
import { redact, route, signToken, verifyToken } from "@raasta/rules";
import type { GeoContext } from "@raasta/rules/types";
import { AiUnavailableError, StreamUrlFilter, aiAvailable, allowedUrlSet, complete } from "../ai";
import { buildChatSystem } from "../ai/chat";
import { runIntake } from "../ai/intake";
import { createComplaint, isDemo, searchComplaint } from "../digit/adapter";
import type { AppEnv } from "../env";
import { getDirections, type Mode } from "../geo/directions";
import { findOffices } from "../geo/offices";
import { resolveGeo, type CfLike } from "../geo/resolver";
import { coarseFromCf, reverseGeocode } from "../geo/reverse";
import { HttpError, clientIp, parseJson } from "../lib/http";
import {
  chatBodySchema, digitSubmitSchema, feedbackSchema, intakeBodySchema, routeBodySchema, systemRequestSchema, translateBodySchema,
} from "../lib/schemas";
import { verifyTurnstile } from "../lib/security";
import { findDigitByRef, storeDigitSubmission, storeFeedback, storeSystemRequest } from "../lib/store";
import { translateText } from "../translate";

export const api = new Hono<AppEnv>();

export const cfOf = (req: Request): CfLike => ((req as unknown as { cf?: CfLike }).cf ?? {}) as CfLike;

api.get("/health", (c) => c.json({ ok: true }));

// ---- intake: text -> IntakeSlots (+ follow-up questions) ----
api.post("/intake", async (c) => {
  const body = parseJson(c, intakeBodySchema);
  const { slots, source } = await runIntake(c.env, body.text, { state_code: body.state_code, city: body.city });
  const d = disputeById(slots.dispute_type);
  const follow_up = (d?.questions ?? [])
    .filter((q) => slots.missing_fields.includes(q.id))
    .map((q) => ({ id: q.id, label_en: q.label_en, type: q.type, options: q.options }));
  return c.json({ slots, source, ai: aiAvailable(c.env), follow_up });
});

// ---- route: server copy of the rule engine ----
api.post("/route", async (c) => {
  const body = parseJson(c, routeBodySchema);
  const slots = body.slots as import("@raasta/rules/types").IntakeSlots;
  const geo: GeoContext =
    (body.geo as GeoContext | undefined) ??
    resolveGeo(slots, cfOf(c.req.raw), { wardId: body.ward_id, digitTenantId: c.env.DIGIT_TENANT_ID });
  const result = route(slots, geo);
  const token = c.env.TOKEN_SECRET ? await signToken(slots, geo, c.env.TOKEN_SECRET, Date.now()) : undefined;
  return c.json({ result, geo, token });
});

// ---- chat: SSE, system prompt holds only the RouteResult and its platform records ----
api.post("/chat", async (c) => {
  const body = parseJson(c, chatBodySchema);
  if (!aiAvailable(c.env)) throw new HttpError(503, "ai_unavailable");
  let routeResult;
  if (body.token && c.env.TOKEN_SECRET) {
    const v = await verifyToken(body.token, c.env.TOKEN_SECRET, Date.now());
    if (v.ok) routeResult = route(v.slots, v.geo);
  }
  const system = buildChatSystem(body.lang ?? "en", routeResult);
  const messages = body.messages.map((m) => ({ role: m.role, content: redact(m.content) }));
  let out;
  try {
    out = await complete(c.env, { system, messages, stream: true, maxTokens: 700 });
  } catch (e) {
    if (e instanceof AiUnavailableError) throw new HttpError(503, "ai_unavailable");
    throw e;
  }
  const filter = new StreamUrlFilter(allowedUrlSet());
  const enc = new TextEncoder();
  const send = (t: string) => enc.encode(`data: ${JSON.stringify({ t })}\n\n`);
  const source: AsyncIterable<string> = out.stream ?? (async function* () { yield out.text as string; })();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of source) {
          const safe = filter.push(chunk);
          if (safe) controller.enqueue(send(safe));
        }
        const rest = filter.flush();
        if (rest) controller.enqueue(send(rest));
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
      } catch {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: "stream_error" })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
});

// ---- translate ----
api.post("/translate", async (c) => {
  const body = parseJson(c, translateBodySchema);
  return c.json(await translateText(c.env, body.text, body.lang, body.source ?? "en"));
});

// ---- geo ----
const reverseQuery = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) });
api.get("/geo/reverse", async (c) => {
  const q = reverseQuery.safeParse({ lat: c.req.query("lat"), lng: c.req.query("lng") });
  const cf = cfOf(c.req.raw);
  if (!q.success) return c.json({ ...coarseFromCf(cf), geo: resolveGeo({}, cf) });
  const r = await reverseGeocode(c.env, q.data.lat, q.data.lng, cf);
  const geo = resolveGeo(
    { state_code: r.state_code, city: r.city, lat: q.data.lat, lng: q.data.lng },
    cf,
    { area: r.suburb, digitTenantId: c.env.DIGIT_TENANT_ID },
  );
  c.header("cache-control", "private, max-age=3600");
  return c.json({ ...r, geo });
});

const officesQuery = z.object({
  type: z.string().max(40).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  state: z.string().max(40).optional(),
  city: z.string().max(80).optional(),
});
api.get("/offices", async (c) => {
  const q = officesQuery.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!q.success) throw new HttpError(422, "invalid_input");
  const cf = cfOf(c.req.raw);
  const state_code = q.data.state?.toUpperCase() ?? resolveGeo({}, cf).state_code;
  const res = await findOffices(c.env, { type: q.data.type, lat: q.data.lat, lng: q.data.lng, state_code, city: q.data.city ?? cf.city });
  c.header("cache-control", "private, max-age=600");
  return c.json(res);
});

const pair = z.string().regex(/^-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?$/);
const dirQuery = z.object({ from: pair, to: pair, mode: z.enum(["driving", "walking", "cycling"]).default("driving") });
api.get("/directions", async (c) => {
  const q = dirQuery.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!q.success) throw new HttpError(422, "invalid_input");
  const toPt = (s: string): [number, number] => s.split(",").map(Number) as [number, number];
  const from = toPt(q.data.from);
  const to = toPt(q.data.to);
  if (Math.abs(from[0]) > 90 || Math.abs(to[0]) > 90 || Math.abs(from[1]) > 180 || Math.abs(to[1]) > 180) throw new HttpError(422, "invalid_input");
  const r = await getDirections(c.env, from, to, q.data.mode as Mode);
  if (!r) throw new HttpError(502, "unavailable");
  return c.json(r);
});

// ---- DIGIT / UPYOG submission ----
api.post("/submit/digit", async (c) => {
  const body = parseJson(c, digitSubmitSchema);
  const input = { ...body, description: redact(body.description) };
  let created;
  try {
    created = await createComplaint(c.env, input);
  } catch {
    throw new HttpError(502, "unavailable");
  }
  let id: string | undefined;
  try {
    id = await storeDigitSubmission(c.env, created.tenant_id, created.service_request_id, created.status);
  } catch {
    // The complaint exists even if the local reference could not be stored; still tell the user.
  }
  return c.json(
    {
      demo: created.demo,
      service_request_id: created.service_request_id,
      status: created.status,
      tenant_id: created.tenant_id,
      citizen_url: created.citizen_url,
      confirmation_path: id ? `/r/submitted/${id}` : undefined,
      notice: created.demo ? "Demo sandbox. Nothing was sent to a real municipal system." : undefined,
    },
    201,
  );
});

api.get("/submit/digit/:id", async (c) => {
  const ref = c.req.param("id");
  if (!/^[A-Za-z0-9_.-]{4,80}$/.test(ref)) throw new HttpError(422, "invalid_input");
  const row = await findDigitByRef(c.env, ref);
  const serviceRequestId = row?.service_request_id ?? ref;
  let s;
  try {
    s = await searchComplaint(c.env, serviceRequestId, row?.tenant_id ?? undefined);
  } catch {
    s = undefined;
  }
  if (s?.ok) return c.json({ demo: s.demo, service_request_id: s.service_request_id, status: s.status, citizen_url: s.citizen_url });
  if (row) return c.json({ demo: isDemo(c.env), service_request_id: row.service_request_id, status: row.status, stale: true });
  throw new HttpError(404, "not_found");
});

// ---- feedback and system requests ----
async function guardTurnstile(c: import("hono").Context<AppEnv>, token: string | undefined) {
  if (!(await verifyTurnstile(c.env, token, clientIp(c)))) throw new HttpError(403, "verification_failed");
}

api.post("/feedback", async (c) => {
  const body = parseJson(c, feedbackSchema);
  await guardTurnstile(c, body["cf-turnstile-response"]);
  const id = await storeFeedback(c.env, body);
  return c.json({ ok: true, id }, 201);
});

api.post("/system-request", async (c) => {
  const body = parseJson(c, systemRequestSchema);
  await guardTurnstile(c, body["cf-turnstile-response"]);
  const id = await storeSystemRequest(c.env, body);
  return c.json({ ok: true, id }, 201);
});

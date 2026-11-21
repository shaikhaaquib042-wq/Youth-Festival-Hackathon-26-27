import { Hono, type Context } from "hono";
import { disputeById } from "@raasta/data";
import { isLocale, t, type Locale } from "@raasta/i18n";
import { liveTimers, route, signToken, verifyToken } from "@raasta/rules";
import type { GeoContext, IntakeSlots } from "@raasta/rules/types";
import { runIntake } from "../ai/intake";
import { isDemo, searchComplaint } from "../digit/adapter";
import type { AppEnv } from "../env";
import { WARD_OFFICE_IDS, resolveGeo, stateCodeFrom } from "../geo/resolver";
import { answerField, applyAnswers, emptySlots } from "../lib/flow";
import { HttpError, clientIp, cookieHeader, parseCookies, parseForm, safeNext } from "../lib/http";
import { feedbackSchema, systemRequestSchema } from "../lib/schemas";
import { verifyTurnstile } from "../lib/security";
import { findSubmitted, storeFeedback, storeSystemRequest } from "../lib/store";
import { AskPage, FlowStepPage, FollowUpPage, MessagePage } from "../views/Pages";
import { ResultPage } from "../views/route/ResultPage";
import { Layout } from "../views/Layout";
import { cfOf } from "./api";

export const pages = new Hono<AppEnv>();

export const LANG_COOKIE = "raasta_lang";
export const LOC_COOKIE = "raasta_loc";

export async function renderHtml(c: Context<AppEnv>, el: { toString(): string | Promise<string> }, status: 200 | 400 | 403 | 404 | 413 | 422 | 429 | 500 | 503 = 200) {
  const html = await el.toString();
  c.header("cache-control", "private, no-store");
  return c.html(`<!doctype html>${html}`, status);
}

const isHttps = (c: Context<AppEnv>) => new URL(c.req.url).protocol === "https:";

function secret(c: Context<AppEnv>): string {
  if (!c.env.TOKEN_SECRET) throw new HttpError(503, "not_configured");
  return c.env.TOKEN_SECRET;
}

/** Language from ?lang, else cookie, else en. Sets the cookie when ?lang is present. */
export async function langMiddleware(c: Context<AppEnv>, next: () => Promise<void>) {
  const q = new URL(c.req.url).searchParams.get("lang");
  const cookies = parseCookies(c.req.header("cookie"));
  let lang: Locale = "en";
  if (isLocale(q)) lang = q;
  else if (isLocale(cookies[LANG_COOKIE])) lang = cookies[LANG_COOKIE] as Locale;
  c.set("lang", lang);
  await next();
  if (isLocale(q)) c.res.headers.append("Set-Cookie", cookieHeader(LANG_COOKIE, q, isHttps(c)));
}

function locCookie(c: Context<AppEnv>): { state_code?: string; city?: string } {
  const raw = parseCookies(c.req.header("cookie"))[LOC_COOKIE];
  if (!raw) return {};
  const [state, city] = raw.split("|");
  return { state_code: stateCodeFrom(state), city: city?.trim() || undefined };
}

function geoFor(c: Context<AppEnv>, slots: IntakeSlots, wardId?: string): GeoContext {
  return resolveGeo(slots, cfOf(c.req.raw), { wardId, digitTenantId: c.env.DIGIT_TENANT_ID });
}

async function redirectToRoute(c: Context<AppEnv>, slots: IntakeSlots, geo: GeoContext) {
  const token = await signToken(slots, geo, secret(c), Date.now());
  return c.redirect(`/r/route/${token}`, 303);
}

function answersFrom(form: Record<string, string>, dispute: { questions: { id: string }[] }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of dispute.questions) {
    const v = form[answerField(q.id)];
    if (v !== undefined) out[q.id] = v.slice(0, 200);
  }
  return out;
}

// ---------- /r/ask ----------
pages.get("/ask", (c) => renderHtml(c, <AskPage lang={c.get("lang")} />));

pages.post("/ask", async (c) => {
  const lang = c.get("lang");
  const form = parseForm(c);

  // Second step: follow-up answers. State travels in a signed token, never in plain hidden fields.
  if (form.st) {
    const v = await verifyToken(form.st, secret(c), Date.now());
    if (!v.ok) throw new HttpError(400, "invalid_input");
    const dispute = disputeById(v.slots.dispute_type);
    if (!dispute) throw new HttpError(400, "invalid_input");
    const slots = applyAnswers(v.slots, dispute, answersFrom(form, dispute));
    return redirectToRoute(c, slots, geoFor(c, slots, v.geo.pmc_ward_id));
  }

  const text = (form.text ?? "").trim();
  if (text.length < 2) return renderHtml(c, <AskPage lang={lang} error />, 422);
  const { slots } = await runIntake(c.env, text, locCookie(c));
  const geo = geoFor(c, slots);
  const dispute = disputeById(slots.dispute_type);
  const questions = (dispute?.questions ?? []).filter((q) => slots.missing_fields.includes(q.id)).slice(0, 3);
  if (!questions.length) return redirectToRoute(c, slots, geo);
  const state = await signToken(slots, geo, secret(c), Date.now());
  return renderHtml(c, <FollowUpPage lang={lang} questions={questions} state={state} />);
});

// ---------- /r/flow/:dispute/:step ----------
function flowParams(c: Context<AppEnv>) {
  const dispute = disputeById(c.req.param("dispute") ?? "");
  const step = Number(c.req.param("step"));
  if (!dispute || !Number.isInteger(step) || step < 1 || step > dispute.questions.length) throw new HttpError(404, "not_found");
  return { dispute, step };
}

pages.get("/flow/:dispute/:step", (c) => {
  const { dispute, step } = flowParams(c);
  return renderHtml(c, <FlowStepPage lang={c.get("lang")} dispute={dispute} step={step} answers={{}} />);
});

pages.post("/flow/:dispute/:step", async (c) => {
  const lang = c.get("lang");
  const { dispute, step } = flowParams(c);
  const form = parseForm(c);
  const answers = answersFrom(form, dispute);
  if (form._nav === "back" && step > 1) {
    return renderHtml(c, <FlowStepPage lang={lang} dispute={dispute} step={step - 1} answers={answers} />);
  }
  if (step < dispute.questions.length) {
    return renderHtml(c, <FlowStepPage lang={lang} dispute={dispute} step={step + 1} answers={answers} />);
  }
  const loc = locCookie(c);
  const base: IntakeSlots = { ...emptySlots(dispute.id), summary: dispute.title_en, ...loc };
  const slots = applyAnswers(base, dispute, answers);
  return redirectToRoute(c, slots, geoFor(c, slots));
});

// ---------- /r/location ----------
pages.post("/location", async (c) => {
  const form = parseForm(c);
  const code = stateCodeFrom(form.state?.trim());
  const clean = (s: string | undefined) => (s ?? "").replace(/[\u0000-\u001f|]/g, "").trim().slice(0, 60);
  const city = clean(form.city);
  const stateText = code ?? clean(form.state);
  const next = safeNext(form.next, "/");
  const res = c.redirect(next, 303);
  if (stateText || city) res.headers.append("Set-Cookie", cookieHeader(LOC_COOKIE, `${stateText}|${city}`, isHttps(c), 60 * 60 * 24 * 30));
  else res.headers.append("Set-Cookie", cookieHeader(LOC_COOKIE, "", isHttps(c), 0));
  if (isLocale(form.lang)) res.headers.append("Set-Cookie", cookieHeader(LANG_COOKIE, form.lang, isHttps(c)));
  return res;
});

// ---------- /r/route/:token ----------
pages.get("/route/:token", async (c) => {
  const lang = c.get("lang");
  const token = c.req.param("token");
  const v = await verifyToken(token, secret(c), Date.now());
  if (!v.ok) {
    return renderHtml(c, <MessagePage lang={lang} title={t(lang, "ui.error.h1")} body={t(lang, "ui.route.bad_token")} backHref="/" />, 400);
  }
  const result = route(v.slots, v.geo);
  const now = Date.now();
  const ago = (d?: number) => (d === undefined ? undefined : new Date(now - d * 86_400_000));
  const timers = liveTimers(result.timers, {
    now,
    incidentDate: ago(v.slots.days_since_incident),
    priorComplaintDate: ago(v.slots.prior_complaint_days_ago),
  });
  const title = t(lang, `dispute.${v.slots.dispute_type}.title`);
  return renderHtml(c, <ResultPage lang={lang} token={token} result={result} geo={v.geo} timers={timers} title={title} />);
});

pages.post("/route/:token/ward", async (c) => {
  const v = await verifyToken(c.req.param("token"), secret(c), Date.now());
  if (!v.ok) throw new HttpError(400, "invalid_input");
  const ward = parseForm(c).ward_id ?? "";
  if (ward && !WARD_OFFICE_IDS.has(ward)) throw new HttpError(422, "invalid_input");
  const geo: GeoContext = { ...v.geo };
  if (ward) geo.pmc_ward_id = ward;
  else delete geo.pmc_ward_id;
  return redirectToRoute(c, v.slots, geo);
});

// ---------- /r/feedback, /r/system-request ----------
function formForSchema(form: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(form)) if (v.trim() !== "") out[k] = v.trim();
  return out;
}

async function checkTurnstile(c: Context<AppEnv>, token: string | undefined) {
  if (!(await verifyTurnstile(c.env, token, clientIp(c)))) throw new HttpError(403, "verification_failed");
}

pages.post("/feedback", async (c) => {
  const parsed = feedbackSchema.safeParse(formForSchema(parseForm(c)));
  if (!parsed.success) throw new HttpError(422, "invalid_input");
  await checkTurnstile(c, parsed.data["cf-turnstile-response"]);
  const id = await storeFeedback(c.env, parsed.data);
  return c.redirect(`/r/submitted/${id}`, 303);
});

pages.post("/system-request", async (c) => {
  const parsed = systemRequestSchema.safeParse(formForSchema(parseForm(c)));
  if (!parsed.success) throw new HttpError(422, "invalid_input");
  await checkTurnstile(c, parsed.data["cf-turnstile-response"]);
  const id = await storeSystemRequest(c.env, parsed.data);
  return c.redirect(`/r/submitted/${id}`, 303);
});

// ---------- /r/submitted/:id ----------
pages.get("/submitted/:id", async (c) => {
  const lang = c.get("lang");
  const id = c.req.param("id");
  const found = /^[A-Za-z0-9_.-]{4,80}$/.test(id) ? await findSubmitted(c.env, id) : null;
  if (!found) throw new HttpError(404, "not_found");
  if (found.kind !== "digit" || !found.digit) {
    return renderHtml(c, <MessagePage lang={lang} title={t(lang, "ui.thanks.h1")} body={t(lang, "ui.thanks.body")} path={`/r/submitted/${id}`} />);
  }
  const d = found.digit;
  let status = d.status ?? undefined;
  let citizenUrl: string | undefined;
  try {
    const s = await searchComplaint(c.env, d.service_request_id, d.tenant_id ?? undefined);
    if (s.ok && s.status) status = s.status;
    citizenUrl = s.citizen_url;
  } catch {
    /* show the stored status */
  }
  const demo = isDemo(c.env);
  return renderHtml(
    c,
    <Layout lang={lang} title={`${t(lang, "ui.thanks.h1")} | Raasta`} path={`/r/submitted/${id}`} noindex>
      <div className="container stack">
        <h1>{t(lang, "ui.thanks.h1")}</h1>
        {demo ? <p className="notice">Demo sandbox. Nothing was sent to a real municipal system.</p> : null}
        <p>
          <strong>{d.service_request_id}</strong>
        </p>
        {status ? <p>{status}</p> : null}
        {citizenUrl ? (
          <p>
            <a className="btn btn-secondary" href={citizenUrl} rel="noopener noreferrer">
              {t(lang, "ui.route.open_portal")}
            </a>
          </p>
        ) : null}
      </div>
    </Layout>,
  );
});



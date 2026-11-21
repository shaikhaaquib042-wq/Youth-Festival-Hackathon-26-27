import { Hono, type Context } from "hono";
import { legalAid, officeById, platformById, stateByCode } from "@raasta/data";
import { buildDoc, getTemplate, renderEnvelopeDL, renderLabels, renderPdf, renderPrintHtml } from "@raasta/docs-gen";
import { isLocale, t, type Locale } from "@raasta/i18n";
import { legalAidCheck, redact, route, verifyToken } from "@raasta/rules";
import type { GeoContext, IntakeSlots, NalsaFlag, OfficeRef } from "@raasta/rules/types";
import { createComplaint } from "../digit/adapter";
import type { AppEnv } from "../env";
import { getDirections } from "../geo/directions";
import { forwardGeocode } from "../geo/forward";
import { findOffices } from "../geo/offices";
import { resolveGeo, stateCodeFrom } from "../geo/resolver";
import { prefillVars } from "../lib/draft";
import { HttpError, parseForm, parseFormAll } from "../lib/http";
import { storeDigitSubmission } from "../lib/store";
import { GuidePage } from "../views/Guide";
import { ChatPage, MessagePage, type ChatTurn } from "../views/Pages";
import { aiAvailable, allowedUrlSet, complete, filterUrls } from "../ai";
import { buildChatSystem } from "../ai/chat";
import { DirectionsPage, DocFormPage, FIELD, LabelPage, LegalAidResultPage, OfficesPage, type Dest } from "../views/Tools";
import { cfOf } from "./api";
import { renderHtml } from "./pages";

export const tools = new Hono<AppEnv>();

const ENHANCE_JS = `(function(){
function ready(f){if(document.readyState!=="loading")f();else document.addEventListener("DOMContentLoaded",f)}
ready(function(){
document.querySelectorAll("[data-print]").forEach(function(b){b.hidden=false;b.addEventListener("click",function(){window.print()})});
document.querySelectorAll("[data-copy]").forEach(function(b){
b.hidden=false;
b.addEventListener("click",function(){
var ta=b.parentElement&&b.parentElement.querySelector("textarea");
if(!ta)return;
ta.focus();ta.select();
var done=function(){b.textContent="Copied"};
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(ta.value).then(done,function(){try{document.execCommand("copy");done()}catch(e){}})}
else{try{document.execCommand("copy");done()}catch(e){}}
});
});
});
})();
`;

tools.get("/assets/enhance.js", (c) => {
  c.header("content-type", "application/javascript; charset=utf-8");
  c.header("cache-control", "public, max-age=86400");
  return c.body(ENHANCE_JS);
});

function secret(c: Context<AppEnv>): string {
  if (!c.env.TOKEN_SECRET) throw new HttpError(503, "not_configured");
  return c.env.TOKEN_SECRET;
}

async function tokenData(c: Context<AppEnv>, raw: string | undefined): Promise<{ slots: IntakeSlots; geo: GeoContext } | undefined> {
  if (!raw || raw.length > 4000) return undefined;
  const v = await verifyToken(raw, secret(c), Date.now());
  return v.ok ? { slots: v.slots, geo: v.geo } : undefined;
}

const asRef = (o: NonNullable<ReturnType<typeof officeById>>): OfficeRef => ({
  office_id: o.id, name: o.name, phone: o.phone, email: o.email, address: o.address, lat: o.lat, lng: o.lng, verified: o.verified,
});

// ---------- /r/guide/:platformId ----------
tools.get("/guide/:platformId", async (c) => {
  const p = platformById(c.req.param("platformId"));
  if (!p) throw new HttpError(404, "not_found");
  const td = await tokenData(c, c.req.query("t"));
  const title = td ? t(c.get("lang"), `dispute.${td.slots.dispute_type}.title`) : undefined;
  return renderHtml(c, <GuidePage lang={c.get("lang")} platform={p} token={td ? c.req.query("t") : undefined} slots={td?.slots} title={title} />);
});

// ---------- /r/doc/:template ----------
tools.get("/doc/:template", async (c) => {
  const tpl = getTemplate(c.req.param("template"));
  if (!tpl) throw new HttpError(404, "not_found");
  const raw = c.req.query("t");
  const td = await tokenData(c, raw);
  const ids = tpl.variables.map((v) => v.id);
  const values = prefillVars(td?.slots, ids);
  const officeId = c.req.query("office");
  const chosen = officeId ? officeById(officeId) : undefined;
  // Fill "who is this letter to" from the route: the chosen office, else the nearest office, else the primary authority.
  if (td) {
    const res = route(td.slots, td.geo);
    const near = chosen ? asRef(chosen) : res.offices[0];
    const authority = platformById(res.primary.platform_id);
    const toName = near?.name ?? authority?.managing_body ?? authority?.name;
    const fill = (id: string, v: string | undefined) => {
      if (v && ids.includes(id) && !values[id]) values[id] = v;
    };
    fill("department_name", toName);
    fill("ward_name", near?.office_id.startsWith("pmc_ward") ? near.name : undefined);
    fill("police_station", near?.office_id.includes("police") ? near.name : undefined);
    fill("recipient_address", near?.address ? `${near.name}, ${near.address}` : undefined);
    fill("district", td.geo.city);
    fill("address", td.slots.city);
  } else if (chosen) {
    if (ids.includes("recipient_address") && chosen.address) values.recipient_address = `${chosen.name}, ${chosen.address}`;
    if (ids.includes("department_name")) values.department_name = chosen.name;
  }
  return renderHtml(
    c,
    <DocFormPage
      lang={c.get("lang")}
      tpl={tpl}
      values={values}
      token={td ? raw : undefined}
      office={chosen ? officeId : undefined}
      dispute={td?.slots.dispute_type}
      hasAmount={td?.slots.amount_inr !== undefined}
    />,
  );
});

function pdfResponse(bytes: Uint8Array, name: string): Response {
  return new Response(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
    },
  });
}

const PRINT_CSP =
  "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";

tools.post("/doc/:template", async (c) => {
  const tpl = getTemplate(c.req.param("template"));
  if (!tpl) throw new HttpError(404, "not_found");
  const form = parseForm(c);
  const vars: Record<string, string> = {};
  for (const v of tpl.variables) {
    const val = form[FIELD + v.id];
    if (val !== undefined && val.trim() !== "") vars[v.id] = val.trim().slice(0, 1000);
  }
  const lang: Locale = isLocale(form.doc_lang) ? form.doc_lang : "en";
  const o = form.office ? officeById(form.office) : undefined;
  const office = o ? asRef(o) : undefined;
  const doc = buildDoc(tpl.id, vars, { office, lang, now: new Date() });
  if (lang === "en") return pdfResponse(await renderPdf(doc), `raasta-${tpl.id}.pdf`);

  const hidden = Object.entries(vars)
    .map(([k, v]) => `<input type="hidden" name="${FIELD}${k}" value="${v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}">`)
    .join("");
  const extra = `<form method="post" action="/r/doc/${tpl.id}">${hidden}<input type="hidden" name="doc_lang" value="en">${o ? `<input type="hidden" name="office" value="${o.id}">` : ""}<p><button type="submit">English PDF</button> Most offices accept English letters.</p></form>\n`;
  let html = renderPrintHtml(doc);
  html = html.includes("</div>\n<main") ? html.replace("</div>\n<main", `${extra}</div>\n<main`) : html.replace("</body>", `${extra}</body>`);
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": PRINT_CSP },
  });
});

// ---------- /r/label ----------
tools.get("/label", async (c) => {
  const lang = c.get("lang");
  const raw = c.req.query("t");
  const td = await tokenData(c, raw);
  const o = officeById(c.req.query("office") ?? "");
  return renderHtml(c, <LabelPage lang={lang} token={td ? raw : undefined} office={o?.id} toName={o?.name} toAddress={o?.address} />);
});

tools.post("/label", async (c) => {
  const form = parseForm(c);
  const clip = (s: string | undefined, n: number) => (s ?? "").trim().slice(0, n);
  const o = form.office ? officeById(form.office) : undefined;
  const to = o ? { name: o.name, address: o.address } : { name: clip(form.to_name, 120), address: clip(form.to_address, 400) };
  const from = { name: clip(form.from_name, 120), address: clip(form.from_address, 400), phone: clip(form.from_phone, 20) || undefined };
  if (!to.name || !from.name || !from.address) throw new HttpError(422, "invalid_input");
  const bytes = form.format === "dl" || c.req.query("format") === "dl" ? await renderEnvelopeDL({ to, from }) : await renderLabels({ to, from, copies: 4 });
  return pdfResponse(bytes, form.format === "dl" || c.req.query("format") === "dl" ? "raasta-envelope-dl.pdf" : "raasta-labels.pdf");
});

// ---------- /r/directions ----------
const PAIR = /^(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/;
const parsePair = (s: string | undefined): [number, number] | undefined => {
  const m = s ? PAIR.exec(s) : null;
  if (!m) return undefined;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return Math.abs(a) <= 90 && Math.abs(b) <= 180 ? [a, b] : undefined;
};
const round3 = (n: number) => Math.round(n * 1000) / 1000;

function destFor(id: string, name?: string): Dest | undefined {
  const o = officeById(id);
  if (o) return { id: o.id, name: o.name, address: o.address, phone: o.phone, hours: o.hours, lat: o.lat, lng: o.lng };
  if (id.startsWith("slsa:")) {
    const s = stateByCode(id.slice(5))?.slsa;
    return s ? { id, name: s.name, phone: s.phone, url: s.url } : undefined;
  }
  const p = parsePair(id);
  if (p) return { id, name: (name ?? "").replace(/[<>]/g, "").slice(0, 80) || "Office", lat: p[0], lng: p[1] };
  return undefined;
}

tools.get("/directions", async (c) => {
  const lang = c.get("lang");
  const dest = destFor(c.req.query("to") ?? "", c.req.query("name"));
  if (!dest) throw new HttpError(404, "not_found");
  const raw = c.req.query("t");
  const td = await tokenData(c, raw);

  let from = parsePair(c.req.query("from"));
  let geocodeFailed = false;
  const landmark = c.req.query("landmark")?.trim();
  if (!from && landmark) {
    const g = await forwardGeocode(c.env, landmark);
    if (g) from = [g.lat, g.lng];
    else geocodeFailed = true;
  }
  if (from) from = [round3(from[0]), round3(from[1])];

  let route: { km: number; minutes: number } | "unavailable" | undefined;
  let withCoords = dest;
  if (from) {
    if (dest.lat === undefined && dest.address) {
      const g = await forwardGeocode(c.env, dest.address);
      if (g) withCoords = { ...dest, lat: g.lat, lng: g.lng };
    }
    if (withCoords.lat !== undefined && withCoords.lng !== undefined) {
      const r = await getDirections(c.env, from, [withCoords.lat, withCoords.lng], "driving");
      route = r ? { km: Math.round(r.distance_m / 100) / 10, minutes: Math.max(1, Math.round(r.duration_s / 60)) } : "unavailable";
    } else route = "unavailable";
  }
  const docs = (td ? route_documents(td) : []) as string[];
  const title = td ? t(lang, `dispute.${td.slots.dispute_type}.title`) : undefined;
  return renderHtml(
    c,
    <DirectionsPage lang={lang} dest={withCoords} token={td ? raw : undefined} disputeTitle={title} docs={docs} from={from} route={route} geocodeFailed={geocodeFailed} />,
  );
});

function route_documents(td: { slots: IntakeSlots; geo: GeoContext }): string[] {
  return route(td.slots, td.geo).documents.map((d) => d.label_en);
}

// ---------- /r/offices ----------
tools.get("/offices", async (c) => {
  const lang = c.get("lang");
  const q = c.req.query();
  const state = stateCodeFrom(q.state?.trim());
  const city = q.city?.trim().slice(0, 60) || undefined;
  const type = q.type && /^[a-z_]{3,30}$/.test(q.type) ? q.type : undefined;
  const landmark = q.landmark?.trim().slice(0, 120) || undefined;
  const searched = !!(state || city || type || landmark);
  let result;
  let geocodeFailed = false;
  if (searched) {
    let pt: [number, number] | undefined;
    if (landmark) {
      const g = await forwardGeocode(c.env, landmark);
      if (g) pt = [g.lat, g.lng];
      else geocodeFailed = true;
    }
    const cf = cfOf(c.req.raw);
    const stateCode = state ?? (pt ? resolveGeo({ lat: pt[0], lng: pt[1] }, cf).state_code : undefined);
    result = await findOffices(c.env, { type, state_code: stateCode, city, lat: pt?.[0], lng: pt?.[1] });
  }
  const st = state ? stateByCode(state) : undefined;
  return renderHtml(c, <OfficesPage lang={lang} q={{ state, city, type, landmark }} result={result} stateName={st ? { name: st.name, slsa: st.slsa } : undefined} geocodeFailed={geocodeFailed} />);
});

// ---------- /r/legal-aid ----------
const FLAGS = new Set<string>(legalAid.section12_flags.map((f) => f.flag));

tools.post("/legal-aid", async (c) => {
  const raw = c.get("rawBody") || "";
  const params = new URLSearchParams(raw);
  const flags = params.getAll("flag").filter((f): f is NalsaFlag => FLAGS.has(f));
  const incomeText = params.get("income")?.trim();
  const income = incomeText ? Number(incomeText) : undefined;
  if (income !== undefined && (!Number.isFinite(income) || income < 0 || income > 100_000_000)) throw new HttpError(422, "invalid_input");
  const tokenRaw = params.get("t") ?? undefined;
  const td = await tokenData(c, tokenRaw);
  if (tokenRaw && !td) throw new HttpError(400, "invalid_input");
  const lang = isLocale(params.get("lang")) ? (params.get("lang") as Locale) : c.get("lang");
  if (td) {
    const slots: IntakeSlots = { ...td.slots };
    if (income !== undefined) slots.annual_income_inr = income;
    if (flags.length) slots.nalsa_status_flags = flags;
    const aid = route(slots, td.geo).legal_aid;
    return renderHtml(c, <LegalAidResultPage lang={lang} aid={aid} token={tokenRaw} />);
  }
  const state = stateCodeFrom(params.get("state")?.trim());
  if (!state) throw new HttpError(422, "invalid_input");
  const slots: IntakeSlots = { dispute_type: "free_legal_aid", summary: "", state_code: state, missing_fields: [] };
  if (income !== undefined) slots.annual_income_inr = income;
  if (flags.length) slots.nalsa_status_flags = flags;
  return renderHtml(c, <LegalAidResultPage lang={lang} aid={legalAidCheck(slots, state)} />);
});

// ---------- /r/submit/digit ----------
tools.post("/submit/digit", async (c) => {
  const lang = c.get("lang");
  const form = parseForm(c);
  const td = await tokenData(c, form.t);
  if (!td || !td.geo.digit_tenant_id) throw new HttpError(422, "invalid_input");
  const code = form.service_code ?? "";
  const description = (form.description ?? "").trim();
  if (!/^[A-Za-z0-9_.-]{1,80}$/.test(code) || description.length < 5 || description.length > 1000) throw new HttpError(422, "invalid_input");
  let created;
  try {
    created = await createComplaint(c.env, { service_code: code, description: redact(description), tenant_id: td.geo.digit_tenant_id, city: td.slots.city });
  } catch {
    throw new HttpError(502, "unavailable");
  }
  try {
    const id = await storeDigitSubmission(c.env, created.tenant_id, created.service_request_id, created.status);
    return c.redirect(`/r/submitted/${id}`, 303);
  } catch {
    return renderHtml(c, <MessagePage lang={lang} title={t(lang, "ui.thanks.h1")} body={`${created.service_request_id}`} backHref="/" />, 200);
  }
});

// ---------- /r/chat (no-JS assistant; one question per post, history carried in the form) ----------
function chatTurns(form: Record<string, string | string[]>): ChatTurn[] {
  const pick = (k: string) => {
    const v = form[k];
    return Array.isArray(v) ? v : v ? [v] : [];
  };
  const turns: Array<ChatTurn & { i: number }> = [];
  for (const [k, role] of [["hu", "user"], ["ha", "assistant"]] as const) {
    for (const raw of pick(k)) {
      const m = /^(\d{1,2}):([\s\S]*)$/.exec(raw);
      if (m) turns.push({ i: Number(m[1]), role, content: m[2]!.slice(0, 1200) });
    }
  }
  return turns.sort((a, b) => a.i - b.i).slice(-12).map(({ role, content }) => ({ role, content }));
}

tools.get("/chat", async (c) => {
  const raw = c.req.query("t");
  const td = await tokenData(c, raw);
  const lang = c.get("lang");
  const title = td ? t(lang, `dispute.${td.slots.dispute_type}.title`) : undefined;
  return renderHtml(c, <ChatPage lang={lang} token={td ? raw : undefined} title={title} turns={[]} available={aiAvailable(c.env)} />);
});

tools.post("/chat", async (c) => {
  const lang = c.get("lang");
  const form = parseFormAll(c);
  const raw = typeof form.t === "string" ? form.t : undefined;
  const td = await tokenData(c, raw);
  const title = td ? t(lang, `dispute.${td.slots.dispute_type}.title`) : undefined;
  const turns = chatTurns(form);
  const q = redact(String(Array.isArray(form.q) ? form.q.filter(Boolean).pop() ?? "" : form.q ?? "")).trim().slice(0, 600);
  const page = (extra: Partial<{ error: boolean }>, list: ChatTurn[]) =>
    renderHtml(c, <ChatPage lang={lang} token={td ? raw : undefined} title={title} turns={list} available={aiAvailable(c.env)} {...extra} />);
  if (!q || !aiAvailable(c.env) || turns.length >= 12) return page({}, turns);
  const asked: ChatTurn[] = [...turns, { role: "user", content: q }];
  try {
    const routeResult = td ? route(td.slots, td.geo) : undefined;
    const out = await complete(c.env, { system: buildChatSystem(lang, routeResult), messages: asked.map((m) => ({ role: m.role, content: m.content })), maxTokens: 600 });
    const answer = filterUrls((out.text ?? "").trim(), allowedUrlSet()).slice(0, 1200);
    return page({}, [...asked, { role: "assistant", content: answer || t(lang, "ui.chat.error") }]);
  } catch {
    return page({ error: true }, asked);
  }
});

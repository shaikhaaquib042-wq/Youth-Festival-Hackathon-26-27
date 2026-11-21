import { disputeById, officeById, stateByCode, timers as timerDefs } from "@raasta/data";
import type { ForumOption, GeoContext, IntakeSlots, OfficeRef, RouteResult, SubmissionMode, TimerSpec } from "./types";
import { NOT_PUBLISHED, feeOf, helpline, officeRef, primaryUrl, registeredEmails, slaOf, waTemplate } from "./registry";
import { legalAidCheck } from "./legalAid";
import { TABLES } from "./tables";
import type { Ctx, ForumSpec, SubSpec } from "./tables/types";

export interface RouteOptions {
  /** Reserved. route() never reads the clock; countdowns are computed by liveTimers(). */
  now?: Date;
}

export function buildCtx(slots: IntakeSlots, geo: GeoContext): Ctx {
  const ulb: Ctx["ulb"] =
    geo.ulb === "PMC" || geo.ulb === "PCMC" ? geo.ulb : geo.pmc_ward_id ? "PMC" : geo.ulb ? "other" : "none";
  const city = (geo.city ?? slots.city ?? "").toLowerCase();
  const isPune = ulb === "PMC" || ulb === "PCMC" || city.includes("pune") || city.includes("pimpri");
  const state = geo.state_code ?? slots.state_code ?? (isPune ? "MH" : undefined);
  return { slots, geo, state, isMH: state === "MH", isPune, ulb };
}

function wardOffices(c: Ctx): { ward?: string; zone?: string } {
  const ward = c.geo.pmc_ward_id ? officeById(c.geo.pmc_ward_id) : undefined;
  if (!ward || ward.type !== "ward_office") return {};
  return { ward: ward.id, zone: ward.cc_office_id };
}

function resolveSub(s: SubSpec, c: Ctx): SubmissionMode | undefined {
  switch (s.k) {
    case "wa": {
      const template = waTemplate(s.pid);
      return template ? { kind: "whatsapp", template } : undefined;
    }
    case "wa_raw":
      return { kind: "whatsapp", template: s.template };
    case "email": {
      if (s.to === "ward") {
        const { ward, zone } = wardOffices(c);
        const to = ward ? officeById(ward)?.email : undefined;
        if (!to) return undefined;
        const cc = zone ? officeById(zone)?.email : undefined;
        return cc ? { kind: "email", to, cc, subjectKey: s.subjectKey } : { kind: "email", to, subjectKey: s.subjectKey };
      }
      return registeredEmails().has(s.to.toLowerCase()) ? { kind: "email", to: s.to, subjectKey: s.subjectKey } : undefined;
    }
    case "phone": {
      const number = helpline(s.pid, s.prefix);
      return number ? { kind: "phone", number } : undefined;
    }
    case "phone_raw":
      return { kind: "phone", number: s.number };
    case "autofill":
      return { kind: "autofill_helper", portal: s.pid };
    case "in_person":
      return officeById(s.office) ? { kind: "in_person", officeRef: s.office } : undefined;
    case "post":
      return officeById(s.office) ? { kind: "post", addressRef: s.office } : undefined;
    case "digit":
      return c.geo.digit_tenant_id ? { kind: "api", adapter: "digit_pgr", tenantId: c.geo.digit_tenant_id } : undefined;
  }
}

function forumUrl(f: ForumSpec): string {
  if (f.url) return f.url;
  if (f.pid.startsWith("state:")) {
    const url = stateByCode(f.pid.slice(6))?.grievance_portal?.url;
    if (!url) throw new Error(`rules: no grievance portal for ${f.pid}`);
    return url;
  }
  return primaryUrl(f.pid, f.url_key);
}

function buildForum(f: ForumSpec, c: Ctx): ForumOption {
  const isState = f.pid.startsWith("state:");
  const modes = f.blocked ? [] : f.sub.map((s) => resolveSub(s, c)).filter((m): m is SubmissionMode => !!m);
  return {
    platform_id: f.pid,
    why_key: f.why,
    fee: f.fee_text ?? (isState ? NOT_PUBLISHED : feeOf(f.pid, f.fee, c.slots.amount_inr)),
    sla: isState ? NOT_PUBLISHED : slaOf(f.pid, f.sla),
    submission: [...modes, { kind: "guide" }],
    ...(f.blocked ? { blocked_reason_key: f.blocked } : {}),
  };
}

function resolveOffices(ids: string[], c: Ctx): OfficeRef[] {
  const { ward, zone } = wardOffices(c);
  const out: OfficeRef[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = raw === "pmc_ward" ? ward : raw === "pmc_zone" ? zone : raw;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const ref = officeRef(id);
    if (ref) out.push(ref);
  }
  return out;
}

function timersFor(slots: IntakeSlots): TimerSpec[] {
  return timerDefs
    .filter((t) => t.dispute_types.includes(slots.dispute_type))
    .map(({ key, label_en, days, from, note_en }) => ({ key, label_en, days, from, ...(note_en ? { note_en } : {}) }));
}

const LIMITATION_WARN_DAYS = 60;

export function route(slots: IntakeSlots, geo: GeoContext, _opts: RouteOptions = {}): RouteResult {
  const table = TABLES[slots.dispute_type];
  if (!table) throw new Error(`rules: no table for ${slots.dispute_type}`);
  const c = buildCtx(slots, geo);
  const row = table.rows.find((r) => !r.when || r.when(c));
  if (!row) throw new Error(`rules: no row matched for ${slots.dispute_type}`);
  const out = row.out(c);

  const timers = timersFor(slots).filter((t) => c.isMH || !t.key.startsWith("maharera_"));
  const warnings = new Set<string>(out.warnings ?? []);
  if (table.privacy) warnings.add("warn.privacy_mode");
  if (slots.is_emergency) warnings.add("warn.emergency_call_112");
  if (!c.state && geo.coverage === "unknown") warnings.add("warn.location_unknown");
  else if (geo.coverage !== "deep" && !c.isPune) warnings.add("warn.coverage_standard");

  let urgency = out.urgency ?? (slots.is_emergency ? "emergency" : "normal");
  const since = slots.days_since_incident;
  if (since !== undefined) {
    for (const t of timers) {
      if (t.from !== "incident" || t.days < 365) continue;
      if (since > t.days) warnings.add("warn.limitation_passed");
      else if (t.days - since <= LIMITATION_WARN_DAYS) {
        warnings.add("warn.limitation_close");
        if (urgency === "normal") urgency = "time_sensitive";
      }
    }
  }

  const primary = buildForum(out.primary, c);
  const alternatives = out.alternatives.map((f) => buildForum(f, c));
  const sourceSpecs = [out.primary, ...out.alternatives];
  const sources: RouteResult["sources"] = [];
  for (const f of sourceSpecs) {
    const url = forumUrl(f);
    if (!sources.some((s) => s.platform_id === f.pid && s.url === url)) sources.push({ platform_id: f.pid, url });
  }

  return {
    dispute_type: slots.dispute_type,
    urgency,
    first_peaceful_step: out.step,
    primary,
    alternatives,
    documents: disputeById(slots.dispute_type)?.documents ?? [],
    timers,
    legal_aid: legalAidCheck(slots, c.state, c.isPune),
    offices: resolveOffices(out.offices ?? [], c),
    warnings: [...warnings],
    sources,
  };
}

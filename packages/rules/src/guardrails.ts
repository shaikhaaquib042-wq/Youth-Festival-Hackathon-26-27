// Handbook 5.3 guardrails as named checks. checkRoute returns the names of violated checks; assertGuardrails throws.
import { platformById } from "@raasta/data";
import type { ForumOption, IntakeSlots, RouteResult } from "./types";
import { normPhone, registeredEmails, registeredPhones, registeredUrls } from "./registry";

export const GUARDRAIL_NAMES = [
  "no_edaakhil", "no_bima_bharosa_blind_route", "deposit_not_police", "cpgrams_exclusions",
  "rbi_cms_before_30_days", "cyber_emergency_first", "urls_registered", "contacts_registered",
  "platforms_exist", "ends_with_guide", "blocked_is_guide_only", "privacy_mode_present",
] as const;
export type GuardrailName = (typeof GUARDRAIL_NAMES)[number];

const allOptions = (r: RouteResult): ForumOption[] => [r.primary, ...r.alternatives];

const PRIVATE_DISPUTES = new Set(["workplace_harassment", "cyber_harassment", "police_complaint", "cyber_fraud"]);

type Check = (r: RouteResult, s: IntakeSlots) => boolean; // true = ok

const CHECKS: Record<GuardrailName, Check> = {
  no_edaakhil: (r) => !JSON.stringify(r).toLowerCase().includes("edaakhil"),

  no_bima_bharosa_blind_route: (r) => !r.sources.some((x) => x.url.includes("bimabharosa.irdai.gov.in")),

  deposit_not_police: (r, s) =>
    s.dispute_type !== "security_deposit" ||
    s.cheating_indicated === true ||
    !allOptions(r).some((o) => o.platform_id === "mahapolice_pune_police"),

  cpgrams_exclusions: (r, s) => {
    const flagged = (s.exclusion_flags ?? []).length > 0;
    if (!flagged) return true;
    if (r.primary.platform_id === "cpgrams") return false;
    return allOptions(r)
      .filter((o) => o.platform_id === "cpgrams")
      .every((o) => !!o.blocked_reason_key && o.submission.every((m) => m.kind === "guide"));
  },

  rbi_cms_before_30_days: (r, s) => {
    const open = s.prior_written_complaint_sent === true && (s.prior_complaint_days_ago ?? -1) >= 30;
    return allOptions(r)
      .filter((o) => o.platform_id === "rbi_cms")
      .every((o) => open || (!!o.blocked_reason_key && o.submission.every((m) => m.kind === "guide")));
  },

  cyber_emergency_first: (r, s) => {
    if (s.dispute_type !== "cyber_fraud") return true;
    const recent = s.is_emergency === true || (s.days_since_incident !== undefined && s.days_since_incident <= 3);
    const first = r.primary.submission[0];
    return (
      (!recent || r.urgency === "emergency") &&
      r.first_peaceful_step.key === "step.call_1930_now" &&
      r.primary.platform_id === "ncrp_cybercrime" &&
      first?.kind === "phone" && first.number === "1930"
    );
  },

  urls_registered: (r) => {
    const urls = registeredUrls();
    const templates = allOptions(r).flatMap((o) => o.submission.flatMap((m) => (m.kind === "whatsapp" ? [m.template] : [])));
    return r.sources.every((x) => urls.has(x.url)) && templates.every((t) => urls.has(t));
  },

  contacts_registered: (r) => {
    const phones = registeredPhones();
    const emails = registeredEmails();
    return allOptions(r).every((o) =>
      o.submission.every((m) => {
        if (m.kind === "phone") return phones.has(normPhone(m.number));
        if (m.kind === "email") return emails.has(m.to.toLowerCase()) && (!m.cc || emails.has(m.cc.toLowerCase()));
        return true;
      }),
    );
  },

  platforms_exist: (r) =>
    allOptions(r).every((o) => o.platform_id.startsWith("state:") || !!platformById(o.platform_id)),

  ends_with_guide: (r) => allOptions(r).every((o) => o.submission[o.submission.length - 1]?.kind === "guide"),

  blocked_is_guide_only: (r) =>
    allOptions(r).every((o) => !o.blocked_reason_key || o.submission.every((m) => m.kind === "guide")),

  privacy_mode_present: (r) => !PRIVATE_DISPUTES.has(r.dispute_type) || r.warnings.includes("warn.privacy_mode"),
};

export function checkRoute(result: RouteResult, slots: IntakeSlots): string[] {
  return GUARDRAIL_NAMES.filter((name) => !CHECKS[name](result, slots));
}

export class GuardrailViolation extends Error {
  constructor(public readonly violations: string[]) {
    super(`Guardrail violation: ${violations.join(", ")}`);
    this.name = "GuardrailViolation";
  }
}

export function assertGuardrails(result: RouteResult, slots: IntakeSlots): void {
  const v = checkRoute(result, slots);
  if (v.length) throw new GuardrailViolation(v);
}

export const guardrails = { names: GUARDRAIL_NAMES, check: checkRoute, assert: assertGuardrails };

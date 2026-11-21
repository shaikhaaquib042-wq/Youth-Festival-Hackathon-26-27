import { describe, expect, it } from "vitest";
import { GUARDRAIL_NAMES, GuardrailViolation, assertGuardrails, checkRoute, messagesEn, route } from "../src";
import type { IntakeSlots, RouteResult } from "../src";
import { ALL_DISPUTES, GEO, slots } from "./fixtures";
import { liveTimers } from "../src";
import { timers as timerDefs } from "@raasta/data";

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function bad(s: IntakeSlots, geo = GEO.pmc, mutate: (r: RouteResult) => void): { r: RouteResult; names: string[] } {
  const r = clone(route(s, geo));
  mutate(r);
  return { r, names: checkRoute(r, s) };
}

describe("each guardrail fires on a violating result", () => {
  it("no_edaakhil", () => {
    const s = slots({ dispute_type: "consumer_refund" });
    const { r, names } = bad(s, GEO.pmc, (x) => x.sources.push({ platform_id: "e_jagriti", url: "https://edaakhil.nic.in/" }));
    expect(names).toContain("no_edaakhil");
    expect(() => assertGuardrails(r, s)).toThrow(GuardrailViolation);
  });
  it("no_bima_bharosa_blind_route", () => {
    const s = slots({ dispute_type: "insurance_claim" });
    const { names } = bad(s, GEO.pmc, (x) => (x.sources[0].url = "https://bimabharosa.irdai.gov.in/"));
    expect(names).toContain("no_bima_bharosa_blind_route");
  });
  it("deposit_not_police", () => {
    const s = slots({ dispute_type: "security_deposit" });
    const { names } = bad(s, GEO.pmc, (x) => (x.primary.platform_id = "mahapolice_pune_police"));
    expect(names).toContain("deposit_not_police");
  });
  it("cpgrams_exclusions", () => {
    const s = slots({ dispute_type: "govt_service", exclusion_flags: ["rti"] });
    const { r, names } = bad(s, GEO.pmc, (x) => (x.primary.platform_id = "cpgrams"));
    expect(names).toContain("cpgrams_exclusions");
    expect(() => assertGuardrails(r, s)).toThrow(/cpgrams_exclusions/);
  });
  it("rbi_cms_before_30_days", () => {
    const s = slots({ dispute_type: "banking_nbfc", prior_written_complaint_sent: true, prior_complaint_days_ago: 5 });
    const { names } = bad(s, GEO.pmc, (x) => {
      delete x.primary.blocked_reason_key;
    });
    expect(names).toContain("rbi_cms_before_30_days");
  });
  it("cyber_emergency_first", () => {
    const s = slots({ dispute_type: "cyber_fraud", days_since_incident: 1 });
    const { names } = bad(s, GEO.pmc, (x) => {
      x.urgency = "normal";
    });
    expect(names).toContain("cyber_emergency_first");
    const other = bad(s, GEO.pmc, (x) => (x.first_peaceful_step.key = "step.legal_aid_screener"));
    expect(other.names).toContain("cyber_emergency_first");
  });
  it("urls_registered", () => {
    const s = slots({ dispute_type: "consumer_refund" });
    const { names } = bad(s, GEO.pmc, (x) => x.sources.push({ platform_id: "nch_ingram", url: "https://made-up.example/" }));
    expect(names).toContain("urls_registered");
  });
  it("contacts_registered", () => {
    const s = slots({ dispute_type: "consumer_refund" });
    const { names } = bad(s, GEO.pmc, (x) => x.primary.submission.unshift({ kind: "phone", number: "9999999999" }));
    expect(names).toContain("contacts_registered");
    const e = bad(s, GEO.pmc, (x) => x.primary.submission.unshift({ kind: "email", to: "who@made-up.example", subjectKey: "k" }));
    expect(e.names).toContain("contacts_registered");
  });
  it("platforms_exist", () => {
    const s = slots({ dispute_type: "other" });
    const { names } = bad(s, GEO.pmc, (x) => (x.primary.platform_id = "no_such_platform"));
    expect(names).toContain("platforms_exist");
  });
  it("ends_with_guide", () => {
    const s = slots({ dispute_type: "other" });
    const { names } = bad(s, GEO.pmc, (x) => x.primary.submission.pop());
    expect(names).toContain("ends_with_guide");
  });
  it("blocked_is_guide_only", () => {
    const s = slots({ dispute_type: "other" });
    const { names } = bad(s, GEO.pmc, (x) => (x.primary.blocked_reason_key = "warn.x"));
    expect(names).toContain("blocked_is_guide_only");
  });
  it("privacy_mode_present", () => {
    const s = slots({ dispute_type: "workplace_harassment" });
    const { names } = bad(s, GEO.pmc, (x) => (x.warnings = []));
    expect(names).toContain("privacy_mode_present");
  });
  it("every named guardrail is covered above", () => {
    expect(GUARDRAIL_NAMES.length).toBe(12);
  });
});

describe("guardrails hold for every dispute, location and flag combination", () => {
  const geos = Object.values(GEO);
  const variants: Partial<IntakeSlots>[] = [
    {},
    { is_emergency: true },
    { days_since_incident: 1, cheating_indicated: true },
    { days_since_incident: 20, prior_written_complaint_sent: true, prior_complaint_days_ago: 10 },
    { prior_written_complaint_sent: true, prior_complaint_days_ago: 45, employer_sphere: "central" },
    { employer_sphere: "state", exclusion_flags: ["rti"] },
    { exclusion_flags: ["sub_judice", "personal_family"], nalsa_status_flags: ["woman"] },
    { state_code: "UP", annual_income_inr: 100000, amount_inr: 12_00_000 },
  ];
  for (const d of ALL_DISPUTES) {
    it(`${d}`, () => {
      for (const g of geos) {
        for (const v of variants) {
          const s = slots({ dispute_type: d, ...v });
          const r = route(s, g);
          expect(checkRoute(r, s), `${d} ${JSON.stringify(g)} ${JSON.stringify(v)}`).toEqual([]);
          expect(JSON.stringify(r)).not.toContain("2014");
        }
      }
    });
  }
});

describe("i18n keys", () => {
  it("every key the engine can emit exists in messages.en.json and has no em dash", () => {
    const keys = new Set<string>();
    const geos = Object.values(GEO);
    const variants: Partial<IntakeSlots>[] = [
      {}, { is_emergency: true, days_since_incident: 1 }, { cheating_indicated: true },
      { prior_written_complaint_sent: true, prior_complaint_days_ago: 45 },
      { prior_written_complaint_sent: true, prior_complaint_days_ago: 5 },
      { exclusion_flags: ["rti"] }, { exclusion_flags: ["sub_judice"] }, { exclusion_flags: ["personal_family"] },
      { employer_sphere: "central" }, { employer_sphere: "state" }, { days_since_incident: 700 }, { days_since_incident: 900 },
      { annual_income_inr: 1 }, { annual_income_inr: 99_999_999 }, { nalsa_status_flags: ["child"] },
    ];
    for (const d of ALL_DISPUTES) {
      for (const g of geos) {
        for (const v of variants) {
          const r = route(slots({ dispute_type: d, ...v }), g);
          keys.add(r.first_peaceful_step.key);
          keys.add(r.legal_aid.reason_key);
          r.warnings.forEach((k) => keys.add(k));
          for (const o of [r.primary, ...r.alternatives]) {
            keys.add(o.why_key);
            if (o.blocked_reason_key) keys.add(o.blocked_reason_key);
            o.submission.forEach((m) => m.kind === "email" && keys.add(m.subjectKey));
          }
        }
      }
    }
    for (const t of timerDefs) keys.add(`timer.${t.key}`);
    const missing = [...keys].filter((k) => !(k in messagesEn));
    expect(missing).toEqual([]);
    for (const [k, v] of Object.entries(messagesEn)) {
      expect(v.includes("2014"), k).toBe(false);
      expect(v.length, k).toBeGreaterThan(5);
    }
    void liveTimers;
  });
});

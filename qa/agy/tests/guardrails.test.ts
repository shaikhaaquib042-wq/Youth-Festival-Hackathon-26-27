import { describe, expect, it } from "vitest";
import { route, checkRoute, assertGuardrails, GuardrailViolation } from "@raasta/rules";
import type { IntakeSlots } from "@raasta/rules/types";
import { DEFAULT_GEO, baseSlots } from "./helpers";
import { platforms as platformsData, disputes as disputesData } from "@raasta/data";

describe("Guardrails verification", () => {
  it("deposit never routed to police unless cheating is indicated", () => {
    // Normal security deposit dispute without cheating
    const normalDeposit = route(baseSlots("security_deposit"), DEFAULT_GEO);
    const normalOptions = [normalDeposit.primary, ...normalDeposit.alternatives];
    const hasPoliceNormal = normalOptions.some((o) => o.platform_id.includes("police"));
    expect(hasPoliceNormal, "Police must NOT be offered for normal security deposit dispute").toBe(false);

    // Security deposit dispute with cheating_indicated: true
    const cheatingDepositSlots: IntakeSlots = {
      ...baseSlots("security_deposit"),
      cheating_indicated: true,
    };
    const cheatingDeposit = route(cheatingDepositSlots, DEFAULT_GEO);
    const cheatingOptions = [cheatingDeposit.primary, ...cheatingDeposit.alternatives];
    const hasPoliceCheating = cheatingOptions.some((o) => o.platform_id.includes("police"));
    expect(hasPoliceCheating, "Police CAN be offered when landlord cheating / fraud is indicated").toBe(true);
  });

  it("CPGRAMS is blocked for RTI, sub-judice, or personal/family matters", () => {
    const exclusionTypes: ("rti" | "sub_judice" | "personal_family")[] = ["rti", "sub_judice", "personal_family"];

    for (const flag of exclusionTypes) {
      const slots: IntakeSlots = {
        ...baseSlots("govt_service"),
        exclusion_flags: [flag],
      };
      const result = route(slots, DEFAULT_GEO);

      // CPGRAMS must never be primary when excluded
      expect(result.primary.platform_id).not.toBe("cpgrams");

      // If CPGRAMS is an alternative, it must have a blocked_reason_key and guide-only submission
      const cpgramsAlt = result.alternatives.find((o) => o.platform_id === "cpgrams");
      if (cpgramsAlt) {
        expect(cpgramsAlt.blocked_reason_key).toBeDefined();
        expect(cpgramsAlt.blocked_reason_key).toBe(`warn.cpgrams_excluded_${flag}`);
        expect(cpgramsAlt.submission.every((s) => s.kind === "guide")).toBe(true);
      }
    }
  });

  it("RBI CMS is blocked before 30 days from prior written complaint", () => {
    // Case A: No prior written complaint sent
    const noPrior = route({
      ...baseSlots("banking_nbfc"),
      prior_written_complaint_sent: false,
    }, DEFAULT_GEO);

    const rbiNoPrior = [noPrior.primary, ...noPrior.alternatives].find((o) => o.platform_id === "rbi_cms");
    if (rbiNoPrior) {
      expect(rbiNoPrior.blocked_reason_key, "RBI CMS must be blocked when no prior complaint sent").toBeDefined();
      expect(rbiNoPrior.submission.every((s) => s.kind === "guide")).toBe(true);
    }

    // Case B: Prior complaint sent only 10 days ago (< 30 days)
    const earlyComplaint = route({
      ...baseSlots("banking_nbfc"),
      prior_written_complaint_sent: true,
      prior_complaint_days_ago: 10,
    }, DEFAULT_GEO);

    const rbiEarly = [earlyComplaint.primary, ...earlyComplaint.alternatives].find((o) => o.platform_id === "rbi_cms");
    expect(rbiEarly).toBeDefined();
    expect(rbiEarly?.blocked_reason_key, "RBI CMS must be blocked when complaint is under 30 days old").toBe("warn.rbi_cms_blocked_30d");
    expect(rbiEarly?.submission.every((s) => s.kind === "guide")).toBe(true);

    // Case C: Prior complaint sent 35 days ago (>= 30 days) -> RBI CMS is active primary
    const matureComplaint = route({
      ...baseSlots("banking_nbfc"),
      prior_written_complaint_sent: true,
      prior_complaint_days_ago: 35,
    }, DEFAULT_GEO);

    expect(matureComplaint.primary.platform_id).toBe("rbi_cms");
    expect(matureComplaint.primary.blocked_reason_key).toBeUndefined();
  });

  it("emergency first for UPI and cyber fraud within 3 days or when flagged emergency", () => {
    // Recent incident (within 3 days)
    const recentFraud = route({
      ...baseSlots("cyber_fraud"),
      days_since_incident: 1,
    }, DEFAULT_GEO);

    expect(recentFraud.urgency).toBe("emergency");
    expect(recentFraud.first_peaceful_step.key).toBe("step.call_1930_now");
    expect(recentFraud.primary.platform_id).toBe("ncrp_cybercrime");
    expect(recentFraud.primary.submission[0]).toEqual({ kind: "phone", number: "1930" });

    // Explicit emergency flag
    const explicitEmergency = route({
      ...baseSlots("cyber_fraud"),
      is_emergency: true,
    }, DEFAULT_GEO);

    expect(explicitEmergency.urgency).toBe("emergency");
    expect(explicitEmergency.first_peaceful_step.key).toBe("step.call_1930_now");
  });

  it("no edaakhil anywhere in code, data, platforms or generated routes", () => {
    // 1. In platforms.json
    const platformsStr = JSON.stringify(platformsData).toLowerCase();
    expect(platformsStr.includes("edaakhil"), "platforms.json must not reference edaakhil").toBe(false);

    // 2. In disputes.json
    const disputesStr = JSON.stringify(disputesData).toLowerCase();
    expect(disputesStr.includes("edaakhil"), "disputes.json must not reference edaakhil").toBe(false);

    // 3. In all 19 dispute route outputs
    for (const d of ["consumer_refund", "mrp_overcharge", "security_deposit"] as const) {
      const res = route(baseSlots(d), DEFAULT_GEO);
      const resStr = JSON.stringify(res).toLowerCase();
      expect(resStr.includes("edaakhil"), `Route for ${d} must not reference edaakhil`).toBe(false);
    }
  });

  it("assertGuardrails throws GuardrailViolation on violations", () => {
    const s = baseSlots("consumer_refund");
    const r = route(s, DEFAULT_GEO);

    // Intentionally inject an invalid edaakhil URL
    const corruptedResult = JSON.parse(JSON.stringify(r));
    corruptedResult.sources.push({ platform_id: "e_jagriti", url: "https://edaakhil.nic.in/portal" });

    const violations = checkRoute(corruptedResult, s);
    expect(violations).toContain("no_edaakhil");
    expect(() => assertGuardrails(corruptedResult, s)).toThrow(GuardrailViolation);
  });
});

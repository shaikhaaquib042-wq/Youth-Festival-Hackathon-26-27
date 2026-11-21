import type { DisputeTable, Ctx, ForumSpec } from "./types";
import { autofill, phone, wa } from "./shared";

/** Recent UPI or online banking fraud: 72 hours, or the user said it is an emergency. */
export function isFraudEmergency(c: Ctx): boolean {
  const d = c.slots.days_since_incident;
  return c.slots.is_emergency === true || (d !== undefined && d <= 3);
}

// Handbook 6.1 #7 and plan section 6: emergency screen first (tel:1930), bank zero-liability letter, cybercrime.gov.in evidence.
export const cyberFraud: DisputeTable = {
  dispute: "cyber_fraud",
  rows: [
    {
      id: "default",
      out: (c) => {
        const police: ForumSpec[] = c.isMH
          ? [{
              pid: "mahapolice_pune_police", why: "why.cyber_fraud_fir_escalation",
              sub: [phone("mahapolice_pune_police", "112"), wa("mahapolice_pune_police")],
            }]
          : [];
        return {
          urgency: isFraudEmergency(c) ? "emergency" : "time_sensitive",
          step: { key: "step.call_1930_now", doc_template: "bank_fraud_intimation", platform_id: "ncrp_cybercrime", free: true },
          primary: {
            pid: "ncrp_cybercrime", why: "why.cyber_fraud_1930_first",
            sla: "financial_fraud_golden_hour",
            sub: [phone("ncrp_cybercrime", "1930"), autofill("ncrp_cybercrime")],
          },
          alternatives: police,
          warnings: ["warn.bank_zero_liability_3d", "warn.fir_sign_in_person_3d", "warn.never_share_otp", "warn.privacy_mode"],
        };
      },
    },
  ],
  privacy: true,
};

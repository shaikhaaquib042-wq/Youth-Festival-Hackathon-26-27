import type { DisputeTable, Ctx } from "./types";
import { autofill, teleLawForum } from "./shared";

/** RBI CMS is open only after a written lender complaint plus 30 days (or an earlier unsatisfactory reply, which the user reports by waiting). */
export const RBI_WAIT_DAYS = 30;

export function rbiUnlocked(c: Ctx): boolean {
  return c.slots.prior_written_complaint_sent === true && (c.slots.prior_complaint_days_ago ?? -1) >= RBI_WAIT_DAYS;
}

// Handbook 6.1 #8: lender complaint generator + 30 day countdown -> RBI CMS, blocked before day 30.
export const bankingNbfc: DisputeTable = {
  dispute: "banking_nbfc",
  rows: [
    {
      id: "default",
      out: (c) => {
        const open = rbiUnlocked(c);
        const first = c.slots.prior_written_complaint_sent === true;
        return {
          urgency: c.slots.is_emergency ? "emergency" : first && !open ? "time_sensitive" : "normal",
          step: first
            ? { key: "step.banking_wait_30_days", platform_id: "rbi_cms", free: true }
            : { key: "step.banking_lender_complaint", doc_template: "rbi_lender_precomplaint", free: true },
          primary: {
            pid: "rbi_cms", why: "why.banking_rbi_cms", sla: "mandatory_lender_wait_days",
            sub: [autofill("rbi_cms")],
            blocked: open ? undefined : "warn.rbi_cms_blocked_30d",
          },
          alternatives: [teleLawForum()],
          warnings: [...(open ? [] : ["warn.rbi_cms_blocked_30d"]), "warn.rbi_upload_10mb", ...(c.slots.is_emergency ? ["warn.bank_zero_liability_3d"] : [])],
        };
      },
    },
  ],
};

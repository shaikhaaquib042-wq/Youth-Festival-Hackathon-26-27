import type { DisputeTable } from "./types";
import { autofill, inPerson, phone, wa } from "./shared";

// Handbook 6.1 #2: NCH WhatsApp prefill + District Legal Metrology + e-Jagriti.
export const mrpOvercharge: DisputeTable = {
  dispute: "mrp_overcharge",
  rows: [
    {
      id: "default",
      out: (c) => ({
        step: { key: "step.mrp_ask_refund_and_photo", doc_template: "nch_text", free: true },
        primary: {
          pid: "nch_ingram", why: "why.mrp_nch_whatsapp", sla: "nature",
          sub: [wa("nch_ingram"), phone("nch_ingram", "1915")],
        },
        alternatives: [
          {
            pid: "e_jagriti", why: "why.consumer_ejagriti", sla: "limitation_period_years",
            sub: [autofill("e_jagriti"), ...(c.isPune ? [inPerson("consumer_commission_pune_main")] : [])],
          },
        ],
        offices: c.isPune ? ["consumer_commission_pune_main"] : [],
        warnings: ["warn.mrp_legal_metrology", "warn.nch_no_pause_limitation"],
      }),
    },
  ],
};

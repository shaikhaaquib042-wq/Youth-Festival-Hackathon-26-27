import type { DisputeTable, Ctx, ForumSpec } from "./types";
import { autofill, inPerson, phone, wa, nalsaForum } from "./shared";

const nch = (): ForumSpec => ({
  pid: "nch_ingram", why: "why.consumer_nch_first", sla: "nature",
  sub: [phone("nch_ingram", "1915"), wa("nch_ingram")],
});

const ejagriti = (c: Ctx): ForumSpec => ({
  pid: "e_jagriti", why: "why.consumer_ejagriti", sla: "limitation_period_years",
  sub: [autofill("e_jagriti"), ...(c.isPune ? [inPerson("consumer_commission_pune_main")] : [])],
});

const punePlaces = (c: Ctx): string[] =>
  c.isPune ? ["consumer_commission_pune_main", "consumer_commission_pune_additional"] : [];

// Handbook 6.1 #1: Company GRO -> NCH (1915 / WhatsApp) -> e-Jagriti. Timer: 2 year limitation, NCH does not pause it.
export const consumerRefund: DisputeTable = {
  dispute: "consumer_refund",
  rows: [
    {
      id: "notice_sent_go_to_commission",
      when: (c) => c.slots.prior_written_complaint_sent === true && (c.slots.prior_complaint_days_ago ?? 0) >= 15,
      out: (c) => ({
        step: { key: "step.consumer_file_ejagriti", doc_template: "ejagriti_draft", platform_id: "e_jagriti", free: true },
        primary: ejagriti(c),
        alternatives: [nch(), nalsaForum(c)],
        offices: punePlaces(c),
        warnings: ["warn.nch_no_pause_limitation", "warn.forum_exclusivity_consumer"],
      }),
    },
    {
      id: "default",
      out: (c) => ({
        step: { key: "step.consumer_gro_letter", doc_template: "gro_letter", free: true },
        primary: nch(),
        alternatives: [ejagriti(c), nalsaForum(c)],
        offices: punePlaces(c),
        warnings: ["warn.nch_no_pause_limitation"],
      }),
    },
  ],
};

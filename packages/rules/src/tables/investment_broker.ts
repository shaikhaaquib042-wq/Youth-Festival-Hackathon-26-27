import type { DisputeTable } from "./types";
import { autofill, phone, teleLawForum } from "./shared";

export const investmentBroker: DisputeTable = {
  dispute: "investment_broker",
  rows: [
    {
      id: "default",
      out: () => ({
        step: { key: "step.broker_complaint_first", doc_template: "grievance_text", free: true },
        primary: {
          pid: "sebi_scores", why: "why.broker_sebi_scores", sla: "entity_response_calendar_days",
          sub: [autofill("sebi_scores"), phone("sebi_scores", "1800-22-7575")],
        },
        alternatives: [teleLawForum()],
        warnings: ["warn.sebi_not_market_loss"],
      }),
    },
  ],
};

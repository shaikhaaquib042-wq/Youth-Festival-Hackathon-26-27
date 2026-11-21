import type { DisputeTable } from "./types";
import { autofill, teleLawForum } from "./shared";

export const lostMobile: DisputeTable = {
  dispute: "lost_mobile",
  rows: [
    {
      id: "maharashtra",
      when: (c) => c.isMH,
      out: () => ({
        step: { key: "step.lost_mobile_block_and_report", doc_template: "police_complaint", free: true },
        primary: {
          pid: "mahapolice_pune_police", why: "why.lost_mobile_form", url_key: "mobile_missing_form", sla: "electronic_fir_rule",
          sub: [autofill("mahapolice_pune_police")],
        },
        alternatives: [],
        warnings: ["warn.fir_sign_in_person_3d", "warn.lost_found_info_only"],
      }),
    },
    {
      id: "other_state",
      out: () => ({
        step: { key: "step.lost_mobile_block_and_report", doc_template: "police_complaint", free: true },
        primary: teleLawForum("why.police_other_state_advice"),
        alternatives: [],
        warnings: ["warn.state_office_not_in_data"],
      }),
    },
  ],
};

import type { DisputeTable } from "./types";
import { autofill, phone, teleLawForum } from "./shared";

// Handbook 6.1 #9: MahaRERA registration check -> conciliation (Rs 1,000 + GST) vs Form A (Rs 5,000) + forum-exclusivity notice.
export const builderDelay: DisputeTable = {
  dispute: "builder_delay",
  rows: [
    {
      id: "maharashtra",
      when: (c) => c.isMH,
      out: () => ({
        step: { key: "step.builder_check_maharera", doc_template: "maharera_conciliation", platform_id: "maharera", free: true },
        primary: {
          pid: "maharera", why: "why.builder_conciliation", fee: "conciliation_forum", sla: "conciliation_consent_days",
          sub: [autofill("maharera"), phone("maharera", "1800-210-3770")],
        },
        alternatives: [
          {
            pid: "maharera", why: "why.builder_form_a", fee: "formal_complaint_form_a_or_b", sla: "statutory_disposal_target_days",
            sub: [autofill("maharera")],
          },
          teleLawForum(),
        ],
        warnings: ["warn.forum_exclusivity_rera"],
      }),
    },
    {
      id: "other_state",
      out: () => ({
        step: { key: "step.builder_check_rera_registration", free: true },
        primary: teleLawForum("why.builder_other_state_advice"),
        alternatives: [],
        warnings: ["warn.state_rera_not_in_data", "warn.forum_exclusivity_rera"],
      }),
    },
  ],
};

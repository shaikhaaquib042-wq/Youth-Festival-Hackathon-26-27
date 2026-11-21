import type { DisputeTable } from "./types";
import { autofill, nalsaForum } from "./shared";

// Handbook 6.1 plan: SHe-Box + internal committee guidance. Privacy mode: nothing stored, no AI call unless the user opts in.
export const workplaceHarassment: DisputeTable = {
  dispute: "workplace_harassment",
  privacy: true,
  rows: [
    {
      id: "default",
      out: (c) => ({
        urgency: c.slots.is_emergency ? "emergency" : "normal",
        step: { key: "step.posh_internal_committee", doc_template: "shebox_narrative", platform_id: "she_box", free: true },
        primary: {
          pid: "she_box", why: "why.posh_shebox",
          sub: [autofill("she_box")],
        },
        alternatives: [nalsaForum(c, "why.posh_legal_aid")],
        warnings: ["warn.privacy_mode", "warn.shebox_posh_only"],
      }),
    },
  ],
};

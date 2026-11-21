import type { DisputeTable } from "./types";
import { nalsaForum, teleLawForum } from "./shared";

export const freeLegalAid: DisputeTable = {
  dispute: "free_legal_aid",
  rows: [
    {
      id: "default",
      out: (c) => ({
        step: { key: "step.legal_aid_screener", doc_template: "legal_aid_application", free: true },
        primary: nalsaForum(c, "why.legal_aid_dlsa"),
        alternatives: [teleLawForum()],
        offices: c.isPune ? ["dlsa_pune"] : [],
        warnings: ["warn.legal_aid_genuine_case"],
      }),
    },
  ],
};

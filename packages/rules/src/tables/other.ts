import type { DisputeTable } from "./types";
import { nalsaForum, teleLawForum } from "./shared";

export const other: DisputeTable = {
  dispute: "other",
  rows: [
    {
      id: "default",
      out: (c) => ({
        step: { key: "step.other_get_free_advice", doc_template: "grievance_text", free: true },
        primary: teleLawForum("why.other_tele_law"),
        alternatives: [nalsaForum(c)],
        warnings: [],
      }),
    },
  ],
};

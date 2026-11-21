import type { DisputeTable } from "./types";
import { autofill, cpgramsForum, exclusionsHit, phone, teleLawForum } from "./shared";

export const pensionPf: DisputeTable = {
  dispute: "pension_pf",
  rows: [
    {
      id: "default",
      out: (c) => ({
        step: { key: "step.pf_keep_uan_ready", doc_template: "grievance_text", free: true },
        primary: {
          pid: "epfigms", why: "why.pf_epfigms",
          sub: [autofill("epfigms"), phone("epfigms", "14470")],
        },
        alternatives: [exclusionsHit(c) ? teleLawForum() : cpgramsForum(c, "why.govt_cpgrams_if_central")],
        warnings: exclusionsHit(c) ? ["warn.cpgrams_excluded"] : ["warn.cpgrams_no_email"],
      }),
    },
  ],
};

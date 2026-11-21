import type { DisputeTable, ForumSpec } from "./types";
import { aapleSarkarForum, cpgramsForum, exclusionsHit, stateGrievanceForum, teleLawForum } from "./shared";

const step = { key: "step.govt_apply_then_grievance", doc_template: "grievance_text", free: true };

// Handbook 6.1 #10: Aaple Sarkar (state, 21 working days) vs CPGRAMS (central, 21 days) with exclusion filter.
export const govtService: DisputeTable = {
  dispute: "govt_service",
  rows: [
    {
      id: "excluded_from_cpgrams",
      when: (c) => exclusionsHit(c),
      out: (c) => ({
        step: { key: "step.govt_excluded_get_advice", free: true },
        primary: teleLawForum("why.govt_excluded_advice"),
        alternatives: [cpgramsForum(c)],
        warnings: ["warn.cpgrams_excluded"],
      }),
    },
    {
      id: "central",
      when: (c) => c.slots.employer_sphere === "central",
      out: (c) => ({
        step,
        primary: cpgramsForum(c, "why.govt_cpgrams_central"),
        alternatives: c.isMH ? [aapleSarkarForum()] : [],
        warnings: ["warn.cpgrams_no_email"],
      }),
    },
    {
      id: "maharashtra",
      when: (c) => c.isMH,
      out: (c) => ({
        step,
        primary: aapleSarkarForum("why.govt_aaple_state"),
        alternatives: c.slots.employer_sphere === "state" ? [] : [cpgramsForum(c, "why.govt_cpgrams_if_central")],
        warnings: ["warn.cpgrams_no_email"],
      }),
    },
    {
      id: "other_state_portal",
      when: (c) => !!stateGrievanceForum(c),
      out: (c) => ({
        step,
        primary: stateGrievanceForum(c, "why.govt_state_portal") as ForumSpec,
        alternatives: [cpgramsForum(c, "why.govt_cpgrams_if_central")],
        warnings: ["warn.cpgrams_no_email"],
      }),
    },
    {
      id: "fallback",
      out: (c) => ({
        step,
        primary: cpgramsForum(c, "why.govt_cpgrams_central"),
        alternatives: [teleLawForum()],
        warnings: ["warn.state_office_not_in_data", "warn.cpgrams_no_email", ...(c.state ? [] : ["warn.location_unknown"])],
      }),
    },
  ],
};

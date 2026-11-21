import type { DisputeTable } from "./types";
import { email, nalsaForum, wa } from "./shared";

const step = { key: "step.neighbour_letter_then_mediation", doc_template: "neighbour_letter", free: true };

// Handbook 6.1 #5: dual track. PMC encroachment + GPS-matched ward office, and DLSA / civil injunction guide.
// office ids "pmc_ward" and "pmc_zone" are placeholders resolved from geo.pmc_ward_id.
export const neighbourConstruction: DisputeTable = {
  dispute: "neighbour_construction",
  rows: [
    {
      id: "pmc",
      when: (c) => c.ulb === "PMC",
      out: (c) => ({
        step,
        primary: {
          pid: "pmc_care_pune", why: "why.neighbour_pmc_encroachment", sla: "observed_third_party_estimates",
          sub: [
            email("pmc_care_pune", "encroachment1@punecorporation.org", "email.subject.encroachment"),
            ...(c.geo.pmc_ward_id ? [email("pmc_care_pune", "ward", "email.subject.encroachment")] : []),
            wa("pmc_care_pune"),
          ],
        },
        alternatives: [nalsaForum(c, "why.neighbour_dlsa_injunction")],
        offices: ["pmc_ward", "pmc_zone", "dlsa_pune"],
        warnings: ["warn.neighbour_two_tracks", "warn.pmc_no_iframe"],
      }),
    },
    {
      id: "pcmc",
      when: (c) => c.ulb === "PCMC",
      out: (c) => ({
        step,
        primary: { pid: "pcmc_grievance", why: "why.neighbour_pcmc_complaint", sub: [wa("pcmc_grievance")] },
        alternatives: [nalsaForum(c, "why.neighbour_dlsa_injunction")],
        offices: ["dlsa_pune"],
        warnings: ["warn.neighbour_two_tracks"],
      }),
    },
    {
      id: "other_places",
      out: (c) => ({
        step,
        primary: nalsaForum(c, "why.neighbour_dlsa_injunction"),
        alternatives: [],
        offices: c.isPune ? ["dlsa_pune"] : [],
        warnings: ["warn.neighbour_two_tracks", "warn.local_body_not_in_data"],
      }),
    },
  ],
};

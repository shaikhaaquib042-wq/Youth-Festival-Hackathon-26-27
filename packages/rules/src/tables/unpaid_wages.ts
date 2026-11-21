import type { DisputeTable, Ctx, ForumSpec } from "./types";
import { autofill, email, inPerson, phone, nalsaForum } from "./shared";

const samadhan = (): ForumSpec => ({
  pid: "samadhan_labour", why: "why.wages_samadhan_central",
  sub: [
    autofill("samadhan_labour"),
    email("samadhan_labour", "samadhan-mole@gov.in", "email.subject.wages_claim"),
    phone("samadhan_labour", "011-23354722"),
  ],
});

const mahakamgar = (c: Ctx): ForumSpec => ({
  pid: "mahakamgar_labour", why: "why.wages_mahakamgar_state", sla: "gratuity_due_window_days",
  sub: [
    autofill("mahakamgar_labour"),
    ...(c.isPune ? [inPerson("labour_commissioner_pune_division")] : []),
    phone("mahakamgar_labour", "020-25542611"),
  ],
});

const demandStep = { key: "step.wages_demand_notice_7d", doc_template: "demand_notice_wages", free: true };

// Handbook 6.1 #3: 7-day demand notice -> Mahakamgar / Pune ALC (state sphere) or SAMADHAN (central sphere)
// + civil summary suit flag + NALSA industrial-workman check (see legalAidCheck).
export const unpaidWages: DisputeTable = {
  dispute: "unpaid_wages",
  rows: [
    {
      id: "central_sphere",
      when: (c) => c.slots.employer_sphere === "central",
      out: (c) => ({
        step: demandStep,
        primary: samadhan(),
        alternatives: [nalsaForum(c)],
        offices: c.isPune ? ["central_labour_office_pune"] : [],
        warnings: ["warn.wages_civil_suit_option"],
      }),
    },
    {
      id: "maharashtra_state_or_unknown_sphere",
      when: (c) => c.isMH,
      out: (c) => ({
        step: demandStep,
        primary: mahakamgar(c),
        alternatives: [...(c.slots.employer_sphere === "state" ? [] : [samadhan()]), nalsaForum(c)],
        offices: c.isPune
          ? ["labour_commissioner_pune_division", "pune_city_worker_facility_centre", "pcmc_worker_facility_centre"]
          : [],
        warnings: ["warn.wages_civil_suit_option", ...(c.slots.employer_sphere === "state" ? [] : ["warn.wages_sphere_unknown"])],
      }),
    },
    {
      id: "other_state_or_unknown_location",
      out: (c) => ({
        step: demandStep,
        primary: nalsaForum(c, "why.wages_legal_aid_no_state_office"),
        alternatives: [samadhan()],
        warnings: ["warn.state_office_not_in_data", "warn.wages_civil_suit_option"],
      }),
    },
  ],
};

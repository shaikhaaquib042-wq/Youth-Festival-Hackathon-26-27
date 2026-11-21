import type { DisputeTable } from "./types";
import { autofill, phone, teleLawForum, wa } from "./shared";

// Civil-vs-criminal gate first. The Maharashtra police portal is only offered in Maharashtra.
export const policeComplaint: DisputeTable = {
  dispute: "police_complaint",
  privacy: true,
  rows: [
    {
      id: "violence",
      when: (c) => c.slots.violence_indicated === true,
      out: (c) => ({
        urgency: "emergency",
        step: { key: "step.police_violence_safety", doc_template: "police_complaint", free: true },
        primary: c.isMH
          ? { pid: "mahapolice_pune_police", why: "why.police_violence", sla: "electronic_fir_rule", sub: [phone("mahapolice_pune_police", "112")] }
          : teleLawForum("why.police_violence_other_state"),
        alternatives: [teleLawForum()],
        warnings: ["warn.privacy_mode", "warn.zero_fir", "warn.free_legal_aid_survivor"],
      }),
    },
    {
      id: "maharashtra",
      when: (c) => c.isMH,
      out: (c) => ({
        urgency: c.slots.is_emergency ? "emergency" : "normal",
        step: { key: "step.police_civil_or_criminal", doc_template: "police_complaint", free: true },
        primary: {
          pid: "mahapolice_pune_police", why: "why.police_mahapolice", sla: "electronic_fir_rule",
          sub: [phone("mahapolice_pune_police", "112"), ...(c.isPune ? [wa("mahapolice_pune_police")] : []), autofill("mahapolice_pune_police")],
        },
        alternatives: [teleLawForum()],
        warnings: ["warn.privacy_mode", "warn.fir_sign_in_person_3d", "warn.civil_not_police"],
      }),
    },
    {
      id: "other_state",
      out: () => ({
        step: { key: "step.police_civil_or_criminal", doc_template: "police_complaint", free: true },
        primary: teleLawForum("why.police_other_state_advice"),
        alternatives: [],
        warnings: ["warn.privacy_mode", "warn.state_office_not_in_data", "warn.civil_not_police"],
      }),
    },
  ],
};

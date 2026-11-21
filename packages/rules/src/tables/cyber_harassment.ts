import type { DisputeTable, ForumSpec } from "./types";
import { autofill, phone, wa } from "./shared";

export const cyberHarassment: DisputeTable = {
  dispute: "cyber_harassment",
  privacy: true,
  rows: [
    {
      id: "default",
      out: (c) => {
        const police: ForumSpec[] = c.isMH
          ? [{
              pid: "mahapolice_pune_police", why: "why.harassment_police_fir",
              sub: [phone("mahapolice_pune_police", "112"), wa("mahapolice_pune_police"), autofill("mahapolice_pune_police")],
            }]
          : [];
        return {
          urgency: c.slots.is_emergency ? "emergency" : "normal",
          step: { key: "step.cyber_harassment_save_evidence", doc_template: "police_complaint", free: true },
          primary: {
            pid: "ncrp_cybercrime", why: "why.cyber_harassment_portal",
            sub: [autofill("ncrp_cybercrime"), phone("ncrp_cybercrime", "112")],
          },
          alternatives: police,
          warnings: ["warn.privacy_mode", "warn.fir_sign_in_person_3d"],
        };
      },
    },
  ],
};

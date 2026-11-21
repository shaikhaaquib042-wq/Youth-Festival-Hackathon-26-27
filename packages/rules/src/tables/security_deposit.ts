import type { DisputeTable, ForumSpec } from "./types";
import { inPerson, phone, teleLawForum, nalsaForum } from "./shared";

// Handbook 6.1 #4: 15-day notice -> Tele-Law / DLSA (Lok Adalat) -> Small Causes Court. Never police unless cheating.
export const securityDeposit: DisputeTable = {
  dispute: "security_deposit",
  rows: [
    {
      id: "default",
      out: (c) => {
        const smallCauses: ForumSpec[] = c.isMH
          ? [{
              pid: "maharashtra_rent_small_causes_pune", why: "why.deposit_small_causes",
              sub: c.isPune ? [inPerson("district_court_pune_tenancy")] : [],
            }]
          : [];
        const cheating = c.slots.cheating_indicated === true;
        const police: ForumSpec[] =
          cheating && c.isMH
            ? [{ pid: "mahapolice_pune_police", why: "why.deposit_police_only_cheating", sub: [phone("mahapolice_pune_police", "112")] }]
            : [];
        return {
          step: { key: "step.deposit_notice_15d", doc_template: "deposit_notice", free: true },
          primary: teleLawForum("why.deposit_tele_law_first"),
          alternatives: [nalsaForum(c, "why.deposit_dlsa_lok_adalat"), ...smallCauses, ...police],
          offices: c.isPune ? ["dlsa_pune", "district_court_pune_tenancy"] : [],
          warnings: [
            ...(cheating ? [] : ["warn.not_police_for_deposit"]),
            ...(c.isMH ? [] : ["warn.state_office_not_in_data"]),
          ],
        };
      },
    },
  ],
};

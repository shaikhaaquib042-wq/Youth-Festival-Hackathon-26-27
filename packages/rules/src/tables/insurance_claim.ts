import type { DisputeTable } from "./types";
import { autofill, email, phone } from "./shared";

// Written grievance to the insurer GRO first, then IRDAI / Insurance Ombudsman. Never route blindly to bimabharosa.
export const insuranceClaim: DisputeTable = {
  dispute: "insurance_claim",
  rows: [
    {
      id: "default",
      out: () => ({
        step: { key: "step.insurance_write_to_gro", doc_template: "grievance_text", free: true },
        primary: {
          pid: "irdai_bima_bharosa_ombudsman", why: "why.insurance_irdai", sla: "insurer_gro_resolution_days",
          url_key: "irdai_gro_directory",
          sub: [
            email("irdai_bima_bharosa_ombudsman", "complaints@irdai.gov.in", "email.subject.insurance"),
            phone("irdai_bima_bharosa_ombudsman", "155255"),
            autofill("irdai_bima_bharosa_ombudsman"),
          ],
        },
        alternatives: [{
          pid: "nch_ingram", why: "why.insurance_nch", sla: "nature",
          sub: [phone("nch_ingram", "1915")],
        }],
        warnings: ["warn.irdai_verify_link"],
      }),
    },
  ],
};

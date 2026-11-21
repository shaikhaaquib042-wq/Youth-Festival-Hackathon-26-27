import { platforms, platformById, states } from "@raasta/data";
import type { IntakeSlots, GeoContext } from "@raasta/rules/types";

export const ALL_19_DISPUTES = [
  "consumer_refund", "mrp_overcharge", "unpaid_wages", "security_deposit",
  "neighbour_construction", "civic_failure", "cyber_fraud", "cyber_harassment",
  "banking_nbfc", "insurance_claim", "investment_broker", "builder_delay",
  "govt_service", "pension_pf", "workplace_harassment", "police_complaint",
  "lost_mobile", "free_legal_aid", "other",
] as const;

export const DEFAULT_GEO: GeoContext = {
  state_code: "MH",
  city: "Pune",
  ulb: "PMC",
  pmc_ward_id: "pmc_ward_kothrud_bavdhan",
  coverage: "deep",
};

export const OUTSIDE_MH_GEO: GeoContext = {
  state_code: "DL",
  city: "New Delhi",
  coverage: "standard",
};

export function baseSlots(dispute_type: (typeof ALL_19_DISPUTES)[number]): IntakeSlots {
  return {
    dispute_type,
    summary: `Test dispute for ${dispute_type}`,
    state_code: "MH",
    city: "Pune",
    missing_fields: [],
  };
}

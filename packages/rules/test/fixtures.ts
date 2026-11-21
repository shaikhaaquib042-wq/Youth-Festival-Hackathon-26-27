import type { GeoContext, IntakeSlots } from "../src/types";

export const slots = (o: Partial<IntakeSlots> = {}): IntakeSlots => ({
  dispute_type: "consumer_refund",
  summary: "test case",
  missing_fields: [],
  ...o,
});

export const GEO = {
  pmc: { state_code: "MH", city: "Pune", ulb: "PMC", pmc_ward_id: "pmc_ward_kothrud_bavdhan", coverage: "deep" } as GeoContext,
  pmcNoWard: { state_code: "MH", city: "Pune", ulb: "PMC", coverage: "deep" } as GeoContext,
  pcmc: { state_code: "MH", city: "Pimpri-Chinchwad", ulb: "PCMC", coverage: "deep" } as GeoContext,
  nagpur: { state_code: "MH", city: "Nagpur", coverage: "deep" } as GeoContext,
  mumbai: { state_code: "MH", city: "Mumbai", coverage: "deep" } as GeoContext,
  kerala: { state_code: "KL", city: "Kochi", coverage: "standard" } as GeoContext,
  keralaDigit: { state_code: "KL", city: "Kochi", digit_tenant_id: "kl.kochi", coverage: "standard" } as GeoContext,
  up: { state_code: "UP", city: "Lucknow", coverage: "standard" } as GeoContext,
  delhi: { state_code: "DL", city: "Delhi", coverage: "standard" } as GeoContext,
  unknown: { coverage: "unknown" } as GeoContext,
};

export const ALL_DISPUTES = [
  "consumer_refund", "mrp_overcharge", "unpaid_wages", "security_deposit", "neighbour_construction",
  "civic_failure", "cyber_fraud", "cyber_harassment", "banking_nbfc", "insurance_claim", "investment_broker",
  "builder_delay", "govt_service", "pension_pf", "workplace_harassment", "police_complaint", "lost_mobile",
  "free_legal_aid", "other",
] as const;

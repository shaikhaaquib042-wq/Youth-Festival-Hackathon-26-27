// CONTRACT FILE. Owned by the orchestrator. Agents may read, not change, without approval.

export type DisputeType =
  | "consumer_refund" | "mrp_overcharge" | "unpaid_wages" | "security_deposit"
  | "neighbour_construction" | "civic_failure" | "cyber_fraud" | "cyber_harassment"
  | "banking_nbfc" | "insurance_claim" | "investment_broker" | "builder_delay"
  | "govt_service" | "pension_pf" | "workplace_harassment" | "police_complaint"
  | "lost_mobile" | "free_legal_aid" | "other";

export const DISPUTE_TYPES: DisputeType[] = [
  "consumer_refund", "mrp_overcharge", "unpaid_wages", "security_deposit",
  "neighbour_construction", "civic_failure", "cyber_fraud", "cyber_harassment",
  "banking_nbfc", "insurance_claim", "investment_broker", "builder_delay",
  "govt_service", "pension_pf", "workplace_harassment", "police_complaint",
  "lost_mobile", "free_legal_aid", "other",
];

export type NalsaFlag =
  | "woman" | "child" | "sc_st" | "industrial_workman" | "disability"
  | "custody" | "trafficking" | "disaster";

export interface IntakeSlots {
  dispute_type: DisputeType;
  summary: string; // <= 280 chars, PII-redacted
  state_code?: string; // ISO-like 2 letter, e.g. "MH"
  district?: string;
  city?: string;
  lat?: number;
  lng?: number;
  amount_inr?: number;
  days_since_incident?: number;
  prior_written_complaint_sent?: boolean;
  prior_complaint_days_ago?: number;
  opposite_party_type?: "company" | "shop" | "landlord" | "employer" | "neighbour" | "government" | "bank" | "unknown";
  employer_sphere?: "central" | "state" | "unknown";
  is_emergency?: boolean;
  cheating_indicated?: boolean; // deposit cases: lets police be offered
  nalsa_status_flags?: NalsaFlag[];
  annual_income_inr?: number;
  exclusion_flags?: ("rti" | "sub_judice" | "personal_family")[]; // govt_service filter
  missing_fields: string[]; // max 3 follow-ups
}

/** Resolved by the Worker geo resolver before routing. */
export interface GeoContext {
  state_code?: string;
  city?: string;
  ulb?: "PMC" | "PCMC" | string; // urban local body
  pmc_ward_id?: string; // id in offices.pune.json ward table
  digit_tenant_id?: string; // set when the ULB runs DIGIT/UPYOG PGR
  coverage: "deep" | "standard" | "unknown";
}

export interface Step {
  key: string; // i18n key, e.g. "step.deposit_notice_15d"
  doc_template?: string; // docs-gen template id, e.g. "deposit_notice"
  platform_id?: string;
  free: boolean;
}

export interface ChecklistItem {
  key: string; // i18n key or stable id
  label_en: string;
  required: boolean;
}

export interface TimerSpec {
  key: string; // e.g. "consumer_limitation_2y"
  label_en: string;
  days: number;
  from: "incident" | "prior_complaint" | "now";
  note_en?: string;
}

export interface OfficeRef {
  office_id: string; // id in offices.pune.json, or "slsa:<STATE>", or "overpass:<id>"
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  lat?: number;
  lng?: number;
  verified: boolean;
  url?: string; // optional link (e.g. NALSA directory) for offices that have no street address
}

export type SubmissionMode =
  | { kind: "api"; adapter: "digit_pgr"; tenantId: string }
  | { kind: "prefill_url"; template: string }
  | { kind: "autofill_helper"; portal: string }
  | { kind: "whatsapp"; template: string } // full wa.me URL template with {summary} etc
  | { kind: "email"; to: string; cc?: string; subjectKey: string }
  | { kind: "post"; addressRef: string }
  | { kind: "phone"; number: string }
  | { kind: "in_person"; officeRef: string }
  | { kind: "guide" };

export interface ForumOption {
  platform_id: string; // id from platforms.json
  why_key: string; // i18n key
  fee: string;
  sla: string;
  submission: SubmissionMode[]; // best-first, always ends with { kind: "guide" }
  blocked_reason_key?: string; // e.g. RBI CMS before day 30
}

export interface RouteResult {
  dispute_type: DisputeType;
  urgency: "emergency" | "time_sensitive" | "normal";
  first_peaceful_step: Step;
  primary: ForumOption;
  alternatives: ForumOption[];
  documents: ChecklistItem[];
  timers: TimerSpec[];
  legal_aid: { eligible: "yes" | "likely" | "check" | "no"; reason_key: string; contact: OfficeRef };
  offices: OfficeRef[];
  warnings: string[]; // guardrail keys
  sources: { platform_id: string; url: string }[];
}

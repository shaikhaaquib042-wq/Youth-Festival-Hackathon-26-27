import { z } from "zod";

export const DISPUTE_IDS = [
  "consumer_refund", "mrp_overcharge", "unpaid_wages", "security_deposit",
  "neighbour_construction", "civic_failure", "cyber_fraud", "cyber_harassment",
  "banking_nbfc", "insurance_claim", "investment_broker", "builder_delay",
  "govt_service", "pension_pf", "workplace_harassment", "police_complaint",
  "lost_mobile", "free_legal_aid", "other",
] as const;

export const CATEGORY_IDS = [
  "money_shopping", "work", "home", "civic", "police", "cyber", "govt", "legal_aid",
] as const;

export const NALSA_FLAGS = [
  "woman", "child", "sc_st", "industrial_workman", "disability",
  "custody", "trafficking", "disaster",
] as const;

export const INTAKE_SLOTS = [
  "dispute_type", "summary", "state_code", "district", "city", "lat", "lng",
  "amount_inr", "days_since_incident", "prior_written_complaint_sent",
  "prior_complaint_days_ago", "opposite_party_type", "employer_sphere",
  "is_emergency", "cheating_indicated", "nalsa_status_flags", "annual_income_inr",
  "exclusion_flags", "missing_fields",
] as const;

export const LOCALE_CODES = [
  "en", "hi", "mr", "bn", "ta", "te", "kn", "ml", "gu", "pa", "or", "ur",
] as const;

const kebabIcon = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lucide icon name, kebab-case");

// ---------- platforms (source: List of directories.json, verbatim) ----------
// Only the keys that every record carries are required; the rest are optional
// because the registry is not uniform. Unknown keys pass through.
const obj = z.record(z.string(), z.unknown());
export const platformSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    managing_body: z.string().min(1),
    tier: z.string().min(1),
    domain: z.string().min(1),
    jurisdiction: z.string().min(1),
    urls: obj.optional(),
    contact_channels: obj.optional(),
    languages_supported: z.string().optional(),
    categories: z.array(z.unknown()).optional(),
    fees: obj.optional(),
    sla_and_timelines: obj.optional(),
    mandatory_pre_steps: z.array(z.unknown()).optional(),
    exclusions: z.array(z.unknown()).optional(),
    documents_required: z.array(z.unknown()).optional(),
    upload_constraints: obj.optional(),
    step_by_step_guide: z.array(z.unknown()).optional(),
    escalation_path: z.string().optional(),
    automation: obj.optional(),
    eligibility_and_thresholds: obj.optional(),
    metros: z.array(z.unknown()).optional(),
    license: z.string().optional(),
    api_specifications: obj.optional(),
  })
  .passthrough();
export type Platform = z.infer<typeof platformSchema>;

// ---------- disputes ----------
const guidedQuestionSchema = z.object({
  id: z.string().min(1),
  label_en: z.string().min(1),
  type: z.enum(["number", "date", "boolean", "text", "select"]),
  options: z
    .array(z.object({ value: z.string().min(1), label_en: z.string().min(1) }))
    .optional(),
  slot: z.enum(INTAKE_SLOTS).optional(),
});

const checklistItemSchema = z.object({
  key: z.string().min(1),
  label_en: z.string().min(1),
  required: z.boolean(),
});

export const disputeSchema = z.object({
  id: z.enum(DISPUTE_IDS),
  category: z.enum(CATEGORY_IDS),
  icon: kebabIcon,
  title_en: z.string().min(1),
  short_en: z.string().min(1),
  depth: z.enum(["full", "standard"]),
  questions: z.array(guidedQuestionSchema).max(6),
  documents: z.array(checklistItemSchema),
  template_variables: z.array(z.string().min(1)),
  default_platform_ids: z.array(z.string().min(1)).min(1),
  doc_templates: z.array(z.string().min(1)),
});
export type Dispute = z.infer<typeof disputeSchema>;

// ---------- offices ----------
export const officeSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "ward_office", "zone_dmc", "consumer_commission", "labour_office", "legal_aid",
    "police", "court", "regulator", "municipal_hq", "other",
  ]),
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  hours: z.string().optional(),
  city: z.string().min(1),
  state_code: z.string().length(2),
  zone: z.string().optional(),
  cc_office_id: z.string().optional(),
  verified: z.boolean(),
  source: z.string().min(1),
});
export type Office = z.infer<typeof officeSchema>;

// ---------- legal aid ----------
export const legalAidSchema = z.object({
  section12_flags: z.array(z.object({ flag: z.enum(NALSA_FLAGS), label_en: z.string().min(1) })),
  states: z.array(
    z.object({
      state_code: z.string().length(2),
      name: z.string().min(1),
      income_ceiling_inr: z.number().int().positive().nullable(),
      ceiling_note: z.string().optional(),
    }),
  ),
  tele_law_note_en: z.string().min(1),
  helpline: z.literal("15100"),
});
export type LegalAidData = z.infer<typeof legalAidSchema>;

// ---------- states ----------
export const stateInfoSchema = z.object({
  code: z.string().length(2),
  name: z.string().min(1),
  languages: z.array(z.enum(LOCALE_CODES)).min(1),
  coverage: z.enum(["deep", "standard"]),
  grievance_portal: z
    .object({ name: z.string().min(1), url: z.string().url(), verified: z.boolean() })
    .optional(),
  slsa: z
    .object({
      name: z.string().min(1),
      url: z.string().url(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      verified: z.boolean(),
    })
    .optional(),
  legal_aid_ceiling_inr: z.number().int().positive().nullable(),
});
export type StateInfo = z.infer<typeof stateInfoSchema>;

// ---------- timers ----------
export const timerDefSchema = z.object({
  key: z.string().min(1),
  label_en: z.string().min(1),
  days: z.number().int().nonnegative(),
  from: z.enum(["incident", "prior_complaint", "now"]),
  note_en: z.string().optional(),
  dispute_types: z.array(z.enum(DISPUTE_IDS)).min(1),
});
export type TimerDef = z.infer<typeof timerDefSchema>;

// ---------- derived platform insights (Ollama draft) ----------
export const platformInsightSchema = z.object({
  platform_id: z.string().min(1),
  plain_summary_en: z.string().min(1),
  who_should_use: z.string().min(1),
  intent_keywords: z.object({
    en: z.array(z.string()),
    hi: z.array(z.string()),
    mr: z.array(z.string()),
  }),
  dispute_types: z.array(z.enum(DISPUTE_IDS)),
  first_peaceful_step_hint: z.string().min(1),
});
export const platformInsightsFileSchema = z.object({
  source: z.literal("qwen3.5:4b-draft"),
  generated_at: z.string(),
  items: z.array(platformInsightSchema),
});
export type PlatformInsight = z.infer<typeof platformInsightSchema>;

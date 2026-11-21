// CONTRACT FILE. Shapes of the JSON files in packages/data/src. zod schemas in schemas.ts must match these.
import type { DisputeType, ChecklistItem, TimerSpec } from "@raasta/rules/types";

export type CategoryId = "money_shopping" | "work" | "home" | "civic" | "police" | "cyber" | "govt" | "legal_aid";

export interface GuidedQuestion {
  id: string; // becomes a slot or template variable
  label_en: string;
  type: "number" | "date" | "boolean" | "text" | "select";
  options?: { value: string; label_en: string }[];
  slot?: keyof import("@raasta/rules/types").IntakeSlots; // when the answer maps to a slot
}

export interface Dispute {
  id: DisputeType;
  category: CategoryId;
  icon: string; // lucide icon name
  title_en: string;
  short_en: string; // one plain sentence
  depth: "full" | "standard"; // full = handbook 6.1 MVP disputes
  questions: GuidedQuestion[]; // max 6
  documents: ChecklistItem[];
  template_variables: string[];
  default_platform_ids: string[]; // from platforms.json
  doc_templates: string[]; // docs-gen template ids
}

export interface Office {
  id: string; // e.g. "pmc_ward_kothrud_bavdhan", "dlsa_pune"
  type: "ward_office" | "zone_dmc" | "consumer_commission" | "labour_office" | "legal_aid" | "police" | "court" | "regulator" | "municipal_hq" | "other";
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  lat?: number;
  lng?: number;
  hours?: string;
  city: string;
  state_code: string;
  zone?: string; // PMC zone number for wards
  cc_office_id?: string; // ward -> zone DMC
  verified: boolean;
  source: string; // e.g. "handbook 3.2"
}

export interface LegalAidState {
  state_code: string;
  name: string;
  income_ceiling_inr: number | null; // null when the handbook has no figure
  ceiling_note?: string;
}

export interface LegalAidData {
  section12_flags: { flag: import("@raasta/rules/types").NalsaFlag; label_en: string }[];
  states: LegalAidState[]; // all 37 entries in handbook 4.2
  tele_law_note_en: string;
  helpline: "15100";
}

export interface StateInfo {
  code: string;
  name: string;
  languages: string[]; // locale codes
  coverage: "deep" | "standard";
  grievance_portal?: { name: string; url: string; verified: boolean };
  slsa?: { name: string; url: string; phone?: string; email?: string; verified: boolean };
  legal_aid_ceiling_inr: number | null;
}

export type TimerDef = TimerSpec & { dispute_types: DisputeType[] };

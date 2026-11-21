import type { DisputeType, GeoContext, IntakeSlots, Step } from "../types";

export interface Ctx {
  slots: IntakeSlots;
  geo: GeoContext;
  /** Resolved state code (geo wins, then slots; PMC/PCMC imply MH). */
  state?: string;
  isMH: boolean;
  /** True inside Pune Metropolitan Region municipal limits (PMC or PCMC) or when the city says Pune. */
  isPune: boolean;
  ulb: "PMC" | "PCMC" | "other" | "none";
}

/** Declarative description of how one ForumOption submission mode is derived from the registry. */
export type SubSpec =
  | { k: "wa"; pid: string }
  | { k: "wa_raw"; template: string }
  | { k: "email"; pid: string; to: string | "ward"; subjectKey: string }
  | { k: "phone"; pid: string; prefix: string }
  | { k: "phone_raw"; number: string }
  | { k: "autofill"; pid: string }
  | { k: "in_person"; office: string }
  | { k: "post"; office: string }
  | { k: "digit" };

export interface ForumSpec {
  /** platforms.json id, or "state:<CODE>" for a state grievance portal from states.json. */
  pid: string;
  why: string;
  /** key inside platform.fees (default "online", or amount-based slab for e-Jagriti) */
  fee?: string;
  /** key inside platform.sla_and_timelines */
  sla?: string;
  sub: SubSpec[];
  /** i18n key explaining why this option cannot be used yet. A blocked option only offers the guide. */
  blocked?: string;
  /** Preferred key inside platform.urls for sources[] */
  url_key?: string;
  /** Explicit registry URL (used for per-metro portals). */
  url?: string;
  /** Registry-sourced fee/sla text overrides (per-metro portals). */
  fee_text?: string;
}

export interface RowOut {
  step: Step;
  primary: ForumSpec;
  alternatives: ForumSpec[];
  offices?: string[];
  warnings?: string[];
  urgency?: "emergency" | "time_sensitive" | "normal";
}

export interface Row {
  id: string;
  when?: (c: Ctx) => boolean;
  out: (c: Ctx) => RowOut;
}

export interface DisputeTable {
  dispute: DisputeType;
  /** Ordered. The first row whose `when` passes (or has no `when`) wins. */
  rows: Row[];
  /** Sensitive flow: warn.privacy_mode is attached and the UI must keep data in memory only. */
  privacy?: boolean;
}

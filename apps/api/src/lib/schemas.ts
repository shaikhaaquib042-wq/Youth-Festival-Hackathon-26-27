import { z } from "zod";
import { DISPUTE_TYPES } from "@raasta/rules/types";
import { NALSA_FLAGS } from "@raasta/data/schemas";
import { LOCALES } from "@raasta/config";

export const disputeTypeSchema = z.enum(DISPUTE_TYPES as [string, ...string[]]);

const nalsa = z.enum(NALSA_FLAGS);

/** Mirrors IntakeSlots in packages/rules/src/types.ts. Unknown keys are dropped. */
export const intakeSlotsSchema = z
  .object({
    dispute_type: disputeTypeSchema,
    summary: z.string().max(280).default(""),
    state_code: z.string().length(2).toUpperCase().optional(),
    district: z.string().max(80).optional(),
    city: z.string().max(80).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    amount_inr: z.number().nonnegative().max(1e12).optional(),
    days_since_incident: z.number().int().nonnegative().max(36500).optional(),
    prior_written_complaint_sent: z.boolean().optional(),
    prior_complaint_days_ago: z.number().int().nonnegative().max(36500).optional(),
    opposite_party_type: z
      .enum(["company", "shop", "landlord", "employer", "neighbour", "government", "bank", "unknown"])
      .optional(),
    employer_sphere: z.enum(["central", "state", "unknown"]).optional(),
    is_emergency: z.boolean().optional(),
    cheating_indicated: z.boolean().optional(),
    nalsa_status_flags: z.array(nalsa).max(8).optional(),
    annual_income_inr: z.number().nonnegative().max(1e12).optional(),
    exclusion_flags: z.array(z.enum(["rti", "sub_judice", "personal_family"])).max(3).optional(),
    missing_fields: z.array(z.string().max(60)).max(3).default([]),
  })
  .strip();

export const localeSchema = z.enum(LOCALES);

export const intakeBodySchema = z.object({
  text: z.string().min(2).max(2000),
  lang: localeSchema.optional(),
  state_code: z.string().length(2).optional(),
  city: z.string().max(80).optional(),
});

export const geoContextSchema = z.object({
  state_code: z.string().optional(),
  city: z.string().optional(),
  ulb: z.string().optional(),
  pmc_ward_id: z.string().optional(),
  digit_tenant_id: z.string().optional(),
  coverage: z.enum(["deep", "standard", "unknown"]),
});

export const routeBodySchema = z.object({
  slots: intakeSlotsSchema,
  geo: geoContextSchema.optional(),
  ward_id: z.string().max(80).optional(),
});

export const chatBodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) })).min(1).max(24),
  token: z.string().max(2000).optional(),
  lang: localeSchema.optional(),
});

export const translateBodySchema = z.object({
  text: z.string().min(1).max(3000),
  lang: localeSchema,
  source: localeSchema.optional(),
});

export const digitSubmitSchema = z.object({
  service_code: z.string().min(1).max(80).regex(/^[A-Za-z0-9_.-]+$/),
  description: z.string().min(5).max(1000),
  tenant_id: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  locality_code: z.string().max(40).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  category: z.string().max(40).optional(),
  message: z.string().min(1).max(1000),
  page: z.string().max(200).optional(),
  lang: z.string().max(8).optional(),
  "cf-turnstile-response": z.string().max(4096).optional(),
});

export const systemRequestSchema = z.object({
  state: z.string().max(60).optional(),
  city: z.string().min(1).max(80),
  dispute_desc: z.string().min(1).max(800),
  portal_url: z.string().max(300).optional(),
  contact_optional: z.string().max(120).optional(),
  "cf-turnstile-response": z.string().max(4096).optional(),
});

import type { DisputeType } from "@raasta/rules/types";

export type CategoryId = "money" | "work" | "home" | "civic" | "police" | "cyber" | "govt" | "legal";

export interface Category {
  id: CategoryId;
  disputes: DisputeType[];
}

/** Presentation grouping only. Dispute ids come from the rules contract. */
export const CATEGORIES: Category[] = [
  { id: "money", disputes: ["consumer_refund", "mrp_overcharge", "banking_nbfc", "insurance_claim", "investment_broker", "builder_delay"] },
  { id: "work", disputes: ["unpaid_wages", "pension_pf", "workplace_harassment"] },
  { id: "home", disputes: ["security_deposit", "neighbour_construction"] },
  { id: "civic", disputes: ["civic_failure"] },
  { id: "police", disputes: ["police_complaint", "lost_mobile"] },
  { id: "cyber", disputes: ["cyber_fraud", "cyber_harassment"] },
  { id: "govt", disputes: ["govt_service"] },
  { id: "legal", disputes: ["free_legal_aid", "other"] },
];

export const CATEGORY_IDS: string[] = CATEGORIES.map((c) => c.id);

export function findCategory(id: string | undefined): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export interface Tile {
  key: string;
  dispute: DisputeType;
}

export const COMPLAINT_TILES: Tile[] = [
  { key: "pothole", dispute: "civic_failure" },
  { key: "garbage", dispute: "civic_failure" },
  { key: "police", dispute: "police_complaint" },
  { key: "cyber", dispute: "cyber_fraud" },
  { key: "refund", dispute: "consumer_refund" },
  { key: "salary", dispute: "unpaid_wages" },
  { key: "deposit", dispute: "security_deposit" },
  { key: "legalaid", dispute: "free_legal_aid" },
];

export const EXAMPLE_KEYS = ["ui.example.1", "ui.example.2", "ui.example.3"];

/** Static routes prerendered once per locale (excluding the :category and :code families). */
export const STATIC_PATHS = [
  "/",
  "/help",
  "/offices",
  "/legal-aid",
  "/emergency",
  "/feedback",
  "/about",
  "/about/data",
  "/privacy",
  "/terms",
  "/disclaimer",
];

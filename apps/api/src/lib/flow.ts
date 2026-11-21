import { redact } from "@raasta/rules";
import type { Dispute } from "@raasta/data";
import type { IntakeSlots } from "@raasta/rules/types";
import { intakeSlotsSchema } from "./schemas";

type Q = Dispute["questions"][number];

// Select questions without a direct slot that still feed a slot (disputes.json has no slot field for them).
const ARRAY_SLOT_BY_QUESTION: Record<string, "nalsa_status_flags" | "exclusion_flags"> = {
  status_flag: "nalsa_status_flags",
  exclusion: "exclusion_flags",
};

export const answerField = (id: string) => `a_${id}`;

/** Facts already known before the flow starts (saved place or the network location). */
export type Known = { city?: string };

/** Only questions whose answer changes the route are asked; the rest are asked later, in the letter form, if needed. */
export function routesOn(q: Q): boolean {
  return !!q.slot || q.type === "date" || q.id in ARRAY_SLOT_BY_QUESTION;
}

/**
 * Whether question i (0-based) applies given earlier answers.
 * Explicit `show_if: { q, equals }` wins; otherwise an "If yes, ..." question depends on the yes/no question right before it.
 */
export function isApplicable(dispute: Dispute, i: number, answers: Record<string, string>, known: Known = {}): boolean {
  const q = dispute.questions[i] as Q & { show_if?: { q: string; equals: string } };
  if (!q) return false;
  if (!routesOn(q)) return false;
  if (q.slot === "city" && known.city) return false;
  if (q.show_if) return (answers[q.show_if.q] ?? "").trim().toLowerCase() === q.show_if.equals.toLowerCase();
  const prev = dispute.questions[i - 1];
  if (/^if yes\b/i.test(q.label_en) && prev?.type === "boolean") return toBool(answers[prev.id] ?? "") === true;
  return true;
}

/** Next applicable question index after i (0-based), or -1 when the flow is done. */
export function nextApplicable(dispute: Dispute, i: number, answers: Record<string, string>, known: Known = {}): number {
  for (let j = i + 1; j < dispute.questions.length; j++) if (isApplicable(dispute, j, answers, known)) return j;
  return -1;
}

/** Previous applicable question index before i (0-based), or 0. */
export function prevApplicable(dispute: Dispute, i: number, answers: Record<string, string>, known: Known = {}): number {
  for (let j = i - 1; j >= 0; j--) if (isApplicable(dispute, j, answers, known)) return j;
  return firstApplicable(dispute, answers, known);
}

/** First question worth asking (0-based), or -1 when nothing needs asking. */
export function firstApplicable(dispute: Dispute, answers: Record<string, string>, known: Known = {}): number {
  return nextApplicable(dispute, -1, answers, known);
}

/** Position and total of the questions that will be asked, for the progress dots. */
export function flowProgress(dispute: Dispute, i: number, answers: Record<string, string>, known: Known = {}): { n: number; total: number; last: boolean } {
  const plan = dispute.questions.map((_, j) => j).filter((j) => j === i || isApplicable(dispute, j, answers, known));
  return { n: plan.indexOf(i) + 1, total: plan.length, last: nextApplicable(dispute, i, answers, known) < 0 };
}

function daysSince(dateStr: string, now: number): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return undefined;
  const t = Date.parse(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(t) || t > now) return undefined;
  return Math.floor((now - t) / 86_400_000);
}

function toBool(v: string): boolean | undefined {
  const s = v.trim().toLowerCase();
  if (["yes", "true", "on", "1"].includes(s)) return true;
  if (["no", "false", "0"].includes(s)) return false;
  return undefined; // blank or "unsure"
}

/** Applies guided or follow-up answers (keyed by question id) onto slots. Unknown or invalid answers are ignored. */
export function applyAnswers(base: IntakeSlots, dispute: Dispute, answers: Record<string, string>, now = Date.now()): IntakeSlots {
  const out: Record<string, unknown> = { ...base };
  for (const [i, q] of dispute.questions.entries()) {
    const raw = (answers[q.id] ?? "").trim();
    if (!raw || !isApplicable(dispute, i, answers)) continue;
    assign(out, q, raw, now);
  }
  out.missing_fields = [];
  const parsed = intakeSlotsSchema.safeParse(out);
  return (parsed.success ? parsed.data : { ...base, missing_fields: [] }) as IntakeSlots;
}

function assign(out: Record<string, unknown>, q: Q, raw: string, now: number): void {
  const slot = q.slot as string | undefined;
  switch (q.type) {
    case "number": {
      const n = Number(raw.replace(/,/g, ""));
      if (slot && Number.isFinite(n) && n >= 0) out[slot] = slot.endsWith("_days_ago") || slot === "days_since_incident" ? Math.round(n) : n;
      return;
    }
    case "boolean": {
      const b = toBool(raw);
      if (slot && b !== undefined) out[slot] = b;
      return;
    }
    case "date": {
      const d = daysSince(raw, now);
      if (d !== undefined && !slot && out.days_since_incident === undefined) out.days_since_incident = d;
      return;
    }
    case "select": {
      if (!q.options?.some((o) => o.value === raw)) return;
      const arr = ARRAY_SLOT_BY_QUESTION[q.id];
      if (arr) {
        if (raw !== "none") out[arr] = [raw];
        return;
      }
      if (slot) out[slot] = raw;
      return;
    }
    case "text": {
      if (!slot) return;
      const clean = redact(raw).slice(0, slot === "summary" ? 280 : 80);
      if (slot === "summary") out.summary = out.summary ? `${String(out.summary)} ${clean}`.slice(0, 280) : clean;
      else out[slot] = clean;
      return;
    }
  }
}

export function emptySlots(dispute: Dispute["id"]): IntakeSlots {
  return { dispute_type: dispute, summary: "", missing_fields: [] };
}

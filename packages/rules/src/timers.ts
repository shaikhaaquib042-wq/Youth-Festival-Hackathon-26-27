import type { TimerSpec } from "./types";

export interface LiveTimer {
  key: string;
  label_key: string; // i18n: timer.<key>
  label_en: string;
  note_en?: string;
  /** ISO date (YYYY-MM-DD, UTC) or null when the start date is unknown. */
  due_date: string | null;
  /** Whole days from today (UTC) to the due date. Negative once overdue. null when the start date is unknown. */
  days_remaining: number | null;
  status: "running" | "due_today" | "overdue" | "needs_date";
}

export interface TimerInputs {
  incidentDate?: Date | string;
  priorComplaintDate?: Date | string;
  now: Date | string | number;
}

const DAY = 86_400_000;

function dayStart(v: Date | string | number): number {
  const d = new Date(v);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function liveTimers(specs: TimerSpec[], inputs: TimerInputs): LiveTimer[] {
  const today = dayStart(inputs.now);
  return specs.map((s) => {
    const startRaw = s.from === "now" ? inputs.now : s.from === "incident" ? inputs.incidentDate : inputs.priorComplaintDate;
    const base = { key: s.key, label_key: `timer.${s.key}`, label_en: s.label_en, ...(s.note_en ? { note_en: s.note_en } : {}) };
    if (startRaw === undefined || Number.isNaN(new Date(startRaw).getTime())) {
      return { ...base, due_date: null, days_remaining: null, status: "needs_date" as const };
    }
    const due = dayStart(startRaw) + s.days * DAY;
    const remaining = Math.round((due - today) / DAY);
    return {
      ...base,
      due_date: new Date(due).toISOString().slice(0, 10),
      days_remaining: remaining,
      status: remaining < 0 ? ("overdue" as const) : remaining === 0 ? ("due_today" as const) : ("running" as const),
    };
  });
}

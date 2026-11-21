import type { Ctx, ForumSpec, SubSpec } from "./types";
import { stateByCode } from "@raasta/data";

export const wa = (pid: string): SubSpec => ({ k: "wa", pid });
export const phone = (pid: string, prefix: string): SubSpec => ({ k: "phone", pid, prefix });
export const autofill = (pid: string): SubSpec => ({ k: "autofill", pid });
export const inPerson = (office: string): SubSpec => ({ k: "in_person", office });
export const email = (pid: string, to: string | "ward", subjectKey: string): SubSpec => ({ k: "email", pid, to, subjectKey });

export function nalsaForum(c: Ctx, why = "why.legal_aid_free"): ForumSpec {
  return {
    pid: "nalsa_mslsa_dlsa", why, sla: "legal_aid_application_decision_days",
    sub: [
      ...(c.isPune ? [email("nalsa_mslsa_dlsa", "dlsapune2@gmail.com", "email.subject.legal_aid"), inPerson("dlsa_pune")] : []),
      phone("nalsa_mslsa_dlsa", "15100"),
    ],
  };
}

export function teleLawForum(why = "why.tele_law_free"): ForumSpec {
  return {
    pid: "tele_law_nyaya_bandhu", why, sla: "consultation_slot_minutes",
    sub: [phone("tele_law_nyaya_bandhu", "14454"), autofill("tele_law_nyaya_bandhu")],
  };
}

export function exclusionsHit(c: Ctx): boolean {
  return (c.slots.exclusion_flags ?? []).length > 0;
}

/** CPGRAMS option. Blocked (guide only) when the user's own exclusion flags apply. Email is never offered. */
export function cpgramsForum(c: Ctx, why = "why.cpgrams_central"): ForumSpec {
  const flags = c.slots.exclusion_flags ?? [];
  return {
    pid: "cpgrams", why, sla: "standard_resolution_days",
    sub: [autofill("cpgrams"), phone("cpgrams", "011-23401464")],
    blocked: flags.length ? `warn.cpgrams_excluded_${flags[0]}` : undefined,
  };
}

/** State grievance portal for a non-Maharashtra state, if states.json has one. */
export function stateGrievanceForum(c: Ctx, why = "why.state_grievance_portal"): ForumSpec | undefined {
  if (!c.state || c.state === "MH") return undefined;
  const portal = stateByCode(c.state)?.grievance_portal;
  if (!portal) return undefined;
  return { pid: `state:${c.state}`, why, sub: [] };
}

export function aapleSarkarForum(why = "why.aaple_sarkar_state"): ForumSpec {
  return {
    pid: "aaple_sarkar_maharashtra", why, sla: "resolution_working_days",
    sub: [autofill("aaple_sarkar_maharashtra"), phone("aaple_sarkar_maharashtra", "1800-120-8040")],
  };
}

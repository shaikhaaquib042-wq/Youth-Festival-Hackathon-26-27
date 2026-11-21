import type { IntakeSlots } from "@raasta/rules/types";

const enc = encodeURIComponent;

/** A short plain-text complaint drafted from the (already redacted) slots. Never invents facts. */
export function draftText(slots: IntakeSlots, title: string): string {
  const lines = [title, "", slots.summary.trim()];
  if (slots.amount_inr !== undefined) lines.push("", `Amount involved: Rs. ${slots.amount_inr.toLocaleString("en-IN")}`);
  const place = [slots.city, slots.district].filter(Boolean).join(", ");
  if (place) lines.push(`Place: ${place}`);
  lines.push("", "Please reply with a reference number and tell me what happens next.");
  return lines.join("\n");
}

/** Fills {placeholders} in a portal or WhatsApp template. Unknown names stay visible as [name]. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_m, name: string) => enc(values[name] ?? `[${name}]`));
}

export function templateValues(slots: IntakeSlots, draft: string): Record<string, string> {
  return {
    summary: draft,
    issue: slots.summary,
    message: draft,
    complaint: draft,
    city: slots.city ?? "",
  };
}

export function safeHttps(url: string, host?: string): string | undefined {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return undefined;
    if (host && u.hostname !== host) return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

export const telHref = (n: string) => `tel:${n.replace(/[^+\d]/g, "")}`;

/** en-IN long date from an ISO YYYY-MM-DD (UTC). */
export function dateIN(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const MAP: Array<[RegExp, string]> = [
  [/amount|cost|price|paid/, "amount_inr"],
  [/summary|issue|incident_summary|description/, "summary"],
];

/** Pre-fills document template variables from slots. Only the redacted summary and amount ever flow in. */
export function prefillVars(slots: IntakeSlots | undefined, ids: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!slots) return out;
  for (const id of ids) {
    if (id === "district" && (slots.district || slots.city)) out[id] = (slots.district ?? slots.city) as string;
    else if (id === "incident_date" && slots.days_since_incident !== undefined) {
      out[id] = new Date(Date.now() - slots.days_since_incident * 86_400_000).toISOString().slice(0, 10);
    } else if (id === "annual_income" && slots.annual_income_inr !== undefined) out[id] = String(slots.annual_income_inr);
    else {
      for (const [re, slot] of MAP) {
        if (!re.test(id)) continue;
        if (slot === "amount_inr" && slots.amount_inr !== undefined && /^(deposit_amount|unpaid_amount|purchase_cost|amount|amount_paid)$/.test(id)) out[id] = String(slots.amount_inr);
        if (slot === "summary" && slots.summary && /summary$/.test(id)) out[id] = slots.summary;
        break;
      }
    }
  }
  return out;
}

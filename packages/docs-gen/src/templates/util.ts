import { DOC_FOOTER_EN } from "@raasta/config/brand";
import type { BuildCtx, DocModel, TemplateVariable, Vars } from "../model";

/** Visible blank line used wherever the user gave no value. Never an invented value. */
export const BLANK = "________";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatDate(d: Date | string | number): string {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return BLANK;
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

function clean(x: unknown): string {
  if (x === undefined || x === null) return "";
  return String(x).replace(/\s+/g, " ").trim();
}

/** First non-empty value among the keys, or "". */
export function raw(vars: Vars, ...keys: string[]): string {
  for (const k of keys) {
    const s = clean(vars[k]);
    if (s) return s;
  }
  return "";
}

/** First non-empty value among the keys, or the visible blank. */
export function v(vars: Vars, ...keys: string[]): string {
  return raw(vars, ...keys) || BLANK;
}

/** Value that may be a date: ISO dates are shown as "1 November 2026". */
export function vDate(vars: Vars, ...keys: string[]): string {
  const s = raw(vars, ...keys);
  if (!s) return BLANK;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const f = formatDate(`${s.slice(0, 10)}T00:00:00Z`);
    return f;
  }
  return s;
}

function groupIndian(n: number): string {
  const neg = n < 0;
  const [int, dec] = Math.abs(n).toString().split(".");
  let out: string;
  if (int.length <= 3) out = int;
  else {
    const last3 = int.slice(-3);
    const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    out = `${rest},${last3}`;
  }
  return (neg ? "-" : "") + out + (dec ? `.${dec}` : "");
}

/** Money value: numbers become "Rs. 12,500"; free text is kept as typed. */
export function vMoney(vars: Vars, ...keys: string[]): string {
  const s = raw(vars, ...keys);
  if (!s) return BLANK;
  const plain = s.replace(/,/g, "");
  if (/^\d+(\.\d+)?$/.test(plain)) return `Rs. ${groupIndian(Number(plain))}`;
  return s;
}

export function has(vars: Vars, ...keys: string[]): boolean {
  return raw(vars, ...keys) !== "";
}

export const NAME_KEYS = [
  "user_name", "customer_name", "consumer_name", "worker_name", "tenant_name",
  "complainant_name", "victim_name", "borrower_name", "buyer_name", "applicant_name",
  "policy_holder_name", "investor_name", "member_name", "owner_name",
];

export function vd(
  id: string, label_en: string, type: TemplateVariable["type"] = "text", required = false,
): TemplateVariable {
  return { id, label_en, type, required };
}

export const COMMON_VARS: TemplateVariable[] = [
  vd("user_address", "Your address", "textarea"),
  vd("user_phone", "Your phone number"),
  vd("user_email", "Your email"),
];

export interface FinishArgs {
  id: string;
  title: string;
  vars: Vars;
  ctx: BuildCtx;
  nameKeys?: string[];
  to: { name: string; address?: string; email?: string };
  subject: string;
  paragraphs: string[];
  enclosures?: string[];
  closing?: string;
}

export function finish(a: FinishArgs): DocModel {
  const name = v(a.vars, ...(a.nameKeys ?? NAME_KEYS));
  const from: DocModel["from"] = {
    name,
    address: v(a.vars, "user_address"),
    phone: v(a.vars, "user_phone"),
  };
  return {
    templateId: a.id,
    title: a.title,
    lang: a.ctx.lang,
    to: a.to,
    from,
    date: formatDate(a.ctx.now),
    subject: a.subject,
    paragraphs: a.paragraphs,
    enclosures: a.enclosures ?? [],
    signatureBlock: [a.closing ?? "Yours faithfully,", "", `Signature: ${BLANK}`, name],
    footer: DOC_FOOTER_EN,
  };
}

/** Recipient from the office registry if given, else typed values, else blanks. */
export function officeTo(
  vars: Vars, ctx: BuildCtx, fallbackName: string,
): { name: string; address?: string; email?: string } {
  const o = ctx.office;
  if (o) {
    return {
      name: o.name,
      address: o.address || v(vars, "recipient_address"),
      email: o.email || raw(vars, "recipient_email") || undefined,
    };
  }
  return {
    name: raw(vars, "recipient_name") || fallbackName,
    address: v(vars, "recipient_address"),
    email: raw(vars, "recipient_email") || undefined,
  };
}

/** Recipient is the opposite party typed by the user. */
export function partyTo(
  vars: Vars, nameKeys: string[], fallbackTitle: string,
): { name: string; address?: string; email?: string } {
  const n = raw(vars, ...nameKeys);
  return {
    name: n ? `${fallbackTitle}, ${n}` : `${fallbackTitle}, ${BLANK}`,
    address: v(vars, "recipient_address"),
    email: raw(vars, "recipient_email") || undefined,
  };
}

/** "Label: value" lines, only for values the user gave. */
export function lines(pairs: [string, string][]): string {
  return pairs.filter(([, val]) => val).map(([k, val]) => `- ${k}: ${val}`).join("\n");
}

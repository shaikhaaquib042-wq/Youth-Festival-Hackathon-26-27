import { hasKey, t, type Locale } from "@raasta/i18n";
import { messagesEn } from "@raasta/rules";

/** Rule-engine keys (step.*, why.*, warn.*, ...) live in the rules package until merged into en.json. */
export function msg(lang: Locale, key: string, vars?: Record<string, string | number>): string {
  if (hasKey(lang, key) || hasKey("en", key)) return t(lang, key, vars);
  const en = messagesEn[key];
  if (en === undefined) return key;
  return vars ? en.replace(/\{(\w+)\}/g, (m, n: string) => (n in vars ? String(vars[n]) : m)) : en;
}

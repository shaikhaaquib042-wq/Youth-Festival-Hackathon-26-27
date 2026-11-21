// Dictionary-free core: safe for the browser bundle. The server (index.ts) registers every locale;
// the browser registers only the active locale, read from the inert JSON the prerender embeds in the page.
import { LOCALES, type Locale } from "@raasta/config";

export type { Locale };
export { LOCALES };

export interface LangMeta {
  native: string;
  english: string;
  dir: "ltr" | "rtl";
  /** Google Fonts family used for display text in this script. */
  font: string;
  /** BCP 47 tag for html lang. */
  tag: string;
}

export const LANG_META: Record<Locale, LangMeta> = {
  en: { native: "English", english: "English", dir: "ltr", font: "Baloo 2", tag: "en" },
  hi: { native: "हिन्दी", english: "Hindi", dir: "ltr", font: "Baloo 2", tag: "hi" },
  mr: { native: "मराठी", english: "Marathi", dir: "ltr", font: "Baloo 2", tag: "mr" },
  bn: { native: "বাংলা", english: "Bengali", dir: "ltr", font: "Baloo Da 2", tag: "bn" },
  ta: { native: "தமிழ்", english: "Tamil", dir: "ltr", font: "Baloo Thambi 2", tag: "ta" },
  te: { native: "తెలుగు", english: "Telugu", dir: "ltr", font: "Baloo Tammudu 2", tag: "te" },
  kn: { native: "ಕನ್ನಡ", english: "Kannada", dir: "ltr", font: "Baloo Tamma 2", tag: "kn" },
  ml: { native: "മലയാളം", english: "Malayalam", dir: "ltr", font: "Baloo Chettan 2", tag: "ml" },
  gu: { native: "ગુજરાતી", english: "Gujarati", dir: "ltr", font: "Baloo Bhai 2", tag: "gu" },
  pa: { native: "ਪੰਜਾਬੀ", english: "Punjabi", dir: "ltr", font: "Baloo Paaji 2", tag: "pa" },
  or: { native: "ଓଡ଼ିଆ", english: "Odia", dir: "ltr", font: "Baloo Bhaina 2", tag: "or" },
  ur: { native: "اردو", english: "Urdu", dir: "rtl", font: "Noto Nastaliq Urdu", tag: "ur" },
};

type Dict = Record<string, string>;

const DICTS: Partial<Record<Locale, Dict>> = {};

export function registerDict(lang: Locale, dict: Dict): void {
  DICTS[lang] = { ...(DICTS[lang] ?? {}), ...dict };
}

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** Translate a flat key. Falls back to English, then to the key itself. {name} placeholders are replaced from vars. */
export function t(lang: Locale, key: string, vars?: Record<string, string | number>): string {
  const raw = DICTS[lang]?.[key] ?? DICTS.en?.[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

export function hasKey(lang: Locale, key: string): boolean {
  return key in (DICTS[lang] ?? {});
}

export { DICTS };

import { useCallback } from "react";
import { t, type Locale } from "@raasta/i18n";
import pagesEn from "../messages.pages.en.json";
import { useLang } from "./lang";

/** English strings for the static content pages. Keys are flat ui.* keys. Other locales fall back to English here. */
const PAGE_EN: Record<string, string> = pagesEn;

export type Vars = Record<string, string | number>;

export function pagesT(lang: Locale, key: string, vars?: Vars): string {
  const raw = PAGE_EN[key] ?? t(lang, key);
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

export function usePageT() {
  const lang = useLang();
  return useCallback((key: string, vars?: Vars) => pagesT(lang, key, vars), [lang]);
}

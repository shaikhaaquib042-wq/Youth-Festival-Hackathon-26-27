import { useCallback } from "react";
import { t, type Locale } from "@raasta/i18n";
import { useLang } from "./lang";

// Page strings live in packages/i18n/locales/*.json like every other key.
export type Vars = Record<string, string | number>;

export function pagesT(lang: Locale, key: string, vars?: Vars): string {
  return t(lang, key, vars);
}

export function usePageT() {
  const lang = useLang();
  return useCallback((key: string, vars?: Vars) => pagesT(lang, key, vars), [lang]);
}

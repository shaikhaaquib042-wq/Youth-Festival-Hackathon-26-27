import { createContext, useCallback, useContext } from "react";
import { t, type Locale } from "@raasta/i18n";

const LangCtx = createContext<Locale>("en");
export const LangProvider = LangCtx.Provider;

export function useLang(): Locale {
  return useContext(LangCtx);
}

export function useT() {
  const lang = useLang();
  return useCallback((key: string, vars?: Record<string, string | number>) => t(lang, key, vars), [lang]);
}

/** Router basename for a locale: English lives at the root. */
export function basenameFor(lang: Locale): string {
  return lang === "en" ? "/" : `/${lang}`;
}

/** Plain anchor href for a static page in a locale (used where a full page load is intended). */
export function localePath(lang: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (lang === "en") return clean;
  return clean === "/" ? `/${lang}/` : `/${lang}${clean}`;
}

/** URL for a Worker rendered page under /r. Carries the language as a query value. */
export function rUrl(lang: Locale, path: string, params?: Record<string, string>): string {
  const q = new URLSearchParams(params);
  if (lang !== "en") q.set("lang", lang);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import type { Locale } from "@raasta/i18n";
import { states } from "./lib/site-data";
import { App } from "./App";
import { LangProvider, basenameFor } from "./lib/lang";
import { preloadLazyPages } from "./lib/lazy-page";

export { metaFor } from "./lib/meta";
export { CATEGORY_IDS, STATIC_PATHS } from "./lib/content";

/** Renders the app for a path (without locale prefix) in a locale. */
export function render(path: string, lang: Locale): string {
  const location = lang === "en" ? path : `/${lang}${path === "/" ? "/" : path}`;
  return renderToString(
    <LangProvider value={lang}>
      <StaticRouter location={location} basename={basenameFor(lang)}>
        <App />
      </StaticRouter>
    </LangProvider>,
  );
}

export { LOCALES, SITE_URL, APP_NAME } from "@raasta/config";
export { LANG_META } from "@raasta/i18n";
/** Extra prerender paths: one state page per entry in packages/data states (36). */
export const extraPaths: string[] = states.map((s) => `/state/${s.code.toLowerCase()}`);

/**
 * Resolves every lazily loaded page before prerendering. React.lazy only settles after a render has
 * touched it, so render each lazy route once, wait for the loaders, then render again in the caller.
 */
export async function prepare(): Promise<void> {
  const lazyPaths = ["/offices", "/legal-aid", "/feedback", "/about", "/about/data", "/privacy", "/terms", "/disclaimer", ...extraPaths];
  for (let pass = 0; pass < 2; pass++) {
    await preloadLazyPages();
    for (const p of lazyPaths) render(p, "en");
    await new Promise((r) => setTimeout(r, 0));
  }
}

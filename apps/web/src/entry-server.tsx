import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import type { Locale } from "@raasta/i18n";
import { App } from "./App";
import { LangProvider, basenameFor } from "./lib/lang";

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
/** Extra prerender paths (for example one per state) once packages/data is available. */
export const extraPaths: string[] = [];

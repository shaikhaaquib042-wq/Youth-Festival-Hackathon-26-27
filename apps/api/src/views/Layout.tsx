import type { Child } from "hono/jsx";
import { APP_NAME, DISCLAIMER_EN, LOCALES } from "@raasta/config";
import { LANG_META, t, type Locale } from "@raasta/i18n";

const DEFAULT_FONT_LOCALES = new Set<string>(["en", "hi", "mr"]);

export function fontHref(lang: Locale): string {
  const fams: string[] = [];
  if (DEFAULT_FONT_LOCALES.has(lang)) fams.push("family=Baloo+2:wght@500;600;700;800");
  else fams.push(`family=${LANG_META[lang].font.replace(/ /g, "+")}:wght@400;500;600;700;800`);
  fams.push("family=Nunito:wght@400;600;700;800");
  return `https://fonts.googleapis.com/css2?${fams.join("&")}&display=swap`;
}

export interface LayoutProps {
  lang: Locale;
  title: string;
  description?: string;
  /** Path (without query) the language links point to. Defaults to the current GET page. */
  path: string;
  /** Extra query string kept on language links, without lang. */
  query?: string;
  noindex?: boolean;
  saveData?: boolean;
  children?: Child;
}

function LangLinks({ lang, path, query }: { lang: Locale; path: string; query?: string }) {
  return (
    <details>
      <summary className="chip" aria-label={t(lang, "ui.lang.label")}>
        <span>{LANG_META[lang].native}</span>
      </summary>
      <ul className="stack" role="list">
        {LOCALES.map((l) => (
          <li key={l}>
            <a
              href={`${path}?${query ? `${query}&` : ""}lang=${l}`}
              lang={LANG_META[l].tag}
              hreflang={LANG_META[l].tag}
              aria-current={l === lang ? "true" : undefined}
            >
              {LANG_META[l].native}
              {l !== "en" ? ` ${LANG_META[l].english}` : ""}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function Layout({ lang, title, description, path, query, noindex, saveData, children }: LayoutProps) {
  const meta = LANG_META[lang];
  return (
    <html lang={meta.tag} dir={meta.dir}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <title>{title}</title>
        {description ? <meta name="description" content={description} /> : null}
        {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}
        {saveData ? null : (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
            <link rel="stylesheet" href={fontHref(lang)} />
          </>
        )}
        <link rel="stylesheet" href="/styles/raasta.css" />
      </head>
      <body>
        <a className="skip-link" href="#main">
          {t(lang, "ui.skip")}
        </a>
        <header className="site-header">
          <div className="container cluster">
            <a href="/" aria-label={`${APP_NAME}, ${t(lang, "ui.nav.home")}`}>
              <strong>{APP_NAME}</strong>
            </a>
            <nav className="cluster" aria-label={t(lang, "ui.nav.main")}>
              <a href="/help">{t(lang, "ui.nav.help")}</a>
              <a href="/offices">{t(lang, "ui.nav.offices")}</a>
              <a href="/legal-aid">{t(lang, "ui.nav.legal_aid")}</a>
            </nav>
            <LangLinks lang={lang} path={path} query={query} />
            <a className="btn btn-secondary" href="/emergency">
              {t(lang, "ui.emergency")}
            </a>
          </div>
        </header>
        <main id="main" tabindex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <div className="container stack">
            <p>{lang === "en" ? DISCLAIMER_EN : t(lang, "ui.disclaimer")}</p>
            <nav className="cluster" aria-label={t(lang, "ui.footer.nav")}>
              <a href="/terms">{t(lang, "ui.footer.terms")}</a>
              <a href="/privacy">{t(lang, "ui.footer.privacy")}</a>
              <a href="/disclaimer">{t(lang, "ui.footer.disclaimer")}</a>
              <a href="/about">{t(lang, "ui.footer.about")}</a>
              <a href="/about/data">{t(lang, "ui.footer.data")}</a>
              <a href="/feedback">{t(lang, "ui.nav.feedback")}</a>
            </nav>
            <p>
              {t(lang, "ui.footer.attr_osm_pre")}{" "}
              <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">
                OpenStreetMap
              </a>{" "}
              {t(lang, "ui.footer.attr_osm_post")} {t(lang, "ui.footer.attr_dm_pre")}{" "}
              <a href="https://datameet.org" rel="noopener noreferrer">
                DataMeet
              </a>
              .
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

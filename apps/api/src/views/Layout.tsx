import type { Child } from "hono/jsx";
import { APP_NAME, DISCLAIMER_EN, LOCALES, ASSET_V, LOGO_ARCH_WIDTH, LOGO_COLORS, LOGO_PATHS, LOGO_VIEWBOX } from "@raasta/config";
import { LANG_META, t, type Locale } from "@raasta/i18n";
import { states } from "@raasta/data";

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

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d={d} />
  </svg>
);
const PIN = "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z";
const GLOBE = "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M2 12h20 M12 2a15 15 0 0 1 0 20 M12 2a15 15 0 0 0 0 20";
const PHONE = "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z";
const CROSS = "M12 2v4 M12 18v4 M2 12h4 M18 12h4 M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z";

function Logo() {
  return (
    <svg width="36" height="36" viewBox={LOGO_VIEWBOX} aria-hidden="true" focusable="false" class="sh-logo-mark">
      <path d={LOGO_PATHS.inner} fill={LOGO_COLORS.inner} />
      <path d={LOGO_PATHS.road} fill={LOGO_COLORS.road} />
      <circle cx={LOGO_PATHS.sun.cx} cy={LOGO_PATHS.sun.cy} r={LOGO_PATHS.sun.r} fill={LOGO_COLORS.sun} />
      <path d={LOGO_PATHS.arch} fill="none" stroke={LOGO_COLORS.arch} stroke-width={LOGO_ARCH_WIDTH} stroke-linecap="round" />
    </svg>
  );
}

function LangLinks({ lang, path, query }: { lang: Locale; path: string; query?: string }) {
  return (
    <details className="sh-pop sh-lang">
      <summary className="sh-chip">
        <Icon d={GLOBE} />
        <span className="sh-chip-label">{LANG_META[lang].native}</span>
        <span className="sr-only">, {t(lang, "ui.lang.label")}</span>
      </summary>
      <ul className="sh-pop-panel" role="list">
        {LOCALES.map((l) => (
          <li key={l}>
            <a
              href={`${path}?${query ? `${query}&` : ""}lang=${l}`}
              lang={LANG_META[l].tag}
              hreflang={LANG_META[l].tag}
              aria-current={l === lang ? "true" : undefined}
            >
              <span>{LANG_META[l].native}</span>
              {l !== "en" ? <span className="sh-muted">{LANG_META[l].english}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

function LocationPop({ lang, next }: { lang: Locale; next: string }) {
  return (
    <details className="sh-pop sh-loc">
      <summary className="sh-chip" data-loc-chip="">
        <Icon d={PIN} />
        <span className="sh-chip-label" data-loc-label="">
          {t(lang, "ui.location.set")}
        </span>
        <span className="sr-only">, {t(lang, "ui.location.label")}</span>
      </summary>
      <form className="sh-pop-panel sh-loc-form" method="post" action="/r/location">
        <button type="button" className="sh-locate" data-locate="" data-msg-busy={t(lang, "ui.location.busy")} data-msg-denied={t(lang, "ui.location.denied")} data-msg-fail={t(lang, "ui.location.fail")}>
          <Icon d={CROSS} />
          <span>{t(lang, "ui.location.use_mine")}</span>
        </button>
        <span data-locate-status="" role="status"></span>
        <span className="sh-or">{t(lang, "ui.location.or")}</span>
        <div className="field">
          <label for="w-loc-state">{t(lang, "ui.location.state")}</label>
          <select id="w-loc-state" name="state" autocomplete="address-level1">
            <option value="">{t(lang, "ui.location.pick_state")}</option>
            {states.map((st) => (
              <option value={st.code}>{st.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label for="w-loc-city">{t(lang, "ui.location.city")}</label>
          <input id="w-loc-city" name="city" type="text" autocomplete="address-level2" maxlength={60} />
        </div>
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="lang" value={lang} />
        <button type="submit" className="btn btn-primary">
          {t(lang, "ui.location.save")}
        </button>
      </form>
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
        <link rel="icon" type="image/svg+xml" href={`/favicon.svg?v=${ASSET_V}`} />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="stylesheet" href={`/styles/raasta.css?v=${ASSET_V}`} />
        <link rel="stylesheet" href={`/styles/flow.css?v=${ASSET_V}`} />
        <script src={`/js/locate.js?v=${ASSET_V}`} defer></script>
      </head>
      <body>
        <a className="skip-link" href="#main">
          {t(lang, "ui.skip")}
        </a>
        <header className="site-header">
          <div className="container sh-bar">
            <a href={lang === "en" ? "/" : `/${lang}/`} className="sh-logo" aria-label={`${APP_NAME}, ${t(lang, "ui.nav.home")}`}>
              <Logo />
              <span>{APP_NAME}</span>
            </a>
            <nav className="sh-nav" aria-label={t(lang, "ui.nav.main")}>
              <a href="/help">{t(lang, "ui.nav.help")}</a>
              <a href="/offices">{t(lang, "ui.nav.offices")}</a>
              <a href="/legal-aid">{t(lang, "ui.nav.legal_aid")}</a>
              <a href="/about">{t(lang, "ui.nav.about")}</a>
            </nav>
            <div className="sh-tools">
              <LocationPop lang={lang} next={path} />
              <LangLinks lang={lang} path={path} query={query} />
              <a className="sh-emergency" href="/emergency">
                <Icon d={PHONE} />
                <span>{t(lang, "ui.emergency")}</span>
              </a>
            </div>
          </div>
        </header>
        <main id="main" tabindex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <div className="container stack">
            <p>{lang === "en" ? DISCLAIMER_EN : t(lang, "ui.disclaimer")}</p>
            <nav className="cluster sh-footer-nav" aria-label={t(lang, "ui.footer.nav")}>
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

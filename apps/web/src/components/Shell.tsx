import { Suspense, useEffect, useRef } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { Languages, MapPin, Menu, PhoneCall } from "lucide-react";
import { APP_NAME, DISCLAIMER_EN, LOCALES } from "@raasta/config";
import { LANG_META } from "@raasta/i18n";
import { useLang, useT, localePath } from "../lib/lang";
import { metaFor } from "../lib/meta";
import { schemaFor } from "../lib/schema";
import { JsonLd } from "./JsonLd";
import { runPageTransition } from "../lib/motion";
import { Logo } from "./Logo";

const NAV = [
  { to: "/help", key: "ui.nav.help" },
  { to: "/offices", key: "ui.nav.offices" },
  { to: "/legal-aid", key: "ui.nav.legal_aid" },
  { to: "/about", key: "ui.nav.about" },
];

function LangSwitcher() {
  const lang = useLang();
  const tt = useT();
  const { pathname } = useLocation();
  return (
    <details className="sh-pop sh-lang">
      <summary className="chip" aria-label={tt("ui.lang.label")}>
        <Languages size={18} aria-hidden="true" />
        <span>{LANG_META[lang].native}</span>
      </summary>
      <ul className="sh-pop-panel card" role="list">
        {LOCALES.map((l) => (
          <li key={l}>
            <a href={localePath(l, pathname)} lang={LANG_META[l].tag} hrefLang={LANG_META[l].tag} aria-current={l === lang ? "true" : undefined}>
              <span>{LANG_META[l].native}</span>
              {l !== "en" ? <span className="sh-muted"> {LANG_META[l].english}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

function LocationChip() {
  const lang = useLang();
  const tt = useT();
  const { pathname } = useLocation();
  return (
    <details className="sh-pop sh-loc">
      <summary className="chip" aria-label={tt("ui.location.label")}>
        <MapPin size={18} aria-hidden="true" />
        <span>{tt("ui.location.set")}</span>
      </summary>
      <form className="sh-pop-panel card stack" method="post" action="/r/location">
        <p className="sh-muted">{tt("ui.location.help")}</p>
        <label className="field">
          <span>{tt("ui.location.state")}</span>
          <input name="state" type="text" autoComplete="address-level1" maxLength={60} />
        </label>
        <label className="field">
          <span>{tt("ui.location.city")}</span>
          <input name="city" type="text" autoComplete="address-level2" maxLength={60} />
        </label>
        <input type="hidden" name="next" value={localePath(lang, pathname)} />
        <input type="hidden" name="lang" value={lang} />
        <button type="submit" className="btn btn-primary">
          {tt("ui.location.save")}
        </button>
      </form>
    </details>
  );
}

function SiteHeader() {
  const tt = useT();
  return (
    <header className="site-header">
      <div className="container sh-bar">
        <Link to="/" className="sh-logo" aria-label={`${APP_NAME}, ${tt("ui.nav.home")}`}>
          <Logo />
          <span>{APP_NAME}</span>
        </Link>
        <nav className="sh-nav" aria-label={tt("ui.nav.main")}>
          {NAV.map((n) => (
            <Link key={n.to} to={n.to}>
              {tt(n.key)}
            </Link>
          ))}
        </nav>
        <div className="sh-tools">
          <LocationChip />
          <LangSwitcher />
          <Link to="/emergency" className="btn btn-secondary sh-emergency">
            <PhoneCall size={18} aria-hidden="true" />
            <span>{tt("ui.emergency")}</span>
          </Link>
          <details className="sh-pop sh-menu">
            <summary className="chip" aria-label={tt("ui.nav.menu")}>
              <Menu size={18} aria-hidden="true" />
              <span>{tt("ui.nav.menu")}</span>
            </summary>
            <ul className="sh-pop-panel card" role="list">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link to={n.to}>{tt(n.key)}</Link>
                </li>
              ))}
              <li>
                <Link to="/feedback">{tt("ui.nav.feedback")}</Link>
              </li>
            </ul>
          </details>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  const lang = useLang();
  const tt = useT();
  return (
    <footer className="site-footer">
      <div className="container stack">
        <p className="sh-disclaimer">{lang === "en" ? DISCLAIMER_EN : tt("ui.disclaimer")}</p>
        <nav aria-label={tt("ui.footer.nav")} className="cluster sh-footer-nav">
          <Link to="/terms">{tt("ui.footer.terms")}</Link>
          <Link to="/privacy">{tt("ui.footer.privacy")}</Link>
          <Link to="/disclaimer">{tt("ui.footer.disclaimer")}</Link>
          <Link to="/about">{tt("ui.footer.about")}</Link>
          <Link to="/about/data">{tt("ui.footer.data")}</Link>
          <Link to="/feedback">{tt("ui.nav.feedback")}</Link>
        </nav>
        <p className="sh-muted sh-attrib">
          {tt("ui.footer.attr_osm_pre")}{" "}
          <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">
            OpenStreetMap
          </a>{" "}
          {tt("ui.footer.attr_osm_post")} {tt("ui.footer.attr_dm_pre")}{" "}
          <a href="https://datameet.org" rel="noopener noreferrer">
            DataMeet
          </a>
          .
        </p>
      </div>
    </footer>
  );
}

/** Updates title and description on client navigation (prerender already wrote them for first paint). */
function useDocumentMeta() {
  const lang = useLang();
  const { pathname } = useLocation();
  useEffect(() => {
    const m = metaFor(lang, pathname);
    document.title = m.title;
    const el = document.querySelector('meta[name="description"]');
    if (el) el.setAttribute("content", m.description);
  }, [lang, pathname]);
}

export function Shell() {
  const tt = useT();
  const lang = useLang();
  const { pathname } = useLocation();
  const first = useRef(true);
  const mainRef = useRef<HTMLElement>(null);
  const sweepRef = useRef<SVGPathElement>(null);
  useDocumentMeta();

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    void runPageTransition(mainRef.current, sweepRef.current);
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main">
        {tt("ui.skip")}
      </a>
      <SiteHeader />
      <svg className="path-sweep" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path ref={sweepRef} d="M0 8 C 18 0, 34 12, 52 5 S 86 2, 100 6" pathLength="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <main id="main" ref={mainRef} tabIndex={-1}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      {schemaFor(lang, pathname).map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <SiteFooter />
    </>
  );
}


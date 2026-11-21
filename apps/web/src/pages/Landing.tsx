import { useCallback, useEffect, useRef } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronRight, Compass, Lock, Send } from "lucide-react";
import { useLang, useT, rUrl } from "../lib/lang";
import { CATEGORIES, COMPLAINT_TILES, EXAMPLE_KEYS } from "../lib/content";
import { applyDoor, matchDoor } from "../lib/doors";
import { CATEGORY_ICON, TILE_ICON } from "../components/icons";
import { StreetOfDoors } from "../components/StreetOfDoors";
import { DoorIllo, PeaceIllo, SendIllo, TellIllo } from "../components/Illustrations";
import "../styles/landing.css";

const TILE_TONES = ["tone-saffron", "tone-leaf", "tone-sky", "tone-rose"];

function CategoryList({ idPrefix }: { idPrefix: string }) {
  const tt = useT();
  return (
    <ul className="lp-cats" role="list" id={idPrefix}>
      {CATEGORIES.map((c, i) => {
        const Icon = CATEGORY_ICON[c.id];
        return (
          <li key={c.id}>
            <Link to={`/help/${c.id}`} className="lp-cat">
              <span className={`lp-cat-icon ${TILE_TONES[i % TILE_TONES.length]}`}>
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="lp-cat-label">{tt(`category.${c.id}`)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Landing() {
  const lang = useLang();
  const tt = useT();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number | undefined>(undefined);

  const sync = useCallback((value: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      applyDoor(document.querySelector("[data-street]"), matchDoor(value));
    }, 220);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const fill = (text: string) => {
    const el = textRef.current;
    if (!el) return;
    el.value = text;
    el.focus();
    sync(text);
  };

  return (
    <>
      <div className="lp-hero">
        <span className="blob blob-a" aria-hidden="true" />
        <span className="blob blob-b" aria-hidden="true" />
        <span className="blob blob-c" aria-hidden="true" />

        <div className="container lp">
          <aside className="lp-rail" aria-label={tt("ui.rail.label")}>
            <p className="lp-rail-title">{tt("ui.rail.title")}</p>
            <CategoryList idPrefix="cats-rail" />
            <ul className="lp-rail-links" role="list">
              <li>
                <Link to="/help">
                  {tt("ui.rail.directory")} <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </li>
              <li>
                <a href="#how">{tt("ui.rail.how")}</a>
              </li>
              <li>
                <Link to="/feedback">{tt("ui.nav.feedback")}</Link>
              </li>
            </ul>
          </aside>

          <section className="lp-ask" id="ask" aria-labelledby="h1">
            <h1 id="h1">{tt("ui.home.h1")}</h1>
            <p className="lp-lead">{tt("ui.home.lead")}</p>
            <form className="ask-bubble" method="post" action="/r/ask">
              <label htmlFor="ask-text" className="sr-only">
                {tt("ui.home.prompt_label")}
              </label>
              <textarea
                id="ask-text"
                ref={textRef}
                name="text"
                className="ask-input"
                rows={4}
                maxLength={1000}
                placeholder={tt("ui.home.placeholder")}
                onChange={(e) => sync(e.currentTarget.value)}
                required
              />
              <input type="hidden" name="lang" value={lang} />
              <div className="ask-foot">
                <p className="ask-privacy">
                  <Lock size={15} aria-hidden="true" />
                  <span>{tt("ui.home.privacy")}</span>
                </p>
                <button type="submit" className="btn btn-primary ask-send">
                  <span>{tt("ui.home.send")}</span>
                  <Send size={18} aria-hidden="true" />
                </button>
              </div>
            </form>
            <ul className="ask-examples" aria-label={tt("ui.home.examples")} role="list">
              {EXAMPLE_KEYS.map((k) => {
                const text = tt(k);
                return (
                  <li key={k}>
                    <a
                      className="chip ask-chip"
                      href={rUrl(lang, "/r/ask", { text })}
                      onClick={(e) => {
                        e.preventDefault();
                        fill(text);
                      }}
                    >
                      {text}
                    </a>
                  </li>
                );
              })}
            </ul>
            <p className="lp-prefer">
              <Link to="/help" className="lp-inline-link">
                {tt("ui.home.prefer")} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </p>
          </section>

          <section className="lp-complaints" aria-labelledby="common-h">
            <h2 id="common-h">{tt("ui.home.common")}</h2>
            <ul className="lp-tiles" role="list">
              {COMPLAINT_TILES.map((tile, i) => {
                const Icon = TILE_ICON[tile.key];
                return (
                  <li key={tile.key}>
                    <a className="lp-tile" href={rUrl(lang, `/r/flow/${tile.dispute}/0`)}>
                      <span className={`lp-tile-icon ${TILE_TONES[i % TILE_TONES.length]}`}>
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <span className="lp-tile-label">{tt(`ui.tile.${tile.key}`)}</span>
                      <ChevronRight size={18} aria-hidden="true" className="lp-tile-arrow" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* <div className="lp-street">
          <StreetOfDoors />
        </div> */}
      </div>

      <div className="lp-mobilebar">
        <details className="lp-sheet">
          <summary className="btn btn-secondary">
            <Compass size={18} aria-hidden="true" />
            <span>{tt("ui.rail.title")}</span>
          </summary>
          <div className="lp-sheet-panel">
            <CategoryList idPrefix="cats-sheet" />
          </div>
        </details>
        <a href="#ask" className="btn btn-primary">
          {tt("ui.home.ask_short")}
        </a>
      </div>

      <section className="lp-how" id="how" aria-labelledby="how-h">
        <div className="container">
          <h2 id="how-h" className="reveal">{tt("ui.how.h2")}</h2>
          <div className="how-track">
            <svg className="how-line" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">
              <path d="M40 40 C220 -10, 380 70, 500 30 S800 -6, 960 36" />
            </svg>
            <ol className="how-steps" role="list">
              {[TellIllo, DoorIllo, SendIllo].map((Illo, idx) => {
                const n = idx + 1;
                return (
                  <li key={n} className="how-step reveal">
                    <div className="how-art">
                      <Illo />
                    </div>
                    <span className="how-n" aria-hidden="true">
                      {n}
                    </span>
                    <h3>{tt(`ui.how.${n}.title`)}</h3>
                    <p>{tt(`ui.how.${n}.body`)}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <section className="lp-free" aria-labelledby="free-h">
        <svg className="wave wave-in" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 40 C240 90 480 0 720 34 S1200 80 1440 30 V80 H0 Z" />
        </svg>
        <div className="container free-grid">
          <div className="free-art reveal">
            <PeaceIllo />
          </div>
          <div className="free-copy reveal">
            <h2 id="free-h">{tt("ui.free.h2")}</h2>
            <p className="free-body">{tt("ui.free.body")}</p>
            <p className="free-fact">{tt("ui.fact.daksh")}</p>
            <Link to="/legal-aid" className="btn btn-secondary">
              {tt("ui.nav.legal_aid")} <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <svg className="wave wave-out" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0 H1440 V40 C1200 0 960 80 720 46 S240 0 0 50 Z" />
        </svg>
      </section>

      <section className="lp-faq" aria-labelledby="faq-h">
        <div className="container faq-wrap">
          <h2 id="faq-h" className="reveal">
            {tt("ui.faq.h2")}
          </h2>
          <div className="faq-list">
            {[1, 2, 3, 4].map((n) => (
              <details key={n} className="faq-item reveal">
                <summary>
                  <span>{tt(`ui.faq.${n}.q`)}</span>
                  <span className="faq-plus" aria-hidden="true" />
                </summary>
                <p>{tt(`ui.faq.${n}.a`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

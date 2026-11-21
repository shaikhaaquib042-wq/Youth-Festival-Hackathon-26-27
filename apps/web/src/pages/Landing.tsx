import { useCallback, useEffect, useRef } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronRight, Compass, Send } from "lucide-react";
import { useLang, useT, rUrl } from "../lib/lang";
import { CATEGORIES, COMPLAINT_TILES, EXAMPLE_KEYS } from "../lib/content";
import { applyDoor, matchDoor } from "../lib/doors";
import { CATEGORY_ICON, TILE_ICON } from "../components/icons";
import { StreetOfDoors } from "../components/StreetOfDoors";

function CategoryList({ idPrefix }: { idPrefix: string }) {
  const tt = useT();
  return (
    <ul className="lp-cats" role="list" id={idPrefix}>
      {CATEGORIES.map((c) => {
        const Icon = CATEGORY_ICON[c.id];
        return (
          <li key={c.id}>
            <Link to={`/help/${c.id}`} className="lp-cat">
              <Icon size={20} aria-hidden="true" />
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
    <div className="container lp">
      <aside className="rail lp-rail" aria-label={tt("ui.rail.label")}>
        <p className="lp-rail-title">{tt("ui.rail.title")}</p>
        <CategoryList idPrefix="cats-rail" />
        <ul className="lp-rail-links" role="list">
          <li>
            <Link to="/help">{tt("ui.rail.directory")}</Link>
          </li>
          <li>
            <a href="#how">{tt("ui.rail.how")}</a>
          </li>
          <li>
            <Link to="/feedback">{tt("ui.nav.feedback")}</Link>
          </li>
        </ul>
      </aside>

      <div className="lp-main">
        <section className="lp-ask" id="ask" aria-labelledby="h1">
          <h1 id="h1">{tt("ui.home.h1")}</h1>
          <p className="lp-lead">{tt("ui.home.lead")}</p>
          <form className="lp-form card card-warm" method="post" action="/r/ask">
            <label htmlFor="ask-text" className="sr-only">
              {tt("ui.home.prompt_label")}
            </label>
            <textarea
              id="ask-text"
              ref={textRef}
              name="text"
              className="field lp-textarea"
              rows={4}
              maxLength={1000}
              placeholder={tt("ui.home.placeholder")}
              onChange={(e) => sync(e.currentTarget.value)}
              required
            />
            <input type="hidden" name="lang" value={lang} />
            <div className="lp-form-row">
              <p className="lp-privacy">{tt("ui.home.privacy")}</p>
              <button type="submit" className="btn btn-primary">
                <span>{tt("ui.home.send")}</span>
                <Send size={18} aria-hidden="true" />
              </button>
            </div>
          </form>
          <div className="lp-examples cluster" aria-label={tt("ui.home.examples")}>
            {EXAMPLE_KEYS.map((k) => {
              const text = tt(k);
              return (
                <a
                  key={k}
                  className="chip"
                  href={rUrl(lang, "/r/ask", { text })}
                  onClick={(e) => {
                    e.preventDefault();
                    fill(text);
                  }}
                >
                  {text}
                </a>
              );
            })}
          </div>
          <p className="lp-prefer">
            <Link to="/help" className="lp-inline-link">
              {tt("ui.home.prefer")} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </p>
        </section>

        <section className="lp-complaints" aria-labelledby="common-h">
          <h2 id="common-h">{tt("ui.home.common")}</h2>
          <ul className="lp-tiles" role="list">
            {COMPLAINT_TILES.map((tile) => {
              const Icon = TILE_ICON[tile.key];
              return (
                <li key={tile.key}>
                  <a className="card lift lp-tile" href={rUrl(lang, `/r/flow/${tile.dispute}/0`)}>
                    <Icon size={22} aria-hidden="true" />
                    <span>{tt(`ui.tile.${tile.key}`)}</span>
                    <ChevronRight size={18} aria-hidden="true" className="lp-tile-arrow" />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="lp-street">
          <StreetOfDoors />
        </div>
      </div>

      <div className="lp-mobilebar">
        <details className="lp-sheet">
          <summary className="btn btn-secondary">
            <Compass size={18} aria-hidden="true" />
            <span>{tt("ui.rail.title")}</span>
          </summary>
          <div className="lp-sheet-panel card">
            <CategoryList idPrefix="cats-sheet" />
          </div>
        </details>
        <a href="#ask" className="btn btn-primary">
          {tt("ui.home.ask_short")}
        </a>
      </div>

      <div className="lp-below">
        <section className="lp-how" id="how" aria-labelledby="how-h">
          <h2 id="how-h">{tt("ui.how.h2")}</h2>
          <ol className="lp-steps" role="list">
            {[1, 2, 3].map((n) => (
              <li key={n} className="card">
                <span className="lp-step-n" aria-hidden="true">
                  {n}
                </span>
                <h3>{tt(`ui.how.${n}.title`)}</h3>
                <p>{tt(`ui.how.${n}.body`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-free card card-warm" aria-labelledby="free-h">
          <h2 id="free-h">{tt("ui.free.h2")}</h2>
          <p>{tt("ui.free.body")}</p>
          <p className="lp-fact">{tt("ui.fact.daksh")}</p>
        </section>

        <section className="lp-faq" aria-labelledby="faq-h">
          <h2 id="faq-h">{tt("ui.faq.h2")}</h2>
          {[1, 2, 3, 4].map((n) => (
            <details key={n} className="card lp-faq-item">
              <summary>{tt(`ui.faq.${n}.q`)}</summary>
              <p>{tt(`ui.faq.${n}.a`)}</p>
            </details>
          ))}
        </section>
      </div>
    </div>
  );
}

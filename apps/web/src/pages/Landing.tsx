import { useRef } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronRight, Compass, LayoutGrid, Lock, Send } from "lucide-react";
import { APP_NAME } from "@raasta/config";
import { useLang, useT, rUrl } from "../lib/lang";
import { CATEGORIES, COMPLAINT_TILES, EXAMPLE_KEYS } from "../lib/content";
import { CATEGORY_ICON, TILE_ICON } from "../components/icons";
import { DoorIllo, PeaceIllo, SendIllo, TellIllo } from "../components/Illustrations";
import { Logo } from "../components/Logo";
import "../styles/landing.css";

const TONES = ["tone-cyan", "tone-blue", "tone-mint", "tone-peach"];
const TILE_TONES = ["tone-saffron", "tone-leaf", "tone-sky", "tone-rose"];

/** Calm moving backdrop: soft colour fields and a few dotted "roads" drifting slowly. Decorative, transform-only. */
function Backdrop() {
  return (
    <div className="lp-backdrop" aria-hidden="true">
      <span className="lp-glow g1" />
      <span className="lp-glow g2" />
      <span className="lp-glow g3" />
      <span className="lp-glow g4" />
      <svg className="lp-roads" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" focusable="false">
        <g className="road r1">
          <path d="M-80 690 C 220 600, 420 760, 720 660 S 1220 560, 1540 640" />
        </g>
        <g className="road r2">
          <path d="M-80 250 C 260 320, 520 160, 820 230 S 1260 330, 1540 210" />
        </g>
        <g className="road r3">
          <path d="M-80 470 C 300 420, 600 540, 900 470 S 1300 400, 1540 460" />
        </g>
      </svg>
      <span className="lp-dot d1" />
      <span className="lp-dot d2" />
      <span className="lp-dot d3" />
      <span className="lp-dot d4" />
      <span className="lp-dot d5" />
    </div>
  );
}

function CategoryList({ idPrefix, rail }: { idPrefix: string; rail?: boolean }) {
  const tt = useT();
  return (
    <ul className={rail ? "rail-list" : "lp-cats"} role="list" id={idPrefix}>
      {CATEGORIES.map((c, i) => {
        const Icon = CATEGORY_ICON[c.id];
        return (
          <li key={c.id}>
            <Link to={`/help/${c.id}`} className={rail ? "rail-item" : "lp-cat"}>
              <span className={`${rail ? "rail-icon" : "lp-cat-icon"} ${TONES[i % TONES.length]}`}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className={rail ? "rail-label" : "lp-cat-label"}>{tt(`category.${c.id}`)}</span>
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

  const fill = (text: string) => {
    const el = textRef.current;
    if (!el) return;
    el.value = text;
    el.focus();
  };

  return (
    <>
      <div className="lp-scene">
        <Backdrop />
        <div className="lp2">
          <nav className="lp-rail2" aria-labelledby="rail-h">
            <p className="rail-title" id="rail-h">
              {tt("ui.rail.title")}
            </p>
            <CategoryList idPrefix="cats-rail" rail />
            <Link to="/help" className="rail-item rail-all">
              <span className="rail-icon tone-plain">
                <LayoutGrid size={20} aria-hidden="true" />
              </span>
              <span className="rail-label">{tt("ui.rail.directory")}</span>
            </Link>
          </nav>

          <section className="lp-chat" id="ask" aria-labelledby="h1">
            <header className="chat-top">
              <span className="chat-avatar" aria-hidden="true">
                <Logo size={46} className="chat-logo" />
              </span>
              <span className="chat-who">
                <strong>{APP_NAME}</strong>
                <small>{tt("ui.home.chat_status")}</small>
              </span>
            </header>

            <div className="chat-body">
              <div className="msg msg-bot">
                <h1 id="h1">{tt("ui.home.h1")}</h1>
                <p>{tt("ui.home.lead")}</p>
              </div>
              <ul className="chat-try" aria-label={tt("ui.home.examples")} role="list">
                {EXAMPLE_KEYS.map((k) => {
                  const text = tt(k);
                  return (
                    <li key={k}>
                      <a
                        className="try-chip"
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
            </div>

            <form className="chat-form" method="post" action="/r/ask">
              <label htmlFor="ask-text" className="sr-only">
                {tt("ui.home.prompt_label")}
              </label>
              <textarea
                id="ask-text"
                ref={textRef}
                name="text"
                className="chat-input"
                rows={3}
                maxLength={1000}
                placeholder={tt("ui.home.placeholder")}
                required
              />
              <input type="hidden" name="lang" value={lang} />
              <div className="chat-foot">
                <p className="chat-privacy">
                  <Lock size={14} aria-hidden="true" />
                  <span>{tt("ui.home.privacy")}</span>
                </p>
                <button type="submit" className="btn btn-primary ask-send">
                  <span>{tt("ui.home.send")}</span>
                  <Send size={18} aria-hidden="true" />
                </button>
              </div>
            </form>
            <p className="chat-prefer">
              <Link to="/help" className="lp-inline-link">
                {tt("ui.home.prefer")} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </p>
          </section>
        </div>
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

      <section className="lp-complaints" aria-labelledby="common-h">
        <div className="container">
          <h2 id="common-h" className="reveal">
            {tt("ui.home.common")}
          </h2>
          <ul className="lp-tiles" role="list">
            {COMPLAINT_TILES.map((tile, i) => {
              const Icon = TILE_ICON[tile.key];
              return (
                <li key={tile.key} className="reveal">
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
        </div>
      </section>

      <section className="lp-how" id="how" aria-labelledby="how-h">
        <div className="container">
          <h2 id="how-h" className="reveal">
            {tt("ui.how.h2")}
          </h2>
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

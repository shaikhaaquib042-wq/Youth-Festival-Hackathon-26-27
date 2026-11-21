import { useRef } from "react";
import { Link } from "react-router";
import { ArrowRight, Lock, Send } from "lucide-react";
import { APP_NAME } from "@raasta/config";
import { useLang, useT, rUrl } from "../lib/lang";
import { CATEGORIES, EXAMPLE_KEYS } from "../lib/content";
import { CATEGORY_ICON } from "../components/icons";
import "../styles/landing.css";

const TONES = ["tone-cyan", "tone-blue", "tone-mint", "tone-peach"];

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
    <div className="lp-scene">
      <Backdrop />
      <div className="container lp2">
        <section className="lp-chat" id="ask" aria-labelledby="h1">
          <header className="chat-top">
            <span className="chat-avatar" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                <path d="M9 27 V15 Q9 7 16 7 Q23 7 23 15 V27 Z" fill="#FFFFFF" />
                <circle cx="19.5" cy="18.5" r="1.6" fill="#E56420" />
              </svg>
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
        </section>

        <nav className="lp-topics" aria-labelledby="topics-h">
          <h2 id="topics-h">{tt("ui.rail.title")}</h2>
          <ul className="topic-list" role="list">
            {CATEGORIES.map((c, i) => {
              const Icon = CATEGORY_ICON[c.id];
              return (
                <li key={c.id}>
                  <Link to={`/help/${c.id}`} className="topic">
                    <span className={`topic-icon ${TONES[i % TONES.length]}`}>
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="topic-text">
                      <span className="topic-name">{tt(`category.${c.id}`)}</span>
                      <span className="topic-desc">{tt(`category.${c.id}.desc`)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link to="/help" className="topic-all">
            {tt("ui.rail.directory")} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </div>
  );
}

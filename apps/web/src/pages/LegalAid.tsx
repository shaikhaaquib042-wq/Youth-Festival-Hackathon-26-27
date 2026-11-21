import { Phone, Scale, Video } from "lucide-react";
import { legalAid, states } from "../lib/site-data";
import { useLang } from "../lib/lang";
import { usePageT } from "../lib/pages-i18n";
import "../styles/pages.css";

export function LegalAid() {
  const tt = usePageT();
  const lang = useLang();
  return (
    <div className="page-band">
      <div className="container page la">
        <header className="la-head">
          <span className="la-badge" aria-hidden="true">
            <Scale size={30} />
          </span>
          <div>
            <h1>{tt("ui.legalaid.h1")}</h1>
            <p className="page-lead">{tt("ui.legalaid.explain.1")}</p>
          </div>
        </header>

        <div className="la-grid">
          <section className="la-card" aria-labelledby="form-h">
            <h2 id="form-h">{tt("ui.legalaid.form_h2")}</h2>
            <form method="post" action="/r/legal-aid">
              <fieldset className="q">
                <legend className="q-label">{tt("ui.legalaid.flags_legend")}</legend>
                <div className="opts">
                  {legalAid.section12_flags.map((f) => (
                    <label key={f.flag} className="opt opt-check">
                      <input className="opt-input" type="checkbox" name="flag" value={f.flag} />
                      <span className="opt-face">
                        <span className="opt-dot" aria-hidden="true" />
                        <span className="opt-text">{f.label_en}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="la-row">
                <div className="field">
                  <label htmlFor="la-state">{tt("ui.legalaid.state_label")}</label>
                  <select id="la-state" name="state" required defaultValue="">
                    <option value="" disabled>
                      {tt("ui.legalaid.state_pick")}
                    </option>
                    {states.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="la-income">{tt("ui.legalaid.income_label")}</label>
                  <div className="q-input has-pre">
                    <span className="q-pre" aria-hidden="true">
                      {"₹"}
                    </span>
                    <input id="la-income" name="income" type="number" inputMode="numeric" min={0} max={100000000} step={1} required />
                  </div>
                  <p className="la-hint">{tt("ui.legalaid.income_help")}</p>
                </div>
              </div>
              <input type="hidden" name="lang" value={lang} />
              <div className="la-submit">
                <button type="submit" className="btn btn-primary">
                  {tt("ui.legalaid.submit")}
                </button>
                <p className="la-hint">{tt("ui.legalaid.not_decision")}</p>
              </div>
            </form>
          </section>

          <aside className="la-side">
            <a className="la-call" href={`tel:${legalAid.helpline}`}>
              <span className="la-call-icon tone-leaf" aria-hidden="true">
                <Phone size={22} />
              </span>
              <span>
                <strong>{tt("ui.legalaid.helpline_link")}</strong>
                <small>{tt("ui.legalaid.helpline_text")}</small>
              </span>
            </a>
            <div className="la-call la-call-static">
              <span className="la-call-icon tone-sky" aria-hidden="true">
                <Video size={22} />
              </span>
              <span>
                <strong>{tt("ui.legalaid.tele_law_h2")}</strong>
                <small>{legalAid.tele_law_note_en}</small>
              </span>
            </div>
            <p className="la-more">{tt("ui.legalaid.explain.2")}</p>
          </aside>
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router";
import { legalAid, states } from "../lib/site-data";
import { useLang } from "../lib/lang";
import { usePageT } from "../lib/pages-i18n";

export function LegalAid() {
  const tt = usePageT();
  const lang = useLang();
  return (
    <div className="container stack page">
      <h1>{tt("ui.legalaid.h1")}</h1>
      <section className="card stack">
        <p>{tt("ui.legalaid.explain.1")}</p>
        <p>{tt("ui.legalaid.explain.2")}</p>
        <p>{tt("ui.legalaid.explain.3")}</p>
      </section>

      <section className="stack" aria-labelledby="form-h">
        <h2 id="form-h">{tt("ui.legalaid.form_h2")}</h2>
        <form method="post" action="/r/legal-aid" className="card stack">
          <fieldset className="stack">
            <legend>{tt("ui.legalaid.flags_legend")}</legend>
            {legalAid.section12_flags.map((f) => (
              <label key={f.flag} className="cluster">
                <input type="checkbox" name="flag" value={f.flag} />
                <span>{f.label_en}</span>
              </label>
            ))}
          </fieldset>
          <label className="field">
            <span>{tt("ui.legalaid.state_label")}</span>
            <select name="state" required defaultValue="">
              <option value="" disabled>
                {tt("ui.legalaid.state_pick")}
              </option>
              {states.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{tt("ui.legalaid.income_label")}</span>
            <input name="income" type="number" inputMode="numeric" min={0} max={100000000} step={1} required />
            <small className="sh-muted">{tt("ui.legalaid.income_help")}</small>
          </label>
          <input type="hidden" name="lang" value={lang} />
          <button type="submit" className="btn btn-primary">
            {tt("ui.legalaid.submit")}
          </button>
        </form>
        <p className="sh-muted">{tt("ui.legalaid.not_decision")}</p>
      </section>

      <section className="card stack" aria-labelledby="help-h">
        <h2 id="help-h">{tt("ui.legalaid.helpline_h2")}</h2>
        <p>{tt("ui.legalaid.helpline_text")}</p>
        <p>
          <a className="btn btn-secondary" href={`tel:${legalAid.helpline}`}>
            {tt("ui.legalaid.helpline_link")}
          </a>
        </p>
        <h2>{tt("ui.legalaid.tele_law_h2")}</h2>
        <p>{legalAid.tele_law_note_en}</p>
      </section>

      <p>
        <Link to="/offices">{tt("ui.nav.offices")}</Link>
      </p>
    </div>
  );
}

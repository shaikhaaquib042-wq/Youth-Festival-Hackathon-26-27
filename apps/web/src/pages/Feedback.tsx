import { useLocation } from "react-router";
import { states } from "../lib/site-data";
import { Turnstile } from "../components/Turnstile";
import { useLang } from "../lib/lang";
import { usePageT } from "../lib/pages-i18n";

const RATINGS = [1, 2, 3, 4, 5] as const;
const CATEGORIES = ["worked", "not_worked", "bug", "content", "other"] as const;

export function Feedback() {
  const tt = usePageT();
  const lang = useLang();
  const { pathname } = useLocation();
  const page = pathname.split("/").filter(Boolean).pop() ?? "feedback";

  return (
    <div className="container stack page">
      <h1>{tt("ui.feedback.h1")}</h1>
      <p className="page-lead">{tt("ui.feedback.lead")}</p>

      <section className="stack" aria-labelledby="fb-h">
        <h2 id="fb-h">{tt("ui.feedback.form_h2")}</h2>
        <form method="post" action="/r/feedback" className="card stack">
          <fieldset className="stack">
            <legend>{tt("ui.feedback.rating_legend")}</legend>
            <div className="cluster">
              {RATINGS.map((r) => (
                <label key={r} className="cluster">
                  <input type="radio" name="rating" value={String(r)} required />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span>{tt("ui.feedback.category")}</span>
            <select name="category" defaultValue="other">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {tt(`ui.feedback.cat.${c}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{tt("ui.feedback.message")}</span>
            <textarea name="message" rows={5} maxLength={1000} required aria-describedby="fb-msg-help" />
            <small id="fb-msg-help" className="sh-muted">
              {tt("ui.feedback.message_help")}
            </small>
          </label>
          <input type="hidden" name="page" value={page} />
          <input type="hidden" name="lang" value={lang} />
          <Turnstile />
          <button type="submit" className="btn btn-primary">
            {tt("ui.feedback.submit")}
          </button>
        </form>
      </section>

      <section className="stack" aria-labelledby="sys-h">
        <h2 id="sys-h">{tt("ui.feedback.system_h2")}</h2>
        <p>{tt("ui.feedback.system_lead")}</p>
        <form method="post" action="/r/system-request" className="card stack">
          <label className="field">
            <span>{tt("ui.feedback.sys_state")}</span>
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
            <span>{tt("ui.feedback.sys_city")}</span>
            <input name="city" type="text" maxLength={80} required />
          </label>
          <label className="field">
            <span>{tt("ui.feedback.sys_desc")}</span>
            <textarea name="dispute_desc" rows={4} maxLength={1000} required />
          </label>
          <label className="field">
            <span>{tt("ui.feedback.sys_portal")}</span>
            <input name="portal_url" type="url" maxLength={300} />
          </label>
          <label className="field">
            <span>{tt("ui.feedback.sys_contact")}</span>
            <input name="contact_optional" type="text" maxLength={200} aria-describedby="sys-contact-help" />
            <small id="sys-contact-help" className="sh-muted">
              {tt("ui.feedback.sys_contact_help")}
            </small>
          </label>
          <input type="hidden" name="lang" value={lang} />
          <Turnstile />
          <button type="submit" className="btn btn-primary">
            {tt("ui.feedback.sys_submit")}
          </button>
        </form>
      </section>

      <p className="sh-muted">{tt("ui.feedback.retention")}</p>
    </div>
  );
}

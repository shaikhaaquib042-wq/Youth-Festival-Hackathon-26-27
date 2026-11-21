import { useLocation } from "react-router";
import { Frown, Laugh, Meh, MessageSquareHeart, PlusCircle, Smile, SmilePlus } from "lucide-react";
import { states } from "../lib/site-data";
import { Turnstile } from "../components/Turnstile";
import { useLang } from "../lib/lang";
import { usePageT } from "../lib/pages-i18n";
import "../styles/pages.css";

const RATINGS = [
  { v: 1, Icon: Frown },
  { v: 2, Icon: Meh },
  { v: 3, Icon: Smile },
  { v: 4, Icon: SmilePlus },
  { v: 5, Icon: Laugh },
] as const;
const CATEGORIES = ["worked", "not_worked", "bug", "content", "other"] as const;

export function Feedback() {
  const tt = usePageT();
  const lang = useLang();
  const { pathname } = useLocation();
  const page = pathname.split("/").filter(Boolean).pop() ?? "feedback";

  return (
    <div className="page-band">
      <div className="container page">
        <h1>{tt("ui.feedback.h1")}</h1>
        <p className="page-lead">{tt("ui.feedback.lead")}</p>

        <div className="fb-grid">
          <section className="la-card" aria-labelledby="fb-h">
            <h2 id="fb-h" className="fb-h">
              <span className="la-call-icon tone-saffron" aria-hidden="true">
                <MessageSquareHeart size={22} />
              </span>
              {tt("ui.feedback.form_h2")}
            </h2>
            <form method="post" action="/r/feedback">
              <fieldset className="q">
                <legend className="q-label">{tt("ui.feedback.rating_legend")}</legend>
                <div className="rate">
                  {RATINGS.map(({ v, Icon }) => (
                    <label key={v} className="rate-opt">
                      <input className="opt-input" type="radio" name="rating" value={String(v)} required />
                      <span className="rate-face">
                        <Icon size={28} aria-hidden="true" />
                        <span>{v}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="field">
                <label htmlFor="fb-cat">{tt("ui.feedback.category")}</label>
                <select id="fb-cat" name="category" defaultValue="other">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {tt(`ui.feedback.cat.${c}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="fb-msg">{tt("ui.feedback.message")}</label>
                <textarea id="fb-msg" name="message" rows={5} maxLength={1000} required aria-describedby="fb-msg-help" />
                <p id="fb-msg-help" className="la-hint">
                  {tt("ui.feedback.message_help")}
                </p>
              </div>
              <input type="hidden" name="page" value={page} />
              <input type="hidden" name="lang" value={lang} />
              <Turnstile />
              <div className="la-submit">
                <button type="submit" className="btn btn-primary">
                  {tt("ui.feedback.submit")}
                </button>
              </div>
            </form>
          </section>

          <section className="la-card" aria-labelledby="sys-h">
            <h2 id="sys-h" className="fb-h">
              <span className="la-call-icon tone-leaf" aria-hidden="true">
                <PlusCircle size={22} />
              </span>
              {tt("ui.feedback.system_h2")}
            </h2>
            <p className="la-hint fb-lead">{tt("ui.feedback.system_lead")}</p>
            <form method="post" action="/r/system-request">
              <div className="la-row">
                <div className="field">
                  <label htmlFor="sys-state">{tt("ui.feedback.sys_state")}</label>
                  <select id="sys-state" name="state" required defaultValue="">
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
                  <label htmlFor="sys-city">{tt("ui.feedback.sys_city")}</label>
                  <input id="sys-city" name="city" type="text" maxLength={80} required />
                </div>
              </div>
              <div className="field">
                <label htmlFor="sys-desc">{tt("ui.feedback.sys_desc")}</label>
                <textarea id="sys-desc" name="dispute_desc" rows={4} maxLength={1000} required />
              </div>
              <div className="field">
                <label htmlFor="sys-portal">{tt("ui.feedback.sys_portal")}</label>
                <input id="sys-portal" name="portal_url" type="url" maxLength={300} />
              </div>
              <div className="field">
                <label htmlFor="sys-contact">{tt("ui.feedback.sys_contact")}</label>
                <input id="sys-contact" name="contact_optional" type="text" maxLength={200} aria-describedby="sys-contact-help" />
                <p id="sys-contact-help" className="la-hint">
                  {tt("ui.feedback.sys_contact_help")}
                </p>
              </div>
              <input type="hidden" name="lang" value={lang} />
              <Turnstile />
              <div className="la-submit">
                <button type="submit" className="btn btn-secondary">
                  {tt("ui.feedback.sys_submit")}
                </button>
              </div>
            </form>
          </section>
        </div>
        <p className="oc-note">{tt("ui.feedback.retention")}</p>
      </div>
    </div>
  );
}

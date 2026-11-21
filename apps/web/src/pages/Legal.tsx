import { useState } from "react";
import { Link } from "react-router";
import { useLang, localePath } from "../lib/lang";
import { usePageT } from "../lib/pages-i18n";

/** Removes only the keys this site wrote (prefixed raasta:) from this browser's local storage. */
function ClearDrafts() {
  const tt = usePageT();
  const [msg, setMsg] = useState("");
  const clear = () => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("raasta:")) keys.push(k);
      }
      keys.forEach((k) => window.localStorage.removeItem(k));
      setMsg(tt("ui.privacy.cleared"));
    } catch {
      setMsg(tt("ui.privacy.clear_fail"));
    }
  };
  return (
    <div className="stack">
      <button type="button" className="btn btn-secondary" onClick={clear}>
        {tt("ui.privacy.clear")}
      </button>
      <p role="status">{msg}</p>
    </div>
  );
}

export function Privacy() {
  const tt = usePageT();
  const rows = ["cookies", "drafts", "feedback", "system", "refs", "guidance"] as const;
  return (
    <div className="container stack page prose">
      <h1>{tt("ui.privacy.h1")}</h1>
      <p className="page-lead">{tt("ui.privacy.intro")}</p>
      <section className="stack">
        <h2>{tt("ui.privacy.accounts_h2")}</h2>
        <p>{tt("ui.privacy.accounts")}</p>
        <h2>{tt("ui.privacy.server_h2")}</h2>
        <p>{tt("ui.privacy.server")}</p>
        <h2>{tt("ui.privacy.ai_h2")}</h2>
        <p>{tt("ui.privacy.ai")}</p>
        <h2>{tt("ui.privacy.cookies_h2")}</h2>
        <p>{tt("ui.privacy.cookies")}</p>
        <h2>{tt("ui.privacy.drafts_h2")}</h2>
        <p>{tt("ui.privacy.drafts")}</p>
        <ClearDrafts />
        <h2>{tt("ui.privacy.feedback_h2")}</h2>
        <p>{tt("ui.privacy.feedback")}</p>
        <h2>{tt("ui.privacy.refs_h2")}</h2>
        <p>{tt("ui.privacy.refs")}</p>
        <h2>{tt("ui.privacy.rights_h2")}</h2>
        <p>{tt("ui.privacy.rights")}</p>
        <h2>{tt("ui.privacy.retention_h2")}</h2>
        <div className="table-wrap">
        <table>
          <caption className="sh-muted">{tt("ui.privacy.retention_caption")}</caption>
          <thead>
            <tr>
              <th scope="col">{tt("ui.privacy.th_info")}</th>
              <th scope="col">{tt("ui.privacy.th_where")}</th>
              <th scope="col">{tt("ui.privacy.th_how_long")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                <td>{tt(`ui.privacy.ret.${r}`)}</td>
                <td>{tt(`ui.privacy.ret.${r}_where`)}</td>
                <td>{tt(`ui.privacy.ret.${r}_how`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <h2>{tt("ui.privacy.security_h2")}</h2>
        <p>{tt("ui.privacy.security")}</p>
      </section>
      <p className="sh-muted">{tt("ui.privacy.updated")}</p>
    </div>
  );
}

export function Terms() {
  const tt = usePageT();
  const lang = useLang();
  const sections = ["law", "advice", "warranty", "use", "content", "changes"] as const;
  return (
    <div className="container stack page prose">
      <h1>{tt("ui.terms.h1")}</h1>
      <p className="page-lead">{tt("ui.terms.intro")}</p>
      {sections.map((s) => (
        <section key={s} className="stack">
          <h2>{tt(`ui.terms.${s}_h2`)}</h2>
          <p>{tt(`ui.terms.${s}`)}</p>
        </section>
      ))}
      <p>{tt("ui.terms.contact")}</p>
      <p>
        <Link to="/feedback">{tt("ui.nav.feedback")}</Link>
      </p>
      <p className="sh-muted">{tt("ui.terms.updated")}</p>
    </div>
  );
}

export function Disclaimer() {
  const tt = usePageT();
  return (
    <div className="container stack page prose">
      <h1>{tt("ui.disclaimer.h1")}</h1>
      <p className="page-lead">{tt("ui.disclaimer.lead")}</p>
      <p>{tt("ui.disclaimer.p1")}</p>
      <p>{tt("ui.disclaimer.p2")}</p>
      <p>{tt("ui.disclaimer.p3")}</p>
      <p>{tt("ui.disclaimer.p4")}</p>
    </div>
  );
}

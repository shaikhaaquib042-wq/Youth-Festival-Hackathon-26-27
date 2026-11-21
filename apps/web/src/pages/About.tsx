import { Link } from "react-router";
import { useLang, localePath } from "../lib/lang";
import { usePageT } from "../lib/pages-i18n";

export function About() {
  const tt = usePageT();
  const lang = useLang();
  return (
    <div className="container stack page">
      <h1>{tt("ui.about.h1")}</h1>
      <p className="page-lead">{tt("ui.about.lead")}</p>
      <section className="card stack">
        <h2>{tt("ui.about.who_h2")}</h2>
        <p>{tt("ui.about.who")}</p>
      </section>
      <section className="stack">
        <h2>{tt("ui.about.how_h2")}</h2>
        <p>{tt("ui.about.how_lead")}</p>
        <ol className="action-list">
          {[1, 2, 3, 4, 5].map((n) => (
            <li key={n}>{tt(`ui.about.how.${n}`)}</li>
          ))}
        </ol>
      </section>
      <section className="stack">
        <h2>{tt("ui.about.not_h2")}</h2>
        <p>{tt("ui.about.not")}</p>
      </section>
      <nav className="cluster" aria-label={tt("ui.about.h1")}>
        <Link to={localePath(lang, "/about/data")}>{tt("ui.about.data_link")}</Link>
        <Link to={localePath(lang, "/feedback")}>{tt("ui.about.feedback_link")}</Link>
      </nav>
    </div>
  );
}

export function AboutData() {
  const tt = usePageT();
  const sections = ["platforms", "handbook", "datameet", "osm", "nalsa", "offices"] as const;
  return (
    <div className="container stack page">
      <h1>{tt("ui.aboutdata.h1")}</h1>
      <p className="page-lead">{tt("ui.aboutdata.lead")}</p>
      <p className="sh-muted">{tt("ui.aboutdata.checked")}</p>
      {sections.map((s) => (
        <section key={s} className="card stack">
          <h2>{tt(`ui.aboutdata.${s}_h2`)}</h2>
          <p>{tt(`ui.aboutdata.${s}`)}</p>
        </section>
      ))}
    </div>
  );
}

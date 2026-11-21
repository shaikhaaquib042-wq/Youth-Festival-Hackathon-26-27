import { Link } from "react-router";
import { ArrowRight, Database, FileText, Map, MapPin, MessageSquareText, Route, ShieldCheck, Users } from "lucide-react";
import { usePageT } from "../lib/pages-i18n";
import "../styles/pages.css";

const STAGES = [
  { n: 1, Icon: MessageSquareText, tone: "tone-saffron" },
  { n: 2, Icon: MapPin, tone: "tone-leaf" },
  { n: 3, Icon: Route, tone: "tone-sky" },
  { n: 4, Icon: Users, tone: "tone-rose" },
  { n: 5, Icon: FileText, tone: "tone-saffron" },
] as const;

export function About() {
  const tt = usePageT();
  return (
    <div className="page-band">
      <div className="container page">
        <h1>{tt("ui.about.h1")}</h1>
        <p className="page-lead">{tt("ui.about.lead")}</p>

        <section className="about-how" aria-labelledby="how-h">
          <h2 id="how-h">{tt("ui.about.how_h2")}</h2>
          <p className="la-hint">{tt("ui.about.how_lead")}</p>
          <ol className="pipe" role="list">
            {STAGES.map(({ n, Icon, tone }) => (
              <li key={n} className="pipe-step reveal">
                <span className={`pipe-icon ${tone}`} aria-hidden="true">
                  <Icon size={24} />
                </span>
                <p>{tt(`ui.about.how.${n}`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="about-grid">
          <section className="la-card">
            <h2 className="fb-h">
              <span className="la-call-icon tone-leaf" aria-hidden="true">
                <Users size={22} />
              </span>
              {tt("ui.about.who_h2")}
            </h2>
            <p>{tt("ui.about.who")}</p>
          </section>
          <section className="la-card">
            <h2 className="fb-h">
              <span className="la-call-icon tone-rose" aria-hidden="true">
                <ShieldCheck size={22} />
              </span>
              {tt("ui.about.not_h2")}
            </h2>
            <p>{tt("ui.about.not")}</p>
          </section>
        </div>

        <nav className="about-links" aria-label={tt("ui.about.h1")}>
          <Link to="/about/data" className="btn btn-secondary">
            {tt("ui.about.data_link")} <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link to="/feedback" className="btn btn-ghost">
            {tt("ui.about.feedback_link")}
          </Link>
        </nav>
      </div>
    </div>
  );
}

const DATA_ICON = { platforms: Database, handbook: FileText, datameet: Map, osm: MapPin, nalsa: Users, offices: Route } as const;

export function AboutData() {
  const tt = usePageT();
  const sections = ["platforms", "handbook", "datameet", "osm", "nalsa", "offices"] as const;
  return (
    <div className="page-band">
      <div className="container page">
        <h1>{tt("ui.aboutdata.h1")}</h1>
        <p className="page-lead">{tt("ui.aboutdata.lead")}</p>
        <p className="oc-note">{tt("ui.aboutdata.checked")}</p>
        <div className="grid-auto data-grid">
          {sections.map((s, i) => {
            const Icon = DATA_ICON[s];
            return (
              <section key={s} className="la-card reveal">
                <h2 className="fb-h">
                  <span className={`la-call-icon ${["tone-saffron", "tone-leaf", "tone-sky"][i % 3]}`} aria-hidden="true">
                    <Icon size={22} />
                  </span>
                  {tt(`ui.aboutdata.${s}_h2`)}
                </h2>
                <p>{tt(`ui.aboutdata.${s}`)}</p>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

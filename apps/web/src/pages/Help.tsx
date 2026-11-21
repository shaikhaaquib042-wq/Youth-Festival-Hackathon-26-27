import { Link, useParams } from "react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useLang, useT, rUrl } from "../lib/lang";
import { CATEGORIES, findCategory } from "../lib/content";
import { CATEGORY_ICON } from "../components/icons";
import { NotFound } from "./NotFound";
import "../styles/pages.css";

const TONES = ["tone-saffron", "tone-leaf", "tone-sky", "tone-rose"];

export function Help() {
  const tt = useT();
  return (
    <div className="page-band">
      <div className="container page">
        <h1>{tt("ui.help.h1")}</h1>
        <p className="page-lead">{tt("ui.help.lead")}</p>
        <ul className="help-grid" role="list">
          {CATEGORIES.map((c, i) => {
            const Icon = CATEGORY_ICON[c.id];
            return (
              <li key={c.id} className="reveal">
                <Link to={`/help/${c.id}`} className="help-tile">
                  <span className={`help-icon ${TONES[i % TONES.length]}`} aria-hidden="true">
                    <Icon size={26} />
                  </span>
                  <span className="help-name">{tt(`category.${c.id}`)}</span>
                  <span className="help-desc">{tt(`category.${c.id}.desc`)}</span>
                  <span className="help-go">
                    {c.disputes.length} <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function HelpCategory() {
  const { category } = useParams();
  const lang = useLang();
  const tt = useT();
  const cat = findCategory(category);
  if (!cat) return <NotFound />;
  const idx = CATEGORIES.findIndex((c) => c.id === cat.id);
  const Icon = CATEGORY_ICON[cat.id];
  return (
    <div className="page-band">
      <div className="container page">
        <nav aria-label={tt("ui.breadcrumb")} className="crumbs">
          <Link to="/help">{tt("ui.help.h1")}</Link> <ChevronRight size={14} aria-hidden="true" /> <span>{tt(`category.${cat.id}`)}</span>
        </nav>
        <header className="cat-head">
          <span className={`help-icon ${TONES[idx % TONES.length]}`} aria-hidden="true">
            <Icon size={28} />
          </span>
          <div>
            <h1>{tt(`category.${cat.id}`)}</h1>
            <p className="page-lead">{tt(`category.${cat.id}.desc`)}</p>
          </div>
        </header>
        <ul className="dispute-list" role="list">
          {cat.disputes.map((d, i) => (
            <li key={d} className="reveal">
              <a className="dispute-row" href={rUrl(lang, `/r/flow/${d}/0`)}>
                <span className="dispute-text">
                  <strong>{tt(`dispute.${d}.title`)}</strong>
                  <span>{tt(`dispute.${d}.short`)}</span>
                </span>
                <span className="dispute-go">
                  {tt("ui.help.start")} <ChevronRight size={18} aria-hidden="true" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

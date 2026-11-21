import { Link, useParams } from "react-router";
import { ChevronRight } from "lucide-react";
import { useLang, useT, rUrl } from "../lib/lang";
import { CATEGORIES, findCategory } from "../lib/content";
import { CATEGORY_ICON } from "../components/icons";
import { NotFound } from "./NotFound";

export function Help() {
  const tt = useT();
  return (
    <div className="container stack page">
      <h1>{tt("ui.help.h1")}</h1>
      <p className="page-lead">{tt("ui.help.lead")}</p>
      <ul className="grid-3" role="list">
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICON[c.id];
          return (
            <li key={c.id}>
              <Link to={`/help/${c.id}`} className="card lift page-card">
                <Icon size={24} aria-hidden="true" />
                <h2>{tt(`category.${c.id}`)}</h2>
                <p>{tt(`category.${c.id}.desc`)}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function HelpCategory() {
  const { category } = useParams();
  const lang = useLang();
  const tt = useT();
  const cat = findCategory(category);
  if (!cat) return <NotFound />;
  return (
    <div className="container stack page">
      <nav aria-label={tt("ui.breadcrumb")} className="crumbs">
        <Link to="/help">{tt("ui.help.h1")}</Link> <ChevronRight size={14} aria-hidden="true" /> <span>{tt(`category.${cat.id}`)}</span>
      </nav>
      <h1>{tt(`category.${cat.id}`)}</h1>
      <p className="page-lead">{tt(`category.${cat.id}.desc`)}</p>
      <ul className="grid-2" role="list">
        {cat.disputes.map((d) => (
          <li key={d}>
            <a className="card lift page-card" href={rUrl(lang, `/r/flow/${d}/0`)}>
              <h2>{tt(`dispute.${d}.title`)}</h2>
              <p>{tt(`dispute.${d}.short`)}</p>
              <span className="page-card-go">
                {tt("ui.help.start")} <ChevronRight size={16} aria-hidden="true" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

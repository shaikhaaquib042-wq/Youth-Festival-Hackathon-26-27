import { Link } from "react-router";
import { useT } from "../lib/lang";
import { CATEGORIES } from "../lib/content";
import { StreetOfDoors } from "../components/StreetOfDoors";
import "../styles/pages.css";

export function NotFound() {
  const tt = useT();
  return (
    <div className="page-band nf">
      <div className="container page nf-inner">
        <p className="nf-code" aria-hidden="true">
          404
        </p>
        <h1>{tt("ui.notfound.title")}</h1>
        <p className="page-lead">{tt("ui.notfound.lead")}</p>
        <ul className="nf-chips" role="list">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link className="city-chip" to={`/help/${c.id}`}>
                {tt(`category.${c.id}`)}
              </Link>
            </li>
          ))}
        </ul>
        <p>
          <Link to="/" className="btn btn-primary">
            {tt("ui.notfound.home")}
          </Link>
        </p>
      </div>
      <StreetOfDoors />
    </div>
  );
}

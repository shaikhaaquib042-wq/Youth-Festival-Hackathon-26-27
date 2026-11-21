import { Link } from "react-router";
import { useT } from "../lib/lang";
import { CATEGORIES } from "../lib/content";
import { StreetOfDoors } from "../components/StreetOfDoors";

export function NotFound() {
  const tt = useT();
  return (
    <div className="container stack page">
      <h1>{tt("ui.notfound.title")}</h1>
      <p className="page-lead">{tt("ui.notfound.lead")}</p>
      <ul className="cluster" role="list">
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link className="chip" to={`/help/${c.id}`}>
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
      <StreetOfDoors />
    </div>
  );
}

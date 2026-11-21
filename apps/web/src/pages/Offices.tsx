import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { officesPune } from "../lib/site-data";
import type { Office } from "@raasta/data";
import { JsonLd } from "../components/JsonLd";
import { usePageT } from "../lib/pages-i18n";

const TYPE_ORDER: Office["type"][] = [
  "municipal_hq",
  "zone_dmc",
  "ward_office",
  "consumer_commission",
  "labour_office",
  "legal_aid",
  "court",
  "police",
  "regulator",
  "other",
];

const groups = TYPE_ORDER.map((type) => ({ type, items: officesPune.filter((o) => o.type === type) })).filter(
  (g) => g.items.length > 0,
);

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export function Offices() {
  const tt = usePageT();
  const { search } = useLocation();
  const [only, setOnly] = useState<string>("all");

  // The page is prerendered with every group visible. The GET filter works without JS
  // because the select submits ?type=..., and this effect narrows the list once JS runs.
  useEffect(() => {
    const v = new URLSearchParams(search).get("type");
    setOnly(v && groups.some((g) => g.type === v) ? v : "all");
  }, [search]);

  const visible = only === "all" ? groups : groups.filter((g) => g.type === only);

  const ld = {
    "@context": "https://schema.org",
    "@graph": officesPune.map((o) => ({
      "@type": "GovernmentOffice",
      name: o.name,
      ...(o.address ? { address: { "@type": "PostalAddress", streetAddress: o.address, addressLocality: o.city, addressCountry: "IN" } } : {}),
      ...(o.phone ? { telephone: o.phone } : {}),
      ...(o.email ? { email: o.email } : {}),
    })),
  };

  return (
    <div className="container stack page">
      <h1>{tt("ui.offices.h1")}</h1>
      <p className="page-lead">{tt("ui.offices.lead")}</p>

      <form method="get" action="/offices" className="card cluster offices-filter">
        <label className="field">
          <span>{tt("ui.offices.filter_label")}</span>
          <select name="type" value={only} onChange={(e) => setOnly(e.target.value)}>
            <option value="all">{tt("ui.offices.filter_all")}</option>
            {groups.map((g) => (
              <option key={g.type} value={g.type}>
                {tt(`ui.offices.type.${g.type}`)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-secondary">
          {tt("ui.offices.filter_submit")}
        </button>
      </form>

      {only === "all" ? (
        <nav aria-label={tt("ui.offices.jump")}>
          <p>{tt("ui.offices.jump")}:</p>
          <ul className="cluster" role="list">
            {groups.map((g) => (
              <li key={g.type}>
                <a href={`#type-${g.type}`}>{tt(`ui.offices.type.${g.type}`)}</a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {visible.map((g) => (
        <section key={g.type} id={`type-${g.type}`} className="stack" aria-labelledby={`h-${g.type}`}>
          <h2 id={`h-${g.type}`}>{tt(`ui.offices.type.${g.type}`)}</h2>
          <div className="grid-2">
            {g.items.map((o) => (
              <article key={o.id} className="card office-card stack">
                <h3>{o.name}</h3>
                {o.address ? (
                  <p>
                    <span className="sh-muted">{tt("ui.offices.address")}: </span>
                    {o.address}
                  </p>
                ) : null}
                {o.phone ? (
                  <p>
                    <span className="sh-muted">{tt("ui.offices.phone")}: </span>
                    <a href={telHref(o.phone)}>{o.phone}</a>
                  </p>
                ) : null}
                {o.email ? (
                  <p>
                    <span className="sh-muted">{tt("ui.offices.email")}: </span>
                    <a href={`mailto:${o.email}`}>{o.email}</a>
                  </p>
                ) : null}
                {o.hours ? (
                  <p>
                    <span className="sh-muted">{tt("ui.offices.hours")}: </span>
                    {o.hours}
                  </p>
                ) : null}
                {o.address ? (
                  <p>
                    <a href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(o.address)}`} rel="noopener noreferrer">
                      {tt("ui.offices.map")}
                    </a>
                  </p>
                ) : null}
                <p>{o.verified ? tt("ui.offices.verified") : tt("ui.offices.check")}</p>
              </article>
            ))}
          </div>
        </section>
      ))}

      <p className="sh-muted">{tt("ui.offices.other_cities")}</p>
      <JsonLd data={ld} />
    </div>
  );
}

import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Building2, ExternalLink, Landmark, Mail, MapPin, Phone, Scale, ShieldCheck, Store, Users } from "lucide-react";
import type { Office } from "@raasta/data/types";
import { CITIES, officesForCity } from "../lib/site-data";
import { JsonLd } from "../components/JsonLd";
import { usePageT } from "../lib/pages-i18n";
import "../styles/pages.css";

const TYPE_ORDER: Office["type"][] = ["municipal_hq", "zone_dmc", "ward_office", "consumer_commission", "labour_office", "legal_aid", "court", "police", "regulator", "other"];
const TYPE_ICON: Record<string, typeof Building2> = {
  municipal_hq: Landmark, zone_dmc: Building2, ward_office: Building2, consumer_commission: Store,
  labour_office: Users, legal_aid: Scale, court: Scale, police: ShieldCheck, regulator: Landmark, other: Building2,
};
const TONE: Record<string, string> = {
  municipal_hq: "tone-saffron", zone_dmc: "tone-saffron", ward_office: "tone-saffron", consumer_commission: "tone-sky",
  labour_office: "tone-leaf", legal_aid: "tone-leaf", court: "tone-sky", police: "tone-rose", regulator: "tone-sky", other: "tone-leaf",
};
const telHref = (phone: string) => `tel:${phone.split("/")[0]!.replace(/[^\d+]/g, "")}`;

function readLocCity(): string | undefined {
  const m = document.cookie.match(/(?:^|; )raasta_loc=([^;]*)/);
  if (!m) return undefined;
  const city = decodeURIComponent(m[1]!).split("|")[1]?.toLowerCase().trim();
  return CITIES.find((c) => city && (city === c.slug || city.includes(c.slug) || (c.slug === "bengaluru" && city.includes("bangalore"))))?.slug;
}

function OfficeCard({ o }: { o: Office }) {
  const tt = usePageT();
  const Icon = TYPE_ICON[o.type] ?? Building2;
  return (
    <article className="oc reveal">
      <div className="oc-head">
        <span className={`oc-icon ${TONE[o.type] ?? "tone-leaf"}`} aria-hidden="true">
          <Icon size={20} />
        </span>
        <h3>{o.name}</h3>
      </div>
      {o.address ? (
        <p className="oc-addr">
          <MapPin size={16} aria-hidden="true" />
          <span>{o.address}</span>
        </p>
      ) : null}
      <div className="oc-actions">
        {o.phone ? (
          <a className="oc-btn" href={telHref(o.phone)}>
            <Phone size={16} aria-hidden="true" />
            <span>{o.phone}</span>
          </a>
        ) : null}
        {o.email ? (
          <a className="oc-btn" href={`mailto:${o.email}`}>
            <Mail size={16} aria-hidden="true" />
            <span>{tt("ui.offices.email")}</span>
          </a>
        ) : null}
        {o.address ? (
          <a className="oc-btn" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(o.address)}`} target="_blank" rel="noopener noreferrer">
            <MapPin size={16} aria-hidden="true" />
            <span>{tt("ui.offices.map_short")}</span>
          </a>
        ) : null}
        {o.website ? (
          <a className="oc-btn" href={o.website} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            <span>{tt("ui.offices.site")}</span>
          </a>
        ) : null}
      </div>
      {o.verified ? null : <p className="oc-check">{tt("ui.offices.check")}</p>}
    </article>
  );
}

export function Offices() {
  const tt = usePageT();
  const { city } = useParams();
  const navigate = useNavigate();
  const slug = city && CITIES.some((c) => c.slug === city) ? city : "pune";
  const cityName = CITIES.find((c) => c.slug === slug)!.name;
  const list = officesForCity(slug);
  const groups = TYPE_ORDER.map((type) => ({ type, items: list.filter((o) => o.type === type) })).filter((g) => g.items.length);

  // On the bare /offices page, jump to the city saved in the location cookie (no cookie: stays on Pune).
  useEffect(() => {
    if (city) return;
    const saved = readLocCity();
    if (saved && saved !== "pune") navigate(`/offices/${saved}`, { replace: true });
  }, [city, navigate]);

  const ld = {
    "@context": "https://schema.org",
    "@graph": list.map((o) => ({
      "@type": "GovernmentOffice",
      name: o.name,
      ...(o.address ? { address: { "@type": "PostalAddress", streetAddress: o.address, addressLocality: o.city, addressCountry: "IN" } } : {}),
      ...(o.phone ? { telephone: o.phone } : {}),
      ...(o.email ? { email: o.email } : {}),
    })),
  };

  return (
    <div className="page-band">
      <div className="container page">
        <h1>{tt("ui.offices.h1_city", { city: cityName })}</h1>
        <p className="page-lead">{tt("ui.offices.lead_short")}</p>
        <nav className="city-chips" aria-label={tt("ui.offices.cities")}>
          {CITIES.map((c) => (
            <Link key={c.slug} to={`/offices/${c.slug}`} className={`city-chip${c.slug === slug ? " is-on" : ""}`} aria-current={c.slug === slug ? "page" : undefined}>
              {c.name}
            </Link>
          ))}
        </nav>
        <nav className="type-jump" aria-label={tt("ui.offices.jump")}>
          {groups.map((g) => (
            <a key={g.type} href={`#type-${g.type}`}>
              {tt(`ui.offices.type.${g.type}`)}
              <span>{g.items.length}</span>
            </a>
          ))}
        </nav>
        {groups.map((g) => (
          <section key={g.type} id={`type-${g.type}`} className="oc-group" aria-labelledby={`h-${g.type}`}>
            <h2 id={`h-${g.type}`}>{tt(`ui.offices.type.${g.type}`)}</h2>
            <div className="grid-auto">
              {g.items.map((o) => (
                <OfficeCard key={o.id} o={o} />
              ))}
            </div>
          </section>
        ))}
        <p className="oc-note">{tt("ui.offices.other_cities")}</p>
        <JsonLd data={ld} />
      </div>
    </div>
  );
}

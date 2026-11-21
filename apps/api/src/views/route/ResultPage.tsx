import { officesPune, platformById } from "@raasta/data";
import { DISCLAIMER_EN } from "@raasta/config";
import { t, type Locale } from "@raasta/i18n";
import type { LiveTimer } from "@raasta/rules";
import type { GeoContext, RouteResult } from "@raasta/rules/types";
import { Layout } from "../Layout";
import { Documents, Door, FirstStep, LegalAid, Sources, Timers, Warnings } from "./parts";

export interface ResultPageProps {
  lang: Locale;
  token: string;
  result: RouteResult;
  geo: GeoContext;
  timers: LiveTimer[];
  title: string;
}

function WardPicker({ lang, token, geo }: { lang: Locale; token: string; geo: GeoContext }) {
  if (geo.ulb !== "PMC") return null;
  const wards = officesPune.filter((o) => o.type === "ward_office");
  return (
    <form className="card stack" method="post" action={`/r/route/${token}/ward`}>
      <label className="field">
        <span>{t(lang, "ui.route.ward_label")}</span>
        <select name="ward_id" defaultValue={geo.pmc_ward_id ?? ""}>
          <option value="">{t(lang, "ui.route.ward_none")}</option>
          {wards.map((w) => (
            <option key={w.id} value={w.id} selected={w.id === geo.pmc_ward_id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-meta">{t(lang, "ui.route.ward_help")}</p>
      <button type="submit" className="btn btn-secondary">
        {t(lang, "ui.route.ward_save")}
      </button>
    </form>
  );
}

/** Basic result renderer. A later phase replaces the body with the rich action centre; keep the props stable. */
export function ResultPage({ lang, token, result, geo, timers, title }: ResultPageProps) {
  return (
    <Layout lang={lang} title={`${title} | Raasta`} path={`/r/route/${token}`} noindex>
      <div className="container stack">
        <h1>{title}</h1>
        {result.urgency === "emergency" ? (
          <p className="alert">
            {t(lang, "ui.route.urgent")} <a href="/emergency">{t(lang, "ui.route.urgent_link")}</a>
          </p>
        ) : null}
        <FirstStep lang={lang} step={result.first_peaceful_step} />
        <Door lang={lang} option={result.primary} heading={t(lang, "ui.route.primary")} level={2} />
        {result.alternatives.length ? (
          <section className="stack" aria-labelledby="alts">
            <h2 id="alts">{t(lang, "ui.route.alternatives")}</h2>
            {result.alternatives.map((o) => (
              <Door key={o.platform_id} lang={lang} option={o} heading={platformById(o.platform_id)?.name ?? o.platform_id} level={3} />
            ))}
          </section>
        ) : null}
        <Documents lang={lang} items={result.documents} />
        <Timers lang={lang} timers={timers} />
        <LegalAid lang={lang} aid={result.legal_aid} />
        <Warnings lang={lang} keys={result.warnings} />
        <WardPicker lang={lang} token={token} geo={geo} />
        <Sources lang={lang} sources={result.sources} />
        <p className="text-meta">{lang === "en" ? DISCLAIMER_EN : t(lang, "ui.disclaimer")}</p>
        <p>
          <a className="btn btn-ghost" href="/">
            {t(lang, "ui.route.restart")}
          </a>
        </p>
      </div>
    </Layout>
  );
}

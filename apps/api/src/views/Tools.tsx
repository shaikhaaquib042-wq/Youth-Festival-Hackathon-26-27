import { legalAid, states, type Office } from "@raasta/data";
import type { TemplateDef } from "@raasta/docs-gen";
import { LANG_META, t, type Locale } from "@raasta/i18n";
import type { RouteResult } from "@raasta/rules/types";
import { LOCALES } from "@raasta/config";
import type { OfficesResult } from "../geo/offices";
import { telHref } from "../lib/draft";
import { Layout } from "./Layout";
import { msg } from "./text";

export const FIELD = "f_";

// ---------- /r/doc ----------
type Var = TemplateDef["variables"][number];

// Fields that only make sense for some problems. Anything not listed is always shown.
const ONLY_FOR: Record<string, string[]> = {
  phone_model: ["lost_mobile"], imei_numbers: ["lost_mobile"], location_lost: ["lost_mobile"],
  accused_handle: ["cyber_harassment", "cyber_fraud"], platform_used: ["cyber_harassment", "cyber_fraud"],
  bank_name: ["cyber_fraud", "banking_nbfc"], transaction_id: ["cyber_fraud"], transaction_date: ["cyber_fraud"],
  neighbor_name: ["neighbour_construction"], damage_type: ["neighbour_construction", "civic_failure"],
};
const PERSONAL = new Set(["user_address", "user_phone", "user_email"]);
const MONEY = new Set(["amount", "amount_paid", "purchase_cost", "mrp", "charged_price", "unpaid_amount", "deposit_amount"]);
const MONEY_DISPUTES = new Set(["consumer_refund", "mrp_overcharge", "unpaid_wages", "security_deposit", "banking_nbfc", "insurance_claim", "investment_broker", "builder_delay", "cyber_fraud", "pension_pf"]);

function VarField({ lang, v, value }: { lang: Locale; v: Var; value?: string }) {
  const id = `f-${v.id}`;
  const long = v.type === "textarea";
  return (
    <div className={`field${long ? " span-2" : ""}`}>
      <label for={id}>
        {v.label_en}
        {v.required ? null : <span className="tag-optional">{t(lang, "ui.doc.optional")}</span>}
      </label>
      {long ? (
        <textarea id={id} name={FIELD + v.id} rows={4} maxlength={600}>
          {value ?? ""}
        </textarea>
      ) : (
        <input
          id={id}
          type={v.type === "number" ? "number" : v.type === "date" ? "date" : "text"}
          name={FIELD + v.id}
          value={value ?? ""}
          maxlength={v.type === "text" ? 160 : undefined}
          {...(v.type === "number" ? { inputmode: "numeric", min: "0", step: "any" } : {})}
        />
      )}
    </div>
  );
}

export function DocFormPage({ lang, tpl, values, token, office, dispute, hasAmount }: { lang: Locale; tpl: TemplateDef; values: Record<string, string>; token?: string; office?: string; dispute?: string; hasAmount?: boolean }) {
  const fits = (v: Var) => !dispute || !ONLY_FOR[v.id] || ONLY_FOR[v.id]!.includes(dispute);
  const shown = tpl.variables.filter(fits);
  // Money fields: shown directly for money disputes or when we already know an amount; otherwise behind a damage question.
  const moneyAsk = !hasAmount && !!dispute && !MONEY_DISPUTES.has(dispute);
  const core = shown.filter((v) => !PERSONAL.has(v.id) && !(moneyAsk && MONEY.has(v.id)));
  // Ask as little as possible: required or already-filled fields up front, the rest folded as optional extras.
  const main = core.filter((v) => v.required || values[v.id]);
  const extra = core.filter((v) => !v.required && !values[v.id]);
  const money = moneyAsk ? shown.filter((v) => MONEY.has(v.id)) : [];
  const personal = shown.filter((v) => PERSONAL.has(v.id));
  return (
    <Layout lang={lang} title={`${tpl.title_en} | Raasta`} path={`/r/doc/${tpl.id}`} query={token ? `t=${encodeURIComponent(token)}` : undefined} noindex>
      <div className="q-stage">
        <div className="q-card q-card-wide">
          <h1 className="q-title">{tpl.title_en}</h1>
          <p className="q-lead">{t(lang, "ui.doc.lead_short")}</p>
          <form method="post" action={`/r/doc/${tpl.id}`}>
            {token ? <input type="hidden" name="t" value={token} /> : null}
            {office ? <input type="hidden" name="office" value={office} /> : null}
            <div className="doc-grid">
              {main.map((v) => (
                <VarField key={v.id} lang={lang} v={v} value={values[v.id]} />
              ))}
            </div>
            {extra.length ? (
              <details className="doc-more">
                <summary>{t(lang, "ui.doc.more_optional", { n: extra.length })}</summary>
                <div className="doc-grid">
                  {extra.map((v) => (
                    <VarField key={v.id} lang={lang} v={v} value={values[v.id]} />
                  ))}
                </div>
              </details>
            ) : null}
            {money.length ? (
              <details className="doc-more">
                <summary>{t(lang, "ui.doc.damage_q")}</summary>
                <div className="doc-grid">
                  {money.map((v) => (
                    <VarField key={v.id} lang={lang} v={v} value={values[v.id]} />
                  ))}
                </div>
              </details>
            ) : null}
            {personal.length ? (
              <details className="doc-more" open>
                <summary>{t(lang, "ui.doc.you")}</summary>
                <p className="q-skip">{t(lang, "ui.doc.you_note")}</p>
                <div className="doc-grid">
                  {personal.map((v) => (
                    <VarField key={v.id} lang={lang} v={v} value={values[v.id]} />
                  ))}
                </div>
              </details>
            ) : null}
            <div className="doc-foot">
              <div className="field">
                <label for="doc-lang">{t(lang, "ui.doc.language")}</label>
                <select id="doc-lang" name="doc_lang">
                  {LOCALES.map((l) => (
                    <option key={l} value={l} selected={l === lang}>
                      {LANG_META[l].native}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary">
                {t(lang, "ui.doc.build")}
              </button>
            </div>
            <p className="q-skip">{t(lang, "ui.doc.privacy")}</p>
          </form>
        </div>
      </div>
    </Layout>
  );
}

// ---------- /r/label ----------
export function LabelPage({ lang, token, office, toName, toAddress }: { lang: Locale; token?: string; office?: string; toName?: string; toAddress?: string }) {
  return (
    <Layout lang={lang} title={`${t(lang, "ui.label.h1")} | Raasta`} path="/r/label" query={token ? `t=${encodeURIComponent(token)}` : undefined} noindex>
      <div className="container stack tool-page">
        <h1>{t(lang, "ui.label.h1")}</h1>
        <section className="card stack">
          <p>{t(lang, "ui.label.guidance")}</p>
          <p>{t(lang, "ui.label.article")}</p>
        </section>
        <form className="stack" method="post" action="/r/label">
          {office ? <input type="hidden" name="office" value={office} /> : null}
          {toName ? (
            <p>
              <strong>{t(lang, "ui.label.to")}:</strong> {toName}
              {toAddress ? <span>, {toAddress}</span> : null}
            </p>
          ) : (
            <>
              <label className="field">
                <span>{t(lang, "ui.label.to_name")}</span>
                <input name="to_name" maxlength={120} required />
              </label>
              <label className="field">
                <span>{t(lang, "ui.label.to_address")}</span>
                <textarea name="to_address" rows={3} maxlength={400} required></textarea>
              </label>
            </>
          )}
          <label className="field">
            <span>{t(lang, "ui.label.from_name")}</span>
            <input name="from_name" maxlength={120} required />
          </label>
          <label className="field">
            <span>{t(lang, "ui.label.from_address")}</span>
            <textarea name="from_address" rows={3} maxlength={400} required></textarea>
          </label>
          <label className="field">
            <span>{t(lang, "ui.label.from_phone")}</span>
            <input name="from_phone" type="tel" maxlength={20} />
          </label>
          <label className="field">
            <span>{t(lang, "ui.label.format")}</span>
            <select name="format">
              <option value="a4">{t(lang, "ui.label.fmt_a4")}</option>
              <option value="dl">{t(lang, "ui.label.fmt_dl")}</option>
            </select>
          </label>
          <p className="text-meta">{t(lang, "ui.doc.privacy")}</p>
          <button type="submit" className="btn btn-primary">
            {t(lang, "ui.label.build")}
          </button>
        </form>
      </div>
    </Layout>
  );
}

// ---------- /r/directions ----------
export interface Dest {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  hours?: string;
  lat?: number;
  lng?: number;
  url?: string;
}

export interface DirectionsProps {
  lang: Locale;
  dest: Dest;
  token?: string;
  disputeTitle?: string;
  docs: string[];
  from?: [number, number];
  fromText?: string;
  route?: { km: number; minutes: number } | "unavailable";
  geocodeFailed?: boolean;
}

export function osmLinks(dest: Dest, from?: [number, number]) {
  const has = dest.lat !== undefined && dest.lng !== undefined;
  const to = has ? `${dest.lat},${dest.lng}` : undefined;
  const text = encodeURIComponent([dest.name, dest.address].filter(Boolean).join(", "));
  return {
    osm: has
      ? from
        ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from[0]}%2C${from[1]}%3B${to}`
        : `https://www.openstreetmap.org/?mlat=${dest.lat}&mlon=${dest.lng}#map=17/${dest.lat}/${dest.lng}`
      : `https://www.openstreetmap.org/search?query=${text}`,
    geo: has ? `geo:${to}?q=${to}(${encodeURIComponent(dest.name)})` : `geo:0,0?q=${text}`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${has ? to : text}${from ? `&origin=${from[0]},${from[1]}` : ""}`,
  };
}

export function DirectionsPage({ lang, dest, token, disputeTitle, docs, from, route, geocodeFailed }: DirectionsProps) {
  const links = osmLinks(dest, from);
  const toParam = encodeURIComponent(dest.id);
  return (
    <Layout lang={lang} title={`${t(lang, "ui.dir.h1", { name: dest.name })} | Raasta`} path="/r/directions" query={`to=${toParam}`} noindex>
      <div className="container stack tool-page">
        <h1>{t(lang, "ui.dir.h1", { name: dest.name })}</h1>
        <section className="card stack office-card" aria-labelledby="where">
          <h2 id="where">{t(lang, "ui.dir.where")}</h2>
          <p>{dest.address ?? t(lang, "ui.dir.no_address")}</p>
          <p>
            {dest.hours ?? t(lang, "ui.dir.call_first")}{" "}
            {dest.phone ? <a href={telHref(dest.phone)}>{dest.phone}</a> : null}
          </p>
          {dest.url ? (
            <p>
              <a href={dest.url} target="_blank" rel="noopener noreferrer">
                {t(lang, "ui.dir.site")}
              </a>
            </p>
          ) : null}
        </section>

        <section className="card stack" aria-labelledby="route">
          <h2 id="route">{t(lang, "ui.dir.route")}</h2>
          {route && route !== "unavailable" ? (
            <p>{t(lang, "ui.dir.result", { km: route.km, min: route.minutes })}</p>
          ) : route === "unavailable" ? (
            <p className="notice">{t(lang, "ui.dir.unavailable")}</p>
          ) : null}
          {geocodeFailed ? <p className="notice">{t(lang, "ui.dir.geocode_failed")}</p> : null}
          {!from ? (
            <form className="stack" method="get" action="/r/directions">
              <input type="hidden" name="to" value={dest.id} />
              {token ? <input type="hidden" name="t" value={token} /> : null}
              {dest.id.includes(",") ? <input type="hidden" name="name" value={dest.name} /> : null}
              <input type="hidden" name="from" value="" />
              <button type="button" className="sh-locate" data-locate="" data-msg-busy={t(lang, "ui.location.busy")} data-msg-denied={t(lang, "ui.location.denied")} data-msg-fail={t(lang, "ui.location.fail")}>
                {t(lang, "ui.dir.use_gps")}
              </button>
              <span data-locate-status="" role="status"></span>
              <label className="field">
                <span>{t(lang, "ui.dir.landmark")}</span>
                <input name="landmark" maxlength={120} />
              </label>
              <p className="text-meta">{t(lang, "ui.dir.privacy")}</p>
              <button type="submit" className="btn btn-secondary">
                {t(lang, "ui.dir.find")}
              </button>
            </form>
          ) : null}
          <div className="cluster">
            <a className="btn btn-secondary" href={links.osm} target="_blank" rel="noopener noreferrer">
              {t(lang, "ui.dir.osm")}
            </a>
            <a className="btn btn-secondary" href={links.geo}>
              {t(lang, "ui.dir.geo")}
            </a>
            <a className="btn btn-secondary" href={links.google} target="_blank" rel="noopener noreferrer">
              {t(lang, "ui.dir.google")}
            </a>
          </div>
        </section>

        <section className="card stack" aria-labelledby="carry">
          <h2 id="carry">{t(lang, "ui.dir.carry")}</h2>
          <p>{t(lang, "ui.dir.copies")}</p>
          {docs.length ? (
            <ul role="list">
              {docs.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : null}
          <h3>{t(lang, "ui.dir.say")}</h3>
          <p>{disputeTitle ? t(lang, "ui.dir.say_text_with", { topic: disputeTitle }) : t(lang, "ui.dir.say_text")}</p>
          <p>
            <button type="button" className="btn btn-secondary no-print" data-print hidden>
              {t(lang, "ui.res.print")}
            </button>
          </p>
        </section>
        {token ? (
          <p>
            <a className="btn btn-ghost" href={`/r/route/${encodeURIComponent(token)}`}>
              {t(lang, "ui.guide.back_route")}
            </a>
          </p>
        ) : null}
      </div>
      <script src="/r/assets/enhance.js" defer></script>
    </Layout>
  );
}

// ---------- /r/offices ----------
const TYPES = ["police", "court", "ward_office", "municipal_hq", "consumer_commission", "labour_office", "legal_aid", "zone_dmc"];

export function OfficesPage({
  lang, q, result, stateName, geocodeFailed,
}: {
  lang: Locale;
  q: { state?: string; city?: string; type?: string; landmark?: string };
  result?: OfficesResult;
  stateName?: { name: string; slsa?: { name: string; url: string; phone?: string } };
  geocodeFailed?: boolean;
}) {
  return (
    <Layout lang={lang} title={`${t(lang, "ui.off.h1")} | Raasta`} path="/r/offices" noindex>
      <div className="container stack tool-page">
        <h1>{t(lang, "ui.off.h1")}</h1>
        <form className="card stack" method="get" action="/r/offices">
          <input type="hidden" name="lat" value="" />
          <input type="hidden" name="lng" value="" />
          {q.type ? <input type="hidden" name="type" value={q.type} /> : null}
          <button type="button" className="btn btn-primary" data-locate hidden data-msg-busy={t(lang, "ui.location.busy")} data-msg-denied={t(lang, "ui.location.denied")} data-msg-fail={t(lang, "ui.location.fail")}>
            {t(lang, "ui.off.near_me")}
          </button>
          <p className="text-meta" data-locate-status aria-live="polite"></p>
        </form>
        <form className="card stack" method="get" action="/r/offices">
          <label className="field">
            <span>{t(lang, "ui.aid.state_label")}</span>
            <select name="state" data-loc-state>
              <option value="">{t(lang, "ui.off.any")}</option>
              {states.map((s) => (
                <option key={s.code} value={s.code} selected={q.state === s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t(lang, "ui.off.city")}</span>
            <input name="city" value={q.city ?? ""} maxlength={60} />
          </label>
          <label className="field">
            <span>{t(lang, "ui.off.type")}</span>
            <select name="type">
              <option value="">{t(lang, "ui.off.any")}</option>
              {TYPES.map((x) => (
                <option key={x} value={x} selected={q.type === x}>
                  {t(lang, `ui.off.type.${x}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t(lang, "ui.dir.landmark")}</span>
            <input name="landmark" value={q.landmark ?? ""} maxlength={120} />
          </label>
          <button type="submit" className="btn btn-primary">
            {t(lang, "ui.off.search")}
          </button>
        </form>
        {geocodeFailed ? <p className="notice">{t(lang, "ui.dir.geocode_failed")}</p> : null}
        {result ? (
          result.offices.length ? (
            <ul className="stack" role="list">
              {result.offices.map((o) => (
                <li key={o.id} className="card office-card stack">
                  <h2>{o.name}</h2>
                  {o.address ? <p>{o.address}</p> : null}
                  {o.distance_km !== undefined ? <p className="text-meta">{t(lang, "ui.off.km", { km: o.distance_km })}</p> : null}
                  {!o.verified ? <p className="text-meta">{t(lang, "ui.off.unverified")}</p> : null}
                  {o.phone ? (
                    <p>
                      <a href={telHref(o.phone)}>{o.phone}</a>
                    </p>
                  ) : null}
                  {o.email ? (
                    <p>
                      <a href={`mailto:${o.email}`}>{o.email}</a>
                    </p>
                  ) : null}
                  <p>
                    <a
                      className="btn btn-secondary"
                      href={
                        o.source === "registry"
                          ? `/r/directions?to=${encodeURIComponent(o.id)}`
                          : `/r/directions?to=${o.lat},${o.lng}&name=${encodeURIComponent(o.name)}`
                      }
                    >
                      {t(lang, "ui.act.get_there")}
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <section className="card stack">
              <p>{t(lang, "ui.off.none")}</p>
              {stateName?.slsa ? (
                <p>
                  <strong>{stateName.slsa.name}</strong>{" "}
                  {stateName.slsa.phone ? <a href={telHref(stateName.slsa.phone)}>{stateName.slsa.phone}</a> : null}{" "}
                  <a href={stateName.slsa.url} target="_blank" rel="noopener noreferrer">
                    {t(lang, "ui.dir.site")}
                  </a>
                </p>
              ) : null}
            </section>
          )
        ) : null}
        {result?.attribution ? <p className="text-meta">{result.attribution}</p> : null}
      </div>
    </Layout>
  );
}

// ---------- /r/legal-aid ----------
export function LegalAidResultPage({ lang, aid, token }: { lang: Locale; aid: RouteResult["legal_aid"]; token?: string }) {
  const c = aid.contact;
  return (
    <Layout lang={lang} title={`${t(lang, "ui.route.legal_aid")} | Raasta`} path="/r/legal-aid" noindex>
      <div className="container stack tool-page">
        <h1>{t(lang, "ui.route.legal_aid")}</h1>
        <section className="card card-warm stack" aria-labelledby="res">
          <h2 id="res">{t(lang, `ui.aid.${aid.eligible}`)}</h2>
          <p>{msg(lang, aid.reason_key)}</p>
          <p>{legalAid.tele_law_note_en}</p>
        </section>
        <section className="card stack office-card" aria-labelledby="contact">
          <h2 id="contact">{c.name}</h2>
          {c.address ? <p>{c.address}</p> : null}
          {c.phone ? (
            <p>
              <a href={telHref(c.phone)}>{c.phone}</a>
            </p>
          ) : null}
          {c.email ? (
            <p>
              <a href={`mailto:${c.email}`}>{c.email}</a>
            </p>
          ) : null}
          {c.url ? (
            <p>
              <a href={c.url} target="_blank" rel="noopener noreferrer">
                {t(lang, "ui.dir.site")}
              </a>
            </p>
          ) : null}
          <p>
            <a className="btn btn-primary" href={`tel:${legalAid.helpline}`}>
              {t(lang, "ui.aid.helpline_link")}
            </a>
          </p>
          {c.office_id && !c.office_id.startsWith("slsa:") ? (
            <p>
              <a className="btn btn-secondary" href={`/r/directions?to=${encodeURIComponent(c.office_id)}`}>
                {t(lang, "ui.act.get_there")}
              </a>
            </p>
          ) : null}
        </section>
        <p className="text-meta">{t(lang, "ui.aid.not_decision")}</p>
        {token ? (
          <p>
            <a className="btn btn-ghost" href={`/r/route/${encodeURIComponent(token)}`}>
              {t(lang, "ui.guide.back_route")}
            </a>
          </p>
        ) : null}
      </div>
    </Layout>
  );
}

export type { Office };

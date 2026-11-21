import { legalAid, officesPune, platformById } from "@raasta/data";
import { DISCLAIMER_EN } from "@raasta/config";
import { t, type Locale } from "@raasta/i18n";
import type { LiveTimer } from "@raasta/rules";
import type { ChecklistItem, GeoContext, IntakeSlots, RouteResult } from "@raasta/rules/types";
import { dateIN } from "../../lib/draft";
import { Layout } from "../Layout";
import { msg } from "../text";
import { Door, type ActionCtx } from "./action";
import { LegalAid as LegalAidCard, Sources, Warnings } from "./parts";

export interface ResultPageProps {
  lang: Locale;
  token: string;
  result: RouteResult;
  geo: GeoContext;
  timers: LiveTimer[];
  title: string;
  slots?: IntakeSlots;
  demo?: boolean;
}

const WARD_DISPUTES = new Set(["civic_failure", "neighbour_construction"]);

function WardPicker({ lang, token, geo }: { lang: Locale; token: string; geo: GeoContext }) {
  if (geo.ulb !== "PMC") return null;
  const wards = officesPune.filter((o) => o.type === "ward_office");
  return (
    <form className="card stack" method="post" action={`/r/route/${token}/ward`}>
      <label className="field">
        <span>{t(lang, "ui.route.ward_label")}</span>
        <select name="ward_id">
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

/** Progress street: first step, the primary door, then the other doors, joined by one dotted path. */
function Street({ lang, alts }: { lang: Locale; alts: number }) {
  const n = Math.min(alts, 3);
  const xs = [60, 220, ...Array.from({ length: n }, (_, i) => 380 + i * 90)];
  const d = xs.map((x, i) => `${i ? "L" : "M"}${x} 70`).join(" ");
  const label = t(lang, "ui.res.street_label");
  return (
    <div className="door-street" role="img" aria-label={label}>
      <svg viewBox="0 0 640 110" xmlns="http://www.w3.org/2000/svg" focusable="false">
        <path d="M0 92 H640" stroke="#D3E3CB" stroke-width="6" fill="none" />
        <path id="path" d={d} stroke="#F57A2F" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round" fill="none" />
        <circle cx="60" cy="70" r="9" fill="#2D7341" />
        <g className="is-chosen">
          <rect className="door" x="198" y="30" width="44" height="62" rx="6" fill="#FFE6CC" stroke="#F57A2F" stroke-width="3" />
          <rect x="210" y="50" width="20" height="42" rx="3" fill="#FF8C42" />
        </g>
        {xs.slice(2).map((x) => (
          <g key={x} className="is-dim">
            <rect x={x - 16} y="46" width="32" height="46" rx="5" fill="#E6EFE2" stroke="#8FB57F" stroke-width="2" />
            <rect x={x - 6} y="62" width="12" height="30" rx="2" fill="#8FB57F" />
          </g>
        ))}
      </svg>
    </div>
  );
}

function Emergency({ lang, token }: { lang: Locale; token: string }) {
  return (
    <section className="alert stack" aria-labelledby="emerg">
      <h2 id="emerg" className="alert-title">
        {t(lang, "ui.res.emergency_h")}
      </h2>
      <p>{t(lang, "ui.emergency.lead")}</p>
      <div className="cluster">
        <a className="btn btn-primary" href="tel:1930">
          {t(lang, "ui.emergency.call_1930")}
        </a>
        <a className="btn btn-secondary" href="tel:112">
          {t(lang, "ui.emergency.call_112")}
        </a>
        <a className="btn btn-secondary" href={`/r/doc/bank_fraud_intimation?t=${encodeURIComponent(token)}`}>
          {t(lang, "ui.res.bank_letter")}
        </a>
      </div>
    </section>
  );
}

function Checklist({ lang, items }: { lang: Locale; items: ChecklistItem[] }) {
  if (!items.length) return null;
  return (
    <section className="card stack" aria-labelledby="docs">
      <h2 id="docs">{t(lang, "ui.route.documents")}</h2>
      <p className="text-meta">{t(lang, "ui.res.checklist_note")}</p>
      <ul className="checklist" role="list">
        {items.map((d, i) => {
          const text = lang === "en" ? d.label_en : msg(lang, d.key) === d.key ? d.label_en : msg(lang, d.key);
          return (
            <li key={d.key}>
              <label for={`doc-${i}`}>
                <input type="checkbox" id={`doc-${i}`} />
                <span className="item-text">
                  {text}
                  <span className="item-note">{d.required ? t(lang, "ui.route.required") : t(lang, "ui.route.optional")}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p>
        <button type="button" className="btn btn-secondary no-print" data-print hidden>
          {t(lang, "ui.res.print")}
        </button>
      </p>
    </section>
  );
}

function timerText(lang: Locale, tm: LiveTimer): string {
  if (tm.status === "needs_date" || tm.days_remaining === null) return t(lang, "ui.route.needs_date");
  const when = tm.due_date ? ` (${t(lang, "ui.res.due", { date: dateIN(tm.due_date) })})` : "";
  if (tm.status === "due_today") return t(lang, "ui.route.due_today") + when;
  if (tm.status === "overdue") return t(lang, "ui.route.overdue", { n: Math.abs(tm.days_remaining) }) + when;
  return t(lang, "ui.route.days_left", { n: tm.days_remaining }) + when;
}

function Timers({ lang, timers }: { lang: Locale; timers: LiveTimer[] }) {
  if (!timers.length) return null;
  return (
    <section className="card stack" aria-labelledby="timers">
      <h2 id="timers">{t(lang, "ui.route.timers")}</h2>
      <ul className="stack" role="list">
        {timers.map((tm) => (
          <li key={tm.key}>
            <strong>{lang === "en" ? tm.label_en : msg(lang, tm.label_key) === tm.label_key ? tm.label_en : msg(lang, tm.label_key)}</strong>{" "}
            <span className="timer">{timerText(lang, tm)}</span>
            {tm.note_en && lang === "en" ? <span className="text-meta"> {tm.note_en}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AidForm({ lang, token }: { lang: Locale; token: string }) {
  return (
    <form className="stack" method="post" action="/r/legal-aid">
      <input type="hidden" name="t" value={token} />
      <fieldset className="stack">
        <legend>{t(lang, "ui.aid.flags_legend")}</legend>
        {legalAid.section12_flags.map((f) => (
          <label key={f.flag} className="cluster">
            <input type="checkbox" name="flag" value={f.flag} /> <span>{f.label_en}</span>
          </label>
        ))}
      </fieldset>
      <label className="field">
        <span>{t(lang, "ui.aid.income_label")}</span>
        <input name="income" type="number" inputmode="numeric" min="0" max="100000000" step="1" />
      </label>
      <button type="submit" className="btn btn-secondary">
        {t(lang, "ui.res.aid_check")}
      </button>
    </form>
  );
}

export function ResultPage({ lang, token, result, geo, timers, title, slots, demo }: ResultPageProps) {
  const s: IntakeSlots = slots ?? { dispute_type: result.dispute_type, summary: title, missing_fields: [] };
  const ctx: ActionCtx = { lang, token, slots: s, title, demo: demo ?? true };
  const step = result.first_peaceful_step;
  const tpl = step.doc_template;
  const q = encodeURIComponent(token);
  return (
    <Layout lang={lang} title={`${title} | Raasta`} path={`/r/route/${token}`} noindex>
      <div className="container stack">
        {result.urgency === "emergency" ? <Emergency lang={lang} token={token} /> : null}
        <h1>{title}</h1>
        <Street lang={lang} alts={result.alternatives.length} />
        <section className="card card-warm stack" aria-labelledby="first-step">
          <h2 id="first-step">{t(lang, "ui.route.first_step")}</h2>
          <p>{msg(lang, step.key)}</p>
          {step.free ? <p className="text-free">{t(lang, "ui.route.free")}</p> : null}
          {tpl ? (
            <p>
              <a className="btn btn-primary" href={`/r/doc/${encodeURIComponent(tpl)}?t=${q}`}>
                {t(lang, "ui.res.prepare_letter")}
              </a>
            </p>
          ) : null}
        </section>
        <Door ctx={ctx} option={result.primary} heading={t(lang, "ui.route.primary")} level={2} idx={0} />
        {result.alternatives.length ? (
          <section className="stack" aria-labelledby="alts">
            <h2 id="alts">{t(lang, "ui.route.alternatives")}</h2>
            {result.alternatives.map((o, i) => (
              <Door key={o.platform_id} ctx={ctx} option={o} heading={platformById(o.platform_id)?.name ?? o.platform_id} level={3} idx={i + 1} />
            ))}
          </section>
        ) : null}
        <Checklist lang={lang} items={result.documents} />
        <Timers lang={lang} timers={timers} />
        <div className="stack">
          <LegalAidCard lang={lang} aid={result.legal_aid} />
          <div className="card stack">
            <AidForm lang={lang} token={token} />
          </div>
        </div>
        <Warnings lang={lang} keys={result.warnings} />
        {WARD_DISPUTES.has(result.dispute_type) ? <WardPicker lang={lang} token={token} geo={geo} /> : null}
        <Sources lang={lang} sources={result.sources} />
        <p className="text-meta">{lang === "en" ? DISCLAIMER_EN : t(lang, "ui.disclaimer")}</p>
        <p>
          <a className="btn btn-ghost" href="/">
            {t(lang, "ui.route.restart")}
          </a>
        </p>
      </div>
      <script src="/r/assets/enhance.js" defer></script>
    </Layout>
  );
}

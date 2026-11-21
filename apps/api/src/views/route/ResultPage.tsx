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

/** Journey graphic: you, the free first step, the right door (open), and the other doors. Inline SVG, no JS. */
function Street({ lang, alts }: { lang: Locale; alts: number }) {
  const n = Math.min(alts, 3);
  const label = t(lang, "ui.res.street_label");
  const door = (x: number, cls: string, fill: string, stroke: string) => (
    <g className={cls}>
      <rect x={x - 34} y="38" width="68" height="74" rx="18" fill={fill} stroke={stroke} stroke-width="3" />
      <path d={`M${x - 16} 112 V78 Q${x - 16} 62 ${x} 62 Q${x + 16} 62 ${x + 16} 78 V112 Z`} fill="#FFE6A8" />
      <path className="door" d={`M${x - 16} 112 V78 Q${x - 16} 62 ${x} 62 Q${x + 16} 62 ${x + 16} 78 V112 Z`} fill={stroke} />
    </g>
  );
  const end = n ? ` S520 132 ${460 + (n - 1) * 90} 122` : "";
  return (
    <div className="res-street" role="img" aria-label={label}>
      <svg viewBox="0 0 720 140" xmlns="http://www.w3.org/2000/svg" focusable="false" preserveAspectRatio="xMidYMid meet">
        <path d="M0 96 Q180 70 360 92 T720 86 V140 H0 Z" fill="#E6EFE2" />
        <rect x="0" y="112" width="720" height="28" fill="#F4E9D8" />
        <path className="res-path" d={`M70 122 C150 132 170 120 230 122 S330 132 380 122${end}`} fill="none" stroke="#E56420" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 11" />
        <g>
          <circle cx="70" cy="92" r="11" fill="#F2C9A0" />
          <path d="M56 122 Q56 104 70 104 Q84 104 84 122 Z" fill="#2D7341" />
        </g>
        <g className="res-leaf">
          <circle cx="230" cy="86" r="26" fill="#DCEFD9" />
          <path d="M218 92 Q230 64 246 80 Q236 84 230 100 Z" fill="#3D8854" />
        </g>
        {door(380, "res-main is-chosen", "#FFF5EB", "#E56420")}
        {Array.from({ length: n }, (_, i) => door(470 + i * 90, "res-alt", "#F4F8F2", "#8FB57F"))}
        <g className="res-pin" transform="translate(380 18)">
          <path d="M0 22 C-10 10 -13 5 -13 -1 A13 13 0 0 1 13 -1 C13 5 10 10 0 22 Z" fill="#E56420" />
          <circle cx="0" cy="-1" r="5" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}

function Emergency({ lang, token, safety }: { lang: Locale; token: string; safety?: boolean }) {
  if (safety) {
    return (
      <section className="alert stack" aria-labelledby="emerg">
        <h2 id="emerg" className="alert-title">
          {t(lang, "ui.res.safety_h")}
        </h2>
        <p>{t(lang, "ui.res.safety_lead")}</p>
        <div className="cluster">
          <a className="btn btn-primary" href="tel:112">
            {t(lang, "ui.emergency.call_112")}
          </a>
        </div>
      </section>
    );
  }
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
    <section className="side-card" aria-labelledby="docs">
      <h2 id="docs">{t(lang, "ui.res.side_docs")}</h2>
      <ul className="checklist" role="list">
        {items.map((d, i) => {
          const text = lang === "en" ? d.label_en : msg(lang, d.key) === d.key ? d.label_en : msg(lang, d.key);
          return (
            <li key={d.key}>
              <label for={`doc-${i}`}>
                <input type="checkbox" id={`doc-${i}`} />
                <span className="item-text">
                  {text}
                  {d.required ? null : <span className="item-note">{t(lang, "ui.doc.optional")}</span>}
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
    <section className="side-card" aria-labelledby="timers">
      <h2 id="timers">{t(lang, "ui.res.side_time")}</h2>
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
    <form method="post" action="/r/legal-aid">
      <input type="hidden" name="t" value={token} />
      <fieldset className="q">
        <legend className="q-label">{t(lang, "ui.aid.flags_legend")}</legend>
        <div className="opts">
          {legalAid.section12_flags.map((f) => (
            <label key={f.flag} className="opt opt-check">
              <input className="opt-input" type="checkbox" name="flag" value={f.flag} />
              <span className="opt-face">
                <span className="opt-dot" aria-hidden="true"></span>
                <span className="opt-text">{f.label_en}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field aid-income">
        <label for="aid-income">{t(lang, "ui.aid.income_label")}</label>
        <div className="q-input has-pre">
          <span className="q-pre" aria-hidden="true">{"\u20B9"}</span>
          <input id="aid-income" name="income" type="number" inputmode="numeric" min="0" max="100000000" step="1" />
        </div>
      </div>
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
  const emergency = result.urgency === "emergency";
  return (
    <Layout lang={lang} title={`${title} | Raasta`} path={`/r/route/${token}`} noindex>
      <div className="res-hero">
        <div className="container">
          {emergency ? <Emergency lang={lang} token={token} safety={result.dispute_type !== "cyber_fraud"} /> : null}
          <h1>{title}</h1>
          {s.summary && s.summary !== title ? <p className="res-summary">{s.summary}</p> : null}
          <Street lang={lang} alts={result.alternatives.length} />
        </div>
      </div>
      <div className="container res-grid">
        <ol className="journey" role="list">
          <li className="j-step j-first">
            <span className="j-n" aria-hidden="true">1</span>
            <div className="j-body">
              <p className="j-kicker">{emergency ? t(lang, "ui.res.first_safety") : t(lang, "ui.res.step1")}</p>
              <p className="j-lead">{msg(lang, step.key)}</p>
              <div className="j-row">
                {step.free ? <span className="text-free">{t(lang, "ui.res.free_tag")}</span> : null}
                {tpl ? (
                  <a className="btn btn-primary" href={`/r/doc/${encodeURIComponent(tpl)}?t=${q}`}>
                    {t(lang, "ui.res.prepare_letter")}
                  </a>
                ) : null}
              </div>
            </div>
          </li>
          <li className="j-step">
            <span className="j-n" aria-hidden="true">2</span>
            <div className="j-body">
              <p className="j-kicker">{t(lang, "ui.res.step2")}</p>
              <Door ctx={ctx} option={result.primary} heading={t(lang, "ui.route.primary")} level={2} idx={0} />
            </div>
          </li>
          {result.alternatives.length ? (
            <li className="j-step">
              <span className="j-n" aria-hidden="true">3</span>
              <div className="j-body">
                <p className="j-kicker">{t(lang, "ui.res.step3")}</p>
                {result.alternatives.map((o, i) => (
                  <details key={o.platform_id} className="alt">
                    <summary>
                      <span>{platformById(o.platform_id)?.name ?? o.platform_id}</span>
                      <span className="alt-fee">{o.fee}</span>
                    </summary>
                    <Door ctx={ctx} option={o} heading={platformById(o.platform_id)?.name ?? o.platform_id} level={3} idx={i + 1} compact />
                  </details>
                ))}
              </div>
            </li>
          ) : null}
        </ol>
        <aside className="res-side">
          <Checklist lang={lang} items={result.documents} />
          <Timers lang={lang} timers={timers} />
          <section className="side-card" aria-labelledby="aid-h">
            <h2 id="aid-h">{t(lang, "ui.res.aid_q")}</h2>
            <LegalAidCard lang={lang} aid={result.legal_aid} />
            <details className="doc-more">
              <summary>{t(lang, "ui.res.aid_check")}</summary>
              <AidForm lang={lang} token={token} />
            </details>
          </section>
          {WARD_DISPUTES.has(result.dispute_type) ? <WardPicker lang={lang} token={token} geo={geo} /> : null}
        </aside>
      </div>
      <div className="container res-foot">
        <Warnings lang={lang} keys={result.warnings} />
        <details className="doc-more">
          <summary>{t(lang, "ui.res.sources")}</summary>
          <Sources lang={lang} sources={result.sources} />
        </details>
        <p className="q-skip">{lang === "en" ? DISCLAIMER_EN : t(lang, "ui.disclaimer")}</p>
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

import { officesPune, type Platform } from "@raasta/data";
import { t, type Locale } from "@raasta/i18n";
import type { IntakeSlots } from "@raasta/rules/types";
import { draftText, safeHttps, telHref } from "../lib/draft";
import { Layout } from "./Layout";

const strs = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : []);

function words(key: string): string {
  const k = key.replace(/_days$/, "").replace(/_/g, " ");
  return k.charAt(0).toUpperCase() + k.slice(1);
}

/** Registry objects such as fees or SLA, turned into plain sentences. Arrays and nested objects are skipped. */
export function plainEntries(obj: unknown): Array<[string, string]> {
  if (!obj || typeof obj !== "object") return [];
  const out: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof v === "string") out.push([words(k), v]);
    else if (typeof v === "number") out.push([words(k), k.endsWith("_days") ? `${v} days` : String(v)]);
  }
  return out;
}

const OFFICE_TYPES: Array<[RegExp, string[]]> = [
  [/e_jagriti|nch_/, ["consumer_commission"]],
  [/labour|epfigms/, ["labour_office"]],
  [/nalsa|tele_law/, ["legal_aid"]],
  [/police|ncrp/, []],
  [/pmc|pcmc|aaple|swachhata|digit/, ["municipal_hq", "zone_dmc"]],
  [/rent|small_causes/, ["court"]],
];

export function officesForPlatform(id: string) {
  const hit = OFFICE_TYPES.find(([re]) => re.test(id));
  if (!hit || !hit[1].length) return [];
  return officesPune.filter((o) => hit[1].includes(o.type)).slice(0, 3);
}

export interface GuideProps {
  lang: Locale;
  platform: Platform;
  token?: string;
  slots?: IntakeSlots;
  title?: string;
}

export function GuidePage({ lang, platform: p, token, slots, title }: GuideProps) {
  const pre = strs(p.mandatory_pre_steps);
  const steps = strs(p.step_by_step_guide);
  const docs = strs(p.documents_required);
  const fees = plainEntries(p.fees);
  const sla = plainEntries(p.sla_and_timelines);
  const wrong = strs(p.exclusions);
  const up = plainEntries(p.upload_constraints);
  const formats = strs((p.upload_constraints as Record<string, unknown> | undefined)?.formats);
  const minutes = Math.max(10, Math.round(((pre.length + steps.length) * 5) / 5) * 5);
  const home = safeHttps(String((p.urls as Record<string, unknown> | undefined)?.home ?? ""));
  const draft = slots ? draftText(slots, title ?? slots.summary) : undefined;
  const describeAt = Math.max(0, steps.findIndex((s) => /describe|detail|issue|explain|narrat|complaint/i.test(s)));
  const offices = officesForPlatform(p.id);
  return (
    <Layout lang={lang} title={`${p.name} | Raasta`} path={`/r/guide/${p.id}`} query={token ? `t=${encodeURIComponent(token)}` : undefined} noindex>
      <div className="container stack tool-page">
        <h1>{p.name}</h1>
        <p>{p.managing_body}</p>
        <section className="card card-warm stack" aria-labelledby="ov">
          <h2 id="ov">{t(lang, "ui.guide.overview")}</h2>
          <p>{t(lang, "ui.guide.minutes", { n: minutes })}</p>
          {docs.length ? (
            <>
              <h3>{t(lang, "ui.guide.docs")}</h3>
              <ul role="list">
                {docs.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </>
          ) : null}
          {fees.length ? (
            <p>
              <strong>{t(lang, "ui.route.fee")}:</strong> {fees.map(([k, v]) => `${k}: ${v}`).join(". ")}
            </p>
          ) : null}
          {sla.length ? (
            <p>
              <strong>{t(lang, "ui.route.sla")}:</strong> {sla.map(([k, v]) => `${k}: ${v}`).join(". ")}
            </p>
          ) : null}
          {home ? (
            <p>
              <a className="btn btn-secondary" href={home} target="_blank" rel="noopener noreferrer">
                {t(lang, "ui.route.open_portal")}
              </a>
            </p>
          ) : null}
        </section>

        <section className="stack" aria-labelledby="steps">
          <h2 id="steps">{t(lang, "ui.guide.steps")}</h2>
          <ol className="stepper">
            {pre.map((s, i) => (
              <li key={`p${i}`}>
                <span className="step-title">{t(lang, "ui.guide.before")}</span>
                <span className="step-body">{s}</span>
              </li>
            ))}
            {steps.map((s, i) => (
              <li key={`s${i}`}>
                <span className="step-title">{t(lang, "ui.guide.step", { n: i + 1 })}</span>
                <span className="step-body">{s}</span>
                {draft && i === describeAt ? (
                  <div className="field">
                    <label for="guide-draft">{t(lang, "ui.guide.draft")}</label>
                    <textarea id="guide-draft" readonly rows={8}>
                      {draft}
                    </textarea>
                    <button type="button" className="btn btn-ghost" data-copy hidden>
                      {t(lang, "ui.act.copy")}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
          {!steps.length ? <p>{t(lang, "ui.guide.no_steps")}</p> : null}
        </section>

        {wrong.length || up.length ? (
          <section className="card stack" aria-labelledby="wrong">
            <h2 id="wrong">{t(lang, "ui.guide.wrong")}</h2>
            {wrong.length ? (
              <ul role="list">
                {wrong.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            {formats.length || up.length ? (
              <p>
                <strong>{t(lang, "ui.guide.uploads")}:</strong> {[...(formats.length ? [`${formats.join(", ")}`] : []), ...up.filter(([k]) => k !== "Formats").map(([k, v]) => `${k}: ${v}`)].join(". ")}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="card stack" aria-labelledby="after">
          <h2 id="after">{t(lang, "ui.guide.after")}</h2>
          <p>{t(lang, "ui.guide.after_note")}</p>
          {p.escalation_path ? (
            <p>
              <strong>{t(lang, "ui.guide.next_door")}:</strong> {p.escalation_path}
            </p>
          ) : null}
        </section>

        <section className="card stack" aria-labelledby="offline">
          <h2 id="offline">{t(lang, "ui.guide.offline")}</h2>
          <p>{t(lang, "ui.guide.offline_note")}</p>
          {offices.map((o) => (
            <div key={o.id} className="office-card stack">
              <p>
                <strong>{o.name}</strong>
                {o.address ? <span> {o.address}</span> : null}
              </p>
              {o.phone ? (
                <p>
                  <a href={telHref(o.phone)}>{o.phone}</a>
                </p>
              ) : null}
              <p>
                <a className="btn btn-secondary" href={`/r/directions?to=${encodeURIComponent(o.id)}${token ? `&t=${encodeURIComponent(token)}` : ""}`}>
                  {t(lang, "ui.act.get_there")}
                </a>
              </p>
            </div>
          ))}
        </section>
        {token ? (
          <p>
            <a className="btn btn-ghost" href={`/r/route/${encodeURIComponent(token)}`}>
              {t(lang, "ui.guide.back_route")}
            </a>
          </p>
        ) : (
          <p>
            <a className="btn btn-ghost" href="/">
              {t(lang, "ui.route.restart")}
            </a>
          </p>
        )}
      </div>
      <script src="/r/assets/enhance.js" defer></script>
    </Layout>
  );
}

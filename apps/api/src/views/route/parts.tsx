import { officeById, platformById } from "@raasta/data";
import { t, type Locale } from "@raasta/i18n";
import type { ChecklistItem, ForumOption, OfficeRef, RouteResult, Step } from "@raasta/rules/types";
import type { LiveTimer } from "@raasta/rules";
import { msg } from "../text";

function homeUrl(platformId: string): string | undefined {
  const urls = platformById(platformId)?.urls as Record<string, unknown> | undefined;
  const home = urls?.home;
  return typeof home === "string" && /^https:\/\//.test(home) ? home : undefined;
}

export function FirstStep({ lang, step }: { lang: Locale; step: Step }) {
  return (
    <section className="card card-warm stack" aria-labelledby="first-step">
      <h2 id="first-step">{t(lang, "ui.route.first_step")}</h2>
      <p>{msg(lang, step.key)}</p>
      {step.free ? <p className="text-free">{t(lang, "ui.route.free")}</p> : null}
    </section>
  );
}

function Contact({ lang, mode }: { lang: Locale; mode: ForumOption["submission"][number] }) {
  if (mode.kind === "phone") {
    return (
      <li>
        {t(lang, "ui.route.call")}{" "}
        <a href={`tel:${mode.number.replace(/[^+\d]/g, "")}`}>{mode.number}</a>
      </li>
    );
  }
  if (mode.kind === "email") {
    return (
      <li>
        {t(lang, "ui.route.email")} <a href={`mailto:${mode.to}`}>{mode.to}</a>
      </li>
    );
  }
  if (mode.kind === "in_person") {
    const o = officeById(mode.officeRef);
    if (!o) return null;
    return (
      <li className="office-card">
        <strong>{o.name}</strong>
        {o.address ? <span> {o.address}</span> : null}
        {o.phone ? (
          <span>
            {" "}
            <a href={`tel:${o.phone.replace(/[^+\d]/g, "")}`}>{o.phone}</a>
          </span>
        ) : null}
      </li>
    );
  }
  return null;
}

export function Door({ lang, option, heading, level }: { lang: Locale; option: ForumOption; heading: string; level: 2 | 3 }) {
  const platform = platformById(option.platform_id);
  const url = homeUrl(option.platform_id);
  const contacts = option.submission.filter((m) => m.kind === "phone" || m.kind === "email" || m.kind === "in_person");
  const H = level === 2 ? "h2" : "h3";
  return (
    <section className="card stack" aria-label={heading}>
      <H>{heading}</H>
      <p>
        <strong>{platform?.name ?? option.platform_id}</strong>
      </p>
      <p>{msg(lang, option.why_key)}</p>
      <p>
        {t(lang, "ui.route.fee")}: {option.fee}
      </p>
      <p>
        {t(lang, "ui.route.sla")}: {option.sla}
      </p>
      {option.blocked_reason_key ? <p className="notice">{msg(lang, option.blocked_reason_key)}</p> : null}
      {contacts.length ? (
        <div className="stack">
          <p>{t(lang, "ui.route.contact")}</p>
          <ul className="stack" role="list">
            {contacts.map((m, i) => (
              <Contact key={i} lang={lang} mode={m} />
            ))}
          </ul>
        </div>
      ) : null}
      {url ? (
        <p>
          <a className="btn btn-secondary" href={url} rel="noopener noreferrer">
            {t(lang, "ui.route.open_portal")}
          </a>
        </p>
      ) : null}
    </section>
  );
}

export function Documents({ lang, items }: { lang: Locale; items: ChecklistItem[] }) {
  if (!items.length) return null;
  return (
    <section className="card stack" aria-labelledby="docs">
      <h2 id="docs">{t(lang, "ui.route.documents")}</h2>
      <ul className="checklist" role="list">
        {items.map((d) => (
          <li key={d.key}>
            {lang === "en" ? d.label_en : msg(lang, d.key) === d.key ? d.label_en : msg(lang, d.key)}{" "}
            <span className="text-meta">({d.required ? t(lang, "ui.route.required") : t(lang, "ui.route.optional")})</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function timerText(lang: Locale, tm: LiveTimer): string {
  if (tm.status === "needs_date" || tm.days_remaining === null) return t(lang, "ui.route.needs_date");
  if (tm.status === "due_today") return t(lang, "ui.route.due_today");
  if (tm.status === "overdue") return t(lang, "ui.route.overdue", { n: Math.abs(tm.days_remaining) });
  return t(lang, "ui.route.days_left", { n: tm.days_remaining });
}

export function Timers({ lang, timers }: { lang: Locale; timers: LiveTimer[] }) {
  if (!timers.length) return null;
  return (
    <section className="card stack" aria-labelledby="timers">
      <h2 id="timers">{t(lang, "ui.route.timers")}</h2>
      <ul className="stack" role="list">
        {timers.map((tm) => (
          <li key={tm.key} className="timer">
            <strong>{lang === "en" ? tm.label_en : msg(lang, tm.label_key) === tm.label_key ? tm.label_en : msg(lang, tm.label_key)}</strong>{" "}
            <span>{timerText(lang, tm)}</span>
            {tm.note_en && lang === "en" ? <span className="text-meta"> {tm.note_en}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LegalAid({ lang, aid }: { lang: Locale; aid: RouteResult["legal_aid"] }) {
  const c: OfficeRef = aid.contact;
  return (
    <section className="card stack" aria-labelledby="aid">
      <h2 id="aid">{t(lang, "ui.route.legal_aid")}</h2>
      <p>{msg(lang, aid.reason_key)}</p>
      <p className="office-card">
        <strong>{c.name}</strong>
        {c.address ? <span> {c.address}</span> : null}
        {c.phone ? (
          <span>
            {" "}
            <a href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}>{c.phone}</a>
          </span>
        ) : null}
        {c.email ? (
          <span>
            {" "}
            <a href={`mailto:${c.email}`}>{c.email}</a>
          </span>
        ) : null}
      </p>
    </section>
  );
}

export function Warnings({ lang, keys }: { lang: Locale; keys: string[] }) {
  if (!keys.length) return null;
  return (
    <section className="notice stack" aria-labelledby="warn">
      <h2 id="warn">{t(lang, "ui.route.warnings")}</h2>
      <ul className="stack" role="list">
        {keys.map((k) => (
          <li key={k}>{msg(lang, k)}</li>
        ))}
      </ul>
    </section>
  );
}

export function Sources({ lang, sources }: { lang: Locale; sources: RouteResult["sources"] }) {
  if (!sources.length) return null;
  return (
    <section className="stack" aria-labelledby="src">
      <h2 id="src">{t(lang, "ui.route.sources")}</h2>
      <ul className="stack" role="list">
        {sources.map((s) => (
          <li key={`${s.platform_id}:${s.url}`}>
            <a href={s.url} rel="noopener noreferrer">
              {platformById(s.platform_id)?.name ?? s.platform_id}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

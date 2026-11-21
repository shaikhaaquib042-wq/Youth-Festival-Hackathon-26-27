import { officeById, platformById } from "@raasta/data";
import { buildGmail, buildMailto, buildOutlook } from "@raasta/docs-gen";
import { t, type Locale } from "@raasta/i18n";
import type { ForumOption, IntakeSlots, SubmissionMode } from "@raasta/rules/types";
import { draftText, fillTemplate, safeHttps, telHref, templateValues } from "../../lib/draft";
import { msg } from "../text";

export interface ActionCtx {
  lang: Locale;
  token: string;
  slots: IntakeSlots;
  title: string;
  demo: boolean;
}

function Copy({ lang }: { lang: Locale }) {
  return (
    <button type="button" className="btn btn-ghost" data-copy hidden>
      {t(lang, "ui.act.copy")}
    </button>
  );
}

function CopyBox({ lang, id, label, value, rows = 3 }: { lang: Locale; id: string; label: string; value: string; rows?: number }) {
  return (
    <div className="field">
      <label for={id}>{label}</label>
      <textarea id={id} readonly rows={rows}>
        {value}
      </textarea>
      <Copy lang={lang} />
    </div>
  );
}

const DIGIT_CODES: Array<[string, string]> = [["StreetLightNotWorking", "Streetlight not working"]];

function Api({ ctx, mode }: { ctx: ActionCtx; mode: Extract<SubmissionMode, { kind: "api" }> }) {
  const { lang } = ctx;
  const draft = draftText(ctx.slots, ctx.title);
  return (
    <form className="stack" method="post" action="/r/submit/digit">
      <input type="hidden" name="t" value={ctx.token} />
      <input type="hidden" name="tenant_check" value={mode.tenantId} />
      <label className="field">
        <span>{t(lang, "ui.act.api_code")}</span>
        <select name="service_code" required>
          {DIGIT_CODES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{t(lang, "ui.act.api_text")}</span>
        <textarea name="description" rows={5} maxlength={1000} required>
          {draft.slice(0, 1000)}
        </textarea>
      </label>
      <p className="text-meta">{ctx.demo ? t(lang, "ui.act.api_note_demo") : t(lang, "ui.act.api_note")}</p>
      <button type="submit" className="btn btn-primary">
        {ctx.demo ? t(lang, "ui.act.api_file_demo") : t(lang, "ui.act.api_file")}
      </button>
    </form>
  );
}

function Email({ ctx, mode, n }: { ctx: ActionCtx; mode: Extract<SubmissionMode, { kind: "email" }>; n: string }) {
  const { lang } = ctx;
  const subject = msg("en", mode.subjectKey) === mode.subjectKey ? ctx.title : msg("en", mode.subjectKey);
  const body = draftText(ctx.slots, ctx.title);
  const args = { to: mode.to, cc: mode.cc, subject, body };
  const mailto = buildMailto(args);
  const gmail = buildGmail(args);
  const outlook = buildOutlook(args);
  return (
    <div className="stack">
      <p>
        <strong>{mode.to}</strong>
        {mode.cc ? <span className="text-meta"> cc {mode.cc}</span> : null}
      </p>
      <div className="cluster">
        <a className="btn btn-secondary" href={mailto.url}>
          {t(lang, "ui.act.email_open")}
        </a>
        <a className="btn btn-secondary" href={gmail.url} target="_blank" rel="noopener noreferrer">
          {t(lang, "ui.act.gmail")}
        </a>
        <a className="btn btn-secondary" href={outlook.url} target="_blank" rel="noopener noreferrer">
          {t(lang, "ui.act.outlook")}
        </a>
      </div>
      {mailto.trimmed ? <p className="notice">{t(lang, "ui.act.email_trimmed")}</p> : null}
      <details>
        <summary>{t(lang, "ui.act.email_copy")}</summary>
        <div className="stack">
          <CopyBox lang={lang} id={`em-to-${n}`} label={t(lang, "ui.act.email_to")} value={mode.cc ? `${mode.to}, ${mode.cc}` : mode.to} rows={1} />
          <CopyBox lang={lang} id={`em-su-${n}`} label={t(lang, "ui.act.email_subject")} value={subject} rows={1} />
          <CopyBox lang={lang} id={`em-bo-${n}`} label={t(lang, "ui.act.email_body")} value={body} rows={8} />
        </div>
      </details>
    </div>
  );
}

function Tray({ ctx, n }: { ctx: ActionCtx; n: string }) {
  const { lang, slots } = ctx;
  const fields: Array<[string, string, string]> = [
    ["title", t(lang, "ui.act.tray_title"), ctx.title],
    ["details", t(lang, "ui.act.tray_details"), draftText(slots, ctx.title)],
  ];
  if (slots.amount_inr !== undefined) fields.push(["amount", t(lang, "ui.act.tray_amount"), String(slots.amount_inr)]);
  const place = [slots.city, slots.district].filter(Boolean).join(", ");
  if (place) fields.push(["place", t(lang, "ui.act.tray_place"), place]);
  return (
    <div className="stack copy-tray">
      <p className="text-meta">{t(lang, "ui.act.tray_note")}</p>
      {fields.map(([k, label, value]) => (
        <CopyBox key={k} lang={lang} id={`tray-${n}-${k}`} label={label} value={value} rows={k === "details" ? 8 : 1} />
      ))}
    </div>
  );
}

function Mode({ ctx, option, mode, n }: { ctx: ActionCtx; option: ForumOption; mode: SubmissionMode; n: string }) {
  const { lang, token, slots } = ctx;
  const draft = draftText(slots, ctx.title);
  switch (mode.kind) {
    case "api":
      return <Api ctx={ctx} mode={mode} />;
    case "prefill_url": {
      const url = safeHttps(fillTemplate(mode.template, templateValues(slots, draft)));
      if (!url) return null;
      return (
        <div className="stack">
          <a className="btn btn-secondary" href={url} target="_blank" rel="noopener noreferrer">
            {t(lang, "ui.act.prefill")}
          </a>
          <p className="text-meta">{t(lang, "ui.act.prefill_note")}</p>
        </div>
      );
    }
    case "whatsapp": {
      const url = safeHttps(fillTemplate(mode.template, templateValues(slots, draft)), "wa.me");
      if (!url) return null;
      return (
        <div className="stack">
          <a className="btn btn-secondary" href={url} target="_blank" rel="noopener noreferrer">
            {t(lang, "ui.act.whatsapp")}
          </a>
          <p className="text-meta">{t(lang, "ui.act.whatsapp_note")}</p>
        </div>
      );
    }
    case "email":
      return <Email ctx={ctx} mode={mode} n={n} />;
    case "post":
      return (
        <div className="stack">
          <a className="btn btn-secondary" href={`/r/label?t=${encodeURIComponent(token)}&office=${encodeURIComponent(mode.addressRef)}`}>
            {t(lang, "ui.act.post")}
          </a>
          <p className="text-meta">{t(lang, "ui.act.post_note")}</p>
        </div>
      );
    case "phone":
      return (
        <p>
          <a className="btn btn-secondary" href={telHref(mode.number)}>
            {t(lang, "ui.route.call")} {mode.number}
          </a>
        </p>
      );
    case "in_person": {
      const o = officeById(mode.officeRef);
      if (!o) return null;
      return (
        <div className="office-card stack">
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
            <a className="btn btn-secondary" href={`/r/directions?to=${encodeURIComponent(o.id)}&t=${encodeURIComponent(token)}`}>
              {t(lang, "ui.act.get_there")}
            </a>
          </p>
        </div>
      );
    }
    case "autofill_helper":
      return <Tray ctx={ctx} n={n} />;
    case "guide":
      return (
        <div className="stack">
          <a className="btn btn-secondary" href={`/r/guide/${encodeURIComponent(option.platform_id)}?t=${encodeURIComponent(token)}`}>
            {t(lang, "ui.act.guide")}
          </a>
          <p className="text-meta">{t(lang, "ui.act.guide_note")}</p>
        </div>
      );
  }
}

const KIND_LABEL: Record<SubmissionMode["kind"], string> = {
  api: "ui.act.k_api",
  prefill_url: "ui.act.k_prefill",
  whatsapp: "ui.act.k_whatsapp",
  email: "ui.act.k_email",
  post: "ui.act.k_post",
  phone: "ui.act.k_phone",
  in_person: "ui.act.k_visit",
  autofill_helper: "ui.act.k_tray",
  guide: "ui.act.k_guide",
};

/** One ForumOption: why, fee, SLA, then every submission mode best-first with truthful labels. */
export function Door({ ctx, option, heading, level, idx }: { ctx: ActionCtx; option: ForumOption; heading: string; level: 2 | 3; idx: number }) {
  const { lang } = ctx;
  const platform = platformById(option.platform_id);
  const name = platform?.name ?? option.platform_id;
  const portal = (() => {
    const home = (platform?.urls as Record<string, unknown> | undefined)?.home;
    return typeof home === "string" ? safeHttps(home) : undefined;
  })();
  const H = level === 2 ? "h2" : "h3";
  const blocked = !!option.blocked_reason_key;
  const showName = heading !== name;
  return (
    <section className={blocked ? "card stack is-blocked" : "card stack"} aria-label={heading} aria-disabled={blocked ? "true" : undefined}>
      <H>{heading}</H>
      {showName ? (
        <p>
          <strong>{name}</strong>
        </p>
      ) : null}
      <p>{msg(lang, option.why_key)}</p>
      <p>
        {t(lang, "ui.route.fee")}: {option.fee}
      </p>
      <p>
        {t(lang, "ui.route.sla")}: {option.sla}
      </p>
      {blocked ? (
        <p className="notice">
          <strong>{t(lang, "ui.act.blocked")}.</strong> {msg(lang, option.blocked_reason_key as string)}
        </p>
      ) : null}
      <div className="stack action-centre">
        <h3 className="act-h">{t(lang, "ui.act.heading")}</h3>
        {!blocked ? <p className="text-meta">{t(lang, "ui.act.drafted_note")}</p> : null}
        <ol className="mode-list" role="list">
          {option.submission
            .filter((m) => !blocked || m.kind === "guide")
            .map((m, i) => (
              <li key={`${m.kind}-${i}`} className="mode">
                <p className="mode-label">
                  <strong>{t(lang, KIND_LABEL[m.kind])}</strong>
                  {i === 0 && !blocked ? <span className="text-meta"> {t(lang, "ui.act.best")}</span> : null}
                </p>
                <Mode ctx={ctx} option={option} mode={m} n={`${idx}-${i}`} />
              </li>
            ))}
        </ol>
        {portal && !blocked ? (
          <p>
            <a className="btn btn-ghost" href={portal} target="_blank" rel="noopener noreferrer">
              {t(lang, "ui.route.open_portal")}
            </a>
          </p>
        ) : null}
      </div>
    </section>
  );
}

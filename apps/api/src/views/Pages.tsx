import type { Dispute } from "@raasta/data";
import { t, type Locale } from "@raasta/i18n";
import { answerField } from "../lib/flow";
import { Layout } from "./Layout";

type Question = Dispute["questions"][number];

/** Unit shown beside a number box, worked out from the question wording. */
function unitFor(q: Question): { pre?: string; post?: string } {
  const l = q.label_en.toLowerCase();
  if (q.slot === "amount_inr" || /amount|inr|rs\b|rupee|salary|deposit|income/.test(l)) return { pre: "₹" };
  if (/days?\b/.test(l)) return { post: "days" };
  if (/months?\b/.test(l)) return { post: "months" };
  return {};
}

function Option({ name, value, label, checked, hint }: { name: string; value: string; label: string; checked: boolean; hint?: string }) {
  return (
    <label className="opt">
      <input className="opt-input" type="radio" name={name} value={value} checked={checked} />
      <span className="opt-face">
        <span className="opt-dot" aria-hidden="true"></span>
        <span className="opt-text">{label}</span>
        {hint ? <span className="opt-hint">{hint}</span> : null}
      </span>
    </label>
  );
}

/**
 * One guided question as a form control. `big` renders it as the page question (legend styled as the heading).
 * Yes/no and short option lists become tappable cards; everything works without JavaScript.
 */
export function QuestionField({ lang, q, value, big }: { lang: Locale; q: Question; value?: string; big?: boolean }) {
  const name = answerField(q.id);
  const id = `q-${q.id}`;
  const labelCls = big ? "q-title" : "q-label";
  if (q.type === "boolean") {
    return (
      <fieldset className="q">
        <legend className={labelCls}>{q.label_en}</legend>
        <div className="opts opts-3">
          <Option name={name} value="yes" label={t(lang, "ui.flow.yes")} checked={value === "yes"} />
          <Option name={name} value="no" label={t(lang, "ui.flow.no")} checked={value === "no"} />
          <Option name={name} value="" label={t(lang, "ui.flow.notsure")} checked={!value} />
        </div>
      </fieldset>
    );
  }
  if (q.type === "select" && (q.options?.length ?? 0) <= 8) {
    return (
      <fieldset className="q">
        <legend className={labelCls}>{q.label_en}</legend>
        <div className="opts">
          {(q.options ?? []).map((o) => (
            <Option key={o.value} name={name} value={o.value} label={o.label_en} checked={value === o.value} />
          ))}
          <Option name={name} value="" label={t(lang, "ui.flow.notsure")} checked={!value} />
        </div>
      </fieldset>
    );
  }
  if (q.type === "select") {
    return (
      <div className="q field">
        <label className={labelCls} for={id}>
          {q.label_en}
        </label>
        <select id={id} name={name}>
          <option value="">{t(lang, "ui.flow.notsure")}</option>
          {(q.options ?? []).map((o) => (
            <option key={o.value} value={o.value} selected={value === o.value}>
              {o.label_en}
            </option>
          ))}
        </select>
      </div>
    );
  }
  const type = q.type === "number" ? "number" : q.type === "date" ? "date" : "text";
  const unit = q.type === "number" ? unitFor(q) : {};
  return (
    <div className="q field">
      <label className={labelCls} for={id}>
        {q.label_en}
      </label>
      <div className={`q-input${unit.pre ? " has-pre" : ""}${unit.post ? " has-post" : ""}`}>
        {unit.pre ? (
          <span className="q-pre" aria-hidden="true">
            {unit.pre}
          </span>
        ) : null}
        <input
          id={id}
          type={type}
          name={name}
          value={value ?? ""}
          {...(q.type === "number" ? { inputmode: "numeric", min: "0", step: "any" } : {})}
          {...(q.type === "text" ? { maxlength: 200 } : {})}
        />
        {unit.post ? <span className="q-post">{unit.post}</span> : null}
      </div>
    </div>
  );
}

function Progress({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="q-progress">
      <ol className="q-dots" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <li className={i + 1 < step ? "done" : i + 1 === step ? "now" : ""}></li>
        ))}
      </ol>
      <p className="q-meta">{label}</p>
    </div>
  );
}

export function AskPage({ lang, error }: { lang: Locale; error?: boolean }) {
  return (
    <Layout lang={lang} title={`${t(lang, "ui.ask.page_h1")} | Raasta`} path="/r/ask" noindex>
      <div className="q-stage">
        <div className="q-card">
          <h1 className="q-title">{t(lang, "ui.ask.page_h1")}</h1>
          {error ? <p className="q-error">{t(lang, "ui.ask.empty")}</p> : null}
          <form method="post" action="/r/ask">
            <label className="sr-only" for="ask-text">
              {t(lang, "ui.home.prompt_label")}
            </label>
            <textarea id="ask-text" className="q-textarea" name="text" rows={5} maxlength={1000} required placeholder={t(lang, "ui.home.placeholder")}></textarea>
            <p className="q-skip">{t(lang, "ui.home.privacy")}</p>
            <div className="q-actions">
              <span></span>
              <button type="submit" className="btn btn-primary">
                {t(lang, "ui.ask.submit")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export function FollowUpPage({ lang, questions, state }: { lang: Locale; questions: Question[]; state: string }) {
  return (
    <Layout lang={lang} title={`${t(lang, "ui.ask.h1")} | Raasta`} path="/r/ask" noindex>
      <div className="q-stage">
        <div className="q-card">
          <h1 className="q-title">{t(lang, "ui.ask.h1")}</h1>
          <p className="q-lead">{t(lang, "ui.ask.lead")}</p>
          <form method="post" action="/r/ask">
            <input type="hidden" name="st" value={state} />
            <div className="q-list">
              {questions.map((q) => (
                <QuestionField key={q.id} lang={lang} q={q} />
              ))}
            </div>
            <div className="q-actions">
              <span></span>
              <button type="submit" className="btn btn-primary">
                {t(lang, "ui.ask.submit")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export interface FlowStepProps {
  lang: Locale;
  dispute: Dispute;
  /** 1-based index of the question on screen. */
  step: number;
  answers: Record<string, string>;
}

export function FlowStepPage({ lang, dispute, step, answers }: FlowStepProps) {
  const total = dispute.questions.length;
  const q = dispute.questions[step - 1] as Question;
  const last = step === total;
  const title = t(lang, `dispute.${dispute.id}.title`);
  return (
    <Layout lang={lang} title={`${title} | Raasta`} path={`/r/flow/${dispute.id}/${step}`} noindex>
      <div className="q-stage">
        <div className="q-card">
          <Progress step={step} total={total} label={`${title}, ${t(lang, "ui.flow.step", { n: step, total })}`} />
          <form method="post" action={`/r/flow/${dispute.id}/${step}`}>
            {dispute.questions
              .filter((o) => o.id !== q.id && answers[o.id] !== undefined && answers[o.id] !== "")
              .map((o) => (
                <input key={o.id} type="hidden" name={answerField(o.id)} value={answers[o.id]} />
              ))}
            <QuestionField lang={lang} q={q} value={answers[q.id]} big />
            <p className="q-skip">{t(lang, "ui.flow.optional")}</p>
            <div className="q-actions">
              {step > 1 ? (
                <button type="submit" name="_nav" value="back" formnovalidate className="btn btn-ghost">
                  {t(lang, "ui.flow.back")}
                </button>
              ) : (
                <a className="btn btn-ghost" href="/help">
                  {t(lang, "ui.flow.back")}
                </a>
              )}
              <button type="submit" className="btn btn-primary">
                {last ? t(lang, "ui.flow.finish") : t(lang, "ui.flow.next")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export function MessagePage({ lang, title, body, path = "/", backHref }: { lang: Locale; title: string; body: string; path?: string; backHref?: string }) {
  return (
    <Layout lang={lang} title={`${title} | Raasta`} path={path} noindex>
      <div className="q-stage">
        <div className="q-card q-card-center">
          <h1 className="q-title">{title}</h1>
          <p className="q-lead">{body}</p>
          <p>
            <a className="btn btn-primary" href={backHref ?? "/"}>
              {backHref ? t(lang, "ui.error.back") : t(lang, "ui.thanks.home")}
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
}

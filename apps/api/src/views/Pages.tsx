import type { Dispute } from "@raasta/data";
import { t, type Locale } from "@raasta/i18n";
import { answerField } from "../lib/flow";
import { Layout } from "./Layout";

type Question = Dispute["questions"][number];

/** One guided question as a form control. Labels come from disputes.json (English), localised through dispute keys when present. */
export function QuestionField({ lang, q, value }: { lang: Locale; q: Question; value?: string }) {
  const name = answerField(q.id);
  const label = q.label_en;
  if (q.type === "boolean") {
    return (
      <fieldset className="field">
        <legend>{label}</legend>
        <label>
          <input type="radio" name={name} value="yes" checked={value === "yes"} /> {t(lang, "ui.flow.yes")}
        </label>{" "}
        <label>
          <input type="radio" name={name} value="no" checked={value === "no"} /> {t(lang, "ui.flow.no")}
        </label>{" "}
        <label>
          <input type="radio" name={name} value="" checked={!value} /> {t(lang, "ui.flow.notsure")}
        </label>
      </fieldset>
    );
  }
  if (q.type === "select") {
    return (
      <label className="field">
        <span>{label}</span>
        <select name={name}>
          <option value="">{t(lang, "ui.flow.notsure")}</option>
          {(q.options ?? []).map((o) => (
            <option key={o.value} value={o.value} selected={value === o.value}>
              {o.label_en}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const type = q.type === "number" ? "number" : q.type === "date" ? "date" : "text";
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        name={name}
        value={value ?? ""}
        {...(q.type === "number" ? { inputmode: "numeric", min: "0", step: "any" } : {})}
        {...(q.type === "text" ? { maxlength: 200 } : {})}
      />
    </label>
  );
}

export function AskPage({ lang, error }: { lang: Locale; error?: boolean }) {
  return (
    <Layout lang={lang} title={`${t(lang, "ui.ask.page_h1")} | Raasta`} path="/r/ask" noindex>
      <div className="container stack">
        <h1>{t(lang, "ui.ask.page_h1")}</h1>
        {error ? <p className="alert field-error">{t(lang, "ui.ask.empty")}</p> : null}
        <form className="stack" method="post" action="/r/ask">
          <label className="field">
            <span>{t(lang, "ui.home.prompt_label")}</span>
            <textarea name="text" rows={5} maxlength={1000} required placeholder={t(lang, "ui.home.placeholder")}></textarea>
          </label>
          <p className="text-meta">{t(lang, "ui.home.privacy")}</p>
          <button type="submit" className="btn btn-primary">
            {t(lang, "ui.ask.submit")}
          </button>
        </form>
      </div>
    </Layout>
  );
}

export function FollowUpPage({ lang, questions, state }: { lang: Locale; questions: Question[]; state: string }) {
  return (
    <Layout lang={lang} title={`${t(lang, "ui.ask.h1")} | Raasta`} path="/r/ask" noindex>
      <div className="container stack">
        <h1>{t(lang, "ui.ask.h1")}</h1>
        <p>{t(lang, "ui.ask.lead")}</p>
        <form className="stack" method="post" action="/r/ask">
          <input type="hidden" name="st" value={state} />
          {questions.map((q) => (
            <QuestionField key={q.id} lang={lang} q={q} />
          ))}
          <button type="submit" className="btn btn-primary">
            {t(lang, "ui.ask.submit")}
          </button>
        </form>
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
      <div className="container stack">
        <p className="text-meta">{t(lang, "ui.flow.step", { n: step, total })}</p>
        <h1>{title}</h1>
        <form className="stack" method="post" action={`/r/flow/${dispute.id}/${step}`}>
          {dispute.questions
            .filter((o) => o.id !== q.id && answers[o.id] !== undefined && answers[o.id] !== "")
            .map((o) => (
              <input key={o.id} type="hidden" name={answerField(o.id)} value={answers[o.id]} />
            ))}
          <QuestionField lang={lang} q={q} value={answers[q.id]} />
          <p className="text-meta">{t(lang, "ui.flow.optional")}</p>
          <div className="cluster">
            {step > 1 ? (
              <button type="submit" name="_nav" value="back" formnovalidate className="btn btn-ghost">
                {t(lang, "ui.flow.back")}
              </button>
            ) : null}
            <button type="submit" className="btn btn-primary">
              {last ? t(lang, "ui.flow.finish") : t(lang, "ui.flow.next")}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export function MessagePage({ lang, title, body, path = "/", backHref }: { lang: Locale; title: string; body: string; path?: string; backHref?: string }) {
  return (
    <Layout lang={lang} title={`${title} | Raasta`} path={path} noindex>
      <div className="container stack">
        <h1>{title}</h1>
        <p>{body}</p>
        <p>
          <a className="btn btn-primary" href={backHref ?? "/"}>
            {backHref ? t(lang, "ui.error.back") : t(lang, "ui.thanks.home")}
          </a>
        </p>
      </div>
    </Layout>
  );
}

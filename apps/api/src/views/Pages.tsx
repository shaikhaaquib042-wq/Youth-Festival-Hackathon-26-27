import type { Dispute } from "@raasta/data";
import { t, type Locale } from "@raasta/i18n";
import { answerField } from "../lib/flow";
import { Layout } from "./Layout";

type Question = Dispute["questions"][number];

/** Unit shown beside a number box, worked out from the question wording. */
function unitFor(lang: Locale, q: Question): { pre?: string; post?: string } {
  const l = q.label_en.toLowerCase();
  if (q.slot === "amount_inr" || /amount|inr|rs\b|rupee|salary|deposit|income/.test(l)) return { pre: "₹" };
  if (/days?\b/.test(l)) return { post: tr(lang, "ui.unit.days", "days") };
  if (/months?\b/.test(l)) return { post: tr(lang, "ui.unit.months", "months") };
  return {};
}

/** An answer option that already means "I do not know". */
export const isUnsure = (o: { value: string; label_en: string }) => o.value === "unknown" || /(not sure|don.?t know|unknown|unsure)/i.test(o.label_en);

/** Translation with an English fallback taken from the data file. */
function tr(lang: Locale, key: string, en: string): string {
  const s = t(lang, key);
  return s === key ? en : s;
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
export function QuestionField({ lang, q, value, big, dispute }: { lang: Locale; q: Question; value?: string; big?: boolean; dispute?: string }) {
  const name = answerField(q.id);
  const key = `q.${dispute ?? "any"}.${q.id}`;
  const label = dispute ? tr(lang, key, q.label_en) : q.label_en;
  const opt = (o: { value: string; label_en: string }) => (dispute ? tr(lang, `${key}.${o.value}`, o.label_en) : o.label_en);
  const id = `q-${q.id}`;
  const labelCls = big ? "q-title" : "q-label";
  if (q.type === "boolean") {
    return (
      <fieldset className="q">
        <legend className={labelCls}>{label}</legend>
        <div className="opts opts-3">
          <Option name={name} value="yes" label={t(lang, "ui.flow.yes")} checked={value === "yes"} />
          <Option name={name} value="no" label={t(lang, "ui.flow.no")} checked={value === "no"} />
          <Option name={name} value="" label={t(lang, "ui.flow.notsure")} checked={!value} />
        </div>
      </fieldset>
    );
  }
  // Some questions already offer their own "Not sure"; never add a second one.
  const ownUnsure = (q.options ?? []).find((o) => isUnsure(o));
  if (q.type === "select" && (q.options?.length ?? 0) <= 8) {
    return (
      <fieldset className="q">
        <legend className={labelCls}>{label}</legend>
        <div className="opts">
          {(q.options ?? []).map((o) => (
            <Option key={o.value} name={name} value={o.value} label={opt(o)} checked={value === o.value || (!value && o === ownUnsure)} />
          ))}
          {ownUnsure ? null : <Option name={name} value="" label={t(lang, "ui.flow.notsure")} checked={!value} />}
        </div>
      </fieldset>
    );
  }
  if (q.type === "select") {
    return (
      <div className="q field">
        <label className={labelCls} for={id}>
          {label}
        </label>
        <select id={id} name={name}>
          {ownUnsure ? null : <option value="">{t(lang, "ui.flow.notsure")}</option>}
          {(q.options ?? []).map((o) => (
            <option key={o.value} value={o.value} selected={value === o.value}>
              {opt(o)}
            </option>
          ))}
        </select>
      </div>
    );
  }
  const type = q.type === "number" ? "number" : q.type === "date" ? "date" : "text";
  const unit = q.type === "number" ? unitFor(lang, q) : {};
  return (
    <div className="q field">
      <label className={labelCls} for={id}>
        {label}
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

export function FollowUpPage({ lang, questions, state, dispute }: { lang: Locale; questions: Question[]; state: string; dispute?: string }) {
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
                <QuestionField key={q.id} lang={lang} q={q} dispute={dispute} />
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
  /** position among the questions that will actually be asked, and their count */
  n?: number;
  total?: number;
  last?: boolean;
}

export function FlowStepPage({ lang, dispute, step, answers, n, total: totalIn, last: lastIn }: FlowStepProps) {
  const total = totalIn ?? dispute.questions.length;
  const q = dispute.questions[step - 1] as Question;
  const last = lastIn ?? step === total;
  const pos = n ?? step;
  const askPlace = q.slot === "city" || q.slot === "district";
  const title = t(lang, `dispute.${dispute.id}.title`);
  return (
    <Layout lang={lang} title={`${title} | Raasta`} path={`/r/flow/${dispute.id}/${step}`} noindex>
      <div className="q-stage">
        <div className="q-card">
          <Progress step={pos} total={total} label={`${title}, ${t(lang, "ui.flow.step", { n: pos, total })}`} />
          <form method="post" action={`/r/flow/${dispute.id}/${step}`}>
            {dispute.questions
              .filter((o) => o.id !== q.id && answers[o.id] !== undefined && answers[o.id] !== "")
              .map((o) => (
                <input key={o.id} type="hidden" name={answerField(o.id)} value={answers[o.id]} />
              ))}
            <div data-loc-city={askPlace ? "" : undefined}>
              <QuestionField lang={lang} q={q} value={answers[q.id]} big dispute={dispute.id} />
            </div>
            {askPlace ? (
              <p>
                <button type="button" className="btn btn-secondary" data-locate hidden data-msg-busy={t(lang, "ui.location.busy")} data-msg-denied={t(lang, "ui.location.denied")} data-msg-fail={t(lang, "ui.location.fail")}>
                  {t(lang, "ui.place.gps")}
                </button>
                <span className="text-meta" data-locate-status aria-live="polite"></span>
              </p>
            ) : null}
            <p className="q-skip">{t(lang, "ui.flow.optional")}</p>
            <div className="q-actions">
              {pos > 1 ? (
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

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Plain-language assistant about one route. Each question is a normal form post, so it works on any phone. */
export function ChatPage({ lang, token, title, turns, available, error }: { lang: Locale; token?: string; title?: string; turns: ChatTurn[]; available: boolean; error?: boolean }) {
  const suggestions = ["ui.chat.s1", "ui.chat.s2", "ui.chat.s3"];
  const full = turns.length >= 12;
  return (
    <Layout lang={lang} title={`${t(lang, "ui.chat.h1")} | Raasta`} path="/r/chat" query={token ? `t=${encodeURIComponent(token)}` : undefined} noindex>
      <div className="q-stage">
        <div className="q-card q-card-wide chat">
          <h1 className="q-title">{t(lang, "ui.chat.h1")}</h1>
          {title ? <p className="q-lead">{t(lang, "ui.chat.about", { title })}</p> : null}
          <ol className="chat-log" role="list" aria-live="polite">
            <li className="bubble bubble-ai">{t(lang, "ui.chat.hello")}</li>
            {turns.map((m, i) => (
              <li key={i} className={m.role === "user" ? "bubble bubble-me" : "bubble bubble-ai"}>
                {m.content}
              </li>
            ))}
            {error ? <li className="bubble bubble-ai bubble-err">{t(lang, "ui.chat.error")}</li> : null}
          </ol>
          {!available ? (
            <p className="q-error">{t(lang, "ui.chat.unavailable")}</p>
          ) : full ? (
            <p className="q-skip">{t(lang, "ui.chat.full")}</p>
          ) : (
            <form method="post" action="/r/chat" className="chat-form">
              {token ? <input type="hidden" name="t" value={token} /> : null}
              {turns.map((m, i) => (
                <input key={i} type="hidden" name={m.role === "user" ? "hu" : "ha"} value={`${i}:${m.content}`} />
              ))}
              {turns.length === 0 ? (
                <div className="chat-suggest" role="group" aria-label={t(lang, "ui.chat.suggested")}>
                  {suggestions.map((k) => (
                    <button key={k} type="submit" name="q" value={t(lang, k)} className="chip ask-chip">
                      {t(lang, k)}
                    </button>
                  ))}
                </div>
              ) : null}
              <label className="sr-only" for="chat-q">
                {t(lang, "ui.chat.label")}
              </label>
              <div className="chat-input">
                <textarea id="chat-q" name="q" rows={2} maxlength={600} placeholder={t(lang, "ui.chat.placeholder")}></textarea>
                <button type="submit" className="btn btn-primary">
                  {t(lang, "ui.chat.send")}
                </button>
              </div>
              <p className="q-skip">{t(lang, "ui.chat.note")}</p>
            </form>
          )}
          {token ? (
            <p>
              <a href={`/r/route/${token}`}>{t(lang, "ui.chat.back")}</a>
            </p>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}

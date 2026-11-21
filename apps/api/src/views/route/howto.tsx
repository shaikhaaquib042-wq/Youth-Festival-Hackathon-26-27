import { howtoFor, platformById, stateByCode, type HowToStep } from "@raasta/data";
import { t, type Locale } from "@raasta/i18n";
import type { GeoContext } from "@raasta/rules/types";
import { safeHttps, telHref } from "../../lib/draft";

/** What a guide needs to turn link references (packages/data/src/howto.json) into real links. */
export interface HowToCtx {
  lang: Locale;
  token?: string;
  geo?: GeoContext;
  /** docs-gen template id for "Make the letter" links */
  letter?: string;
}

type Kind = "web" | "call" | "wa" | "app";
interface Resolved {
  href: string;
  kind: Kind;
  label: string;
}

const lower = (s?: string) => (s ?? "").trim().toLowerCase();
const firstNumber = (v: unknown): string | undefined => {
  const s = Array.isArray(v) ? v.find((x) => typeof x === "string") : v;
  if (typeof s !== "string") return undefined;
  const m = /\+?\d[\d -]{1,}\d/.exec(s);
  return m ? m[0].trim() : undefined;
};

interface Metro {
  city: string;
  urls?: Record<string, string>;
  helpline?: string[];
  whatsapp?: string;
}
const PORTAL_KEYS = ["grievance_portal", "register_complaint", "complaint_portal", "mcd_portal", "sahaaya_app", "home", "property_tax_grievance"];

function metroFor(geo?: GeoContext): Metro | undefined {
  const metros = (platformById("major_metro_municipal_portals") as { metros?: Metro[] } | undefined)?.metros ?? [];
  const city = lower(geo?.city);
  if (!city) return undefined;
  const alias = city === "bangalore" ? "bengaluru" : city === "bombay" ? "mumbai" : city === "madras" ? "chennai" : city === "new delhi" ? "delhi" : city;
  return metros.find((m) => lower(m.city) === alias);
}

const localPath = (lang: Locale, p: string) => (lang === "en" ? p : `/${lang}${p}`);

function resolve(step: HowToStep, scope: "first" | "platform", id: string, ctx: HowToCtx): Resolved | null | undefined {
  if (!step.link) return undefined;
  const [kind, ...parts] = step.link.split(":");
  const rest = parts.join(":");
  const q = ctx.token ? `t=${encodeURIComponent(ctx.token)}` : "";
  const metro = metroFor(ctx.geo);
  const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
  const label = (vars: Record<string, string> = {}) => fill(step.label ?? "", { city: metro?.city ?? ctx.geo?.city ?? "", ...vars });
  switch (kind) {
    case "url": {
      const [pid, key] = rest.includes(".") ? (rest.split(".") as [string, string]) : [id, rest];
      const raw = (platformById(pid)?.urls as Record<string, unknown> | undefined)?.[key];
      const href = typeof raw === "string" ? safeHttps(raw) : undefined;
      return href ? { href, kind: "web", label: label() } : null;
    }
    case "tel":
      return { href: telHref(rest), kind: "call", label: label() };
    case "wa": {
      const n = firstNumber((platformById(rest)?.contact_channels as Record<string, unknown> | undefined)?.whatsapp);
      return n ? { href: `https://wa.me/${n.replace(/[^\d]/g, "")}`, kind: "wa", label: label() } : null;
    }
    case "metro": {
      if (!metro) return null;
      if (rest === "portal") {
        const key = PORTAL_KEYS.find((k) => metro.urls?.[k]);
        const href = key ? safeHttps(metro.urls![key]!) : undefined;
        return href ? { href, kind: "web", label: label() } : null;
      }
      if (rest === "tel") {
        const n = firstNumber(metro.helpline);
        return n ? { href: telHref(n), kind: "call", label: label({ phone: n }) } : null;
      }
      const n = firstNumber(metro.whatsapp);
      return n ? { href: `https://wa.me/${n.replace(/[^\d]/g, "")}`, kind: "wa", label: label() } : null;
    }
    case "state": {
      const st = ctx.geo?.state_code ? stateByCode(ctx.geo.state_code) : undefined;
      const fallback = rest === "slsa" ? (platformById("nalsa_mslsa_dlsa")?.urls as Record<string, string>)?.nalsa_slsa_directory : (platformById("cpgrams")?.urls as Record<string, string>)?.home;
      // Maharashtra has its own legal services site in the registry; other states use the NALSA directory.
      const mslsa = st?.code === "MH" ? (platformById("nalsa_mslsa_dlsa")?.urls as Record<string, string>)?.mslsa_home : undefined;
      const href = safeHttps((rest === "slsa" ? mslsa ?? st?.slsa?.url : st?.grievance_portal?.url) ?? fallback ?? "");
      return href ? { href, kind: "web", label: label() } : null;
    }
    case "app": {
      if (rest === "letter") return ctx.letter ? { href: `/r/doc/${encodeURIComponent(ctx.letter)}${q ? `?${q}` : ""}`, kind: "app", label: label() } : null;
      if (rest.startsWith("doc:")) return { href: `/r/doc/${encodeURIComponent(rest.slice(4))}${q ? `?${q}` : ""}`, kind: "app", label: label() };
      if (rest === "label") return ctx.token ? { href: `/r/label?${q}`, kind: "app", label: label() } : null;
      if (rest === "chat") return ctx.token ? { href: `/r/chat?${q}`, kind: "app", label: label() } : null;
      if (rest === "legal-aid") return { href: localPath(ctx.lang, "/legal-aid"), kind: "app", label: label() };
      if (rest === "emergency") return { href: localPath(ctx.lang, "/emergency"), kind: "app", label: label() };
      if (rest.startsWith("offices")) {
        const p = new URLSearchParams();
        const type = rest.split(":")[1];
        if (type) p.set("type", type);
        if (ctx.geo?.state_code) p.set("state", ctx.geo.state_code);
        if (ctx.geo?.city) p.set("city", ctx.geo.city);
        return { href: `/r/offices?${p.toString()}`, kind: "app", label: label() };
      }
      return null;
    }
  }
  return null;
}

function applies(step: HowToStep, geo?: GeoContext): boolean {
  const st = geo?.state_code?.toUpperCase();
  if (step.states && (!st || !step.states.includes(st))) return false;
  if (step.not_states && st && step.not_states.includes(st)) return false;
  if (step.cities && !step.cities.some((c) => lower(c) === lower(geo?.city))) return false;
  return true;
}

export interface ShownStep {
  text: string;
  link?: Resolved;
}

/** Steps that apply here, with links resolved. A step whose in-app or city link cannot be made is dropped. */
export function howtoSteps(scope: "first" | "platform", id: string, ctx: HowToCtx): ShownStep[] {
  const out: ShownStep[] = [];
  howtoFor(scope, id).forEach((s, i) => {
    if (!applies(s, ctx.geo)) return;
    const link = resolve(s, scope, id, ctx);
    if (link === null && /^(app|metro):/.test(s.link ?? "")) return;
    const key = `howto.${scope}.${id}.${i}`;
    const tr = t(ctx.lang, key);
    const text = tr === key ? s.t : tr;
    if (link) {
      const lk = `${key}.l`;
      const tl = t(ctx.lang, lk, { city: ctx.geo?.city ?? "", phone: "" });
      if (tl !== lk && !/\{phone\}/.test(s.label ?? "")) link.label = tl;
    }
    out.push(link ? { text, link } : { text });
  });
  return out;
}

const ICON: Record<Kind, string> = {
  web: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  call: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z",
  wa: "M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.4A8.4 8.4 0 1 1 21 11.5z",
  app: "M9 18l6-6-6-6",
};

export function StepLink({ link }: { link: Resolved }) {
  const external = link.kind === "web" || link.kind === "wa";
  return (
    <a className={`howto-link is-${link.kind}`} href={link.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d={ICON[link.kind]} />
      </svg>
      <span>{link.label}</span>
    </a>
  );
}

export function StepList({ steps }: { steps: ShownStep[] }) {
  return (
    <ol className="howto-list" role="list">
      {steps.map((s, i) => (
        <li key={i} className="howto-step">
          <span className="howto-n" aria-hidden="true">
            {i + 1}
          </span>
          <div className="howto-body">
            <p>{s.text}</p>
            {s.link ? <StepLink link={s.link} /> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Folding "Show me how, step by step" block. Renders nothing when there is no guide. */
export function HowTo({ ctx, scope, id, open, summary, tip }: { ctx: HowToCtx; scope: "first" | "platform"; id: string; open?: boolean; summary?: string; tip?: string }) {
  const steps = howtoSteps(scope, id, ctx);
  if (!steps.length) return null;
  return (
    <details className="howto" open={open}>
      <summary className="howto-sum">
        <span className="howto-ico" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
          </svg>
        </span>
        <span className="howto-title">{summary ?? t(ctx.lang, "ui.howto.show")}</span>
        <span className="howto-count">{t(ctx.lang, "ui.howto.count", { n: steps.length })}</span>
      </summary>
      <StepList steps={steps} />
      {tip ? <p className="howto-tip">{tip}</p> : null}
    </details>
  );
}

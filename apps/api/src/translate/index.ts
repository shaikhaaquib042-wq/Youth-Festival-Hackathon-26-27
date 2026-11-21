import type { Locale } from "@raasta/i18n";
import type { Env } from "../env";
import { sha256Hex } from "../lib/http";
import { ALL_PROVIDERS } from "../ai/providers";
import { LANG_META } from "@raasta/i18n";

export interface TranslateResult {
  text: string;
  translated: boolean;
  provider?: string;
  cached?: boolean;
}

const TTL = 60 * 60 * 24 * 30;
const TIMEOUT = 15_000;
const DEFAULT_BHASHINI_CONFIG = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline";

// ---------- BHASHINI: config call, then compute call (handbook 1.1) ----------
async function bhashini(env: Env, text: string, source: Locale, target: Locale): Promise<string | undefined> {
  if (!env.BHASHINI_USER_ID || !env.BHASHINI_ULCA_API_KEY || !env.BHASHINI_PIPELINE_ID) return undefined;
  const cfgRes = await fetch(env.BHASHINI_CONFIG_URL || DEFAULT_BHASHINI_CONFIG, {
    method: "POST",
    headers: { "content-type": "application/json", userID: env.BHASHINI_USER_ID, ulcaApiKey: env.BHASHINI_ULCA_API_KEY },
    body: JSON.stringify({
      pipelineTasks: [{ taskType: "translation", config: { language: { sourceLanguage: source, targetLanguage: target } } }],
      pipelineRequestConfig: { pipelineId: env.BHASHINI_PIPELINE_ID },
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!cfgRes.ok) return undefined;
  const cfg = (await cfgRes.json()) as {
    pipelineResponseConfig?: { config?: { serviceId?: string }[] }[];
    pipelineInferenceAPIEndPoint?: { callbackUrl?: string; inferenceApiKey?: { name?: string; value?: string } };
  };
  const serviceId = cfg.pipelineResponseConfig?.[0]?.config?.[0]?.serviceId;
  const callbackUrl = cfg.pipelineInferenceAPIEndPoint?.callbackUrl;
  const key = cfg.pipelineInferenceAPIEndPoint?.inferenceApiKey;
  if (!serviceId || !callbackUrl || !key?.name || !key.value) return undefined;
  const res = await fetch(callbackUrl, {
    method: "POST",
    headers: { "content-type": "application/json", [key.name]: key.value },
    body: JSON.stringify({
      pipelineTasks: [{ taskType: "translation", config: { language: { sourceLanguage: source, targetLanguage: target }, serviceId } }],
      inputData: { input: [{ source: text }] },
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) return undefined;
  const j = (await res.json()) as { pipelineResponse?: { output?: { target?: string }[] }[] };
  return j.pipelineResponse?.[0]?.output?.[0]?.target || undefined;
}

// ---------- Workers AI m2m100 (free, open model) ----------
async function workersM2m(env: Env, text: string, source: Locale, target: Locale): Promise<string | undefined> {
  if (!env.AI) return undefined;
  const out = (await env.AI.run("@cf/meta/m2m100-1.2b" as never, { text, source_lang: source, target_lang: target } as never)) as {
    translated_text?: string;
  };
  return out?.translated_text || undefined;
}

// ---------- Gemini free tier ----------
async function geminiTranslate(env: Env, text: string, source: Locale, target: Locale): Promise<string | undefined> {
  if (!ALL_PROVIDERS.gemini.available(env)) return undefined;
  const r = await ALL_PROVIDERS.gemini.complete(env, {
    system: `Translate the user's text from ${LANG_META[source].english} to ${LANG_META[target].english}. Keep it plain and polite. Keep names of offices, forms and laws recognisable. Return only the translation.`,
    messages: [{ role: "user", content: text }],
    maxTokens: 1200,
  });
  return r.text?.trim() || undefined;
}

// ---------- LibreTranslate (self-hosted, optional) ----------
async function libre(env: Env, text: string, source: Locale, target: Locale): Promise<string | undefined> {
  if (!env.LIBRETRANSLATE_URL) return undefined;
  const res = await fetch(`${env.LIBRETRANSLATE_URL.replace(/\/$/, "")}/translate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: text, source, target, format: "text" }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) return undefined;
  return ((await res.json()) as { translatedText?: string }).translatedText || undefined;
}

const CHAIN: [string, (env: Env, text: string, s: Locale, t: Locale) => Promise<string | undefined>][] = [
  ["bhashini", bhashini],
  ["workers-ai", workersM2m],
  ["gemini", geminiTranslate],
  ["libretranslate", libre],
];

export async function translateText(env: Env, text: string, target: Locale, source: Locale = "en"): Promise<TranslateResult> {
  if (target === source || !text.trim()) return { text, translated: false };
  const key = `tr:${await sha256Hex(`${target}\n${text}`)}`;
  if (env.CACHE) {
    try {
      const hit = await env.CACHE.get(key);
      if (hit) return { text: hit, translated: true, cached: true };
    } catch {
      /* cache is best effort */
    }
  }
  for (const [name, fn] of CHAIN) {
    try {
      const out = await fn(env, text, source, target);
      if (out && out.trim()) {
        if (env.CACHE) {
          try {
            await env.CACHE.put(key, out, { expirationTtl: TTL });
          } catch {
            /* ignore */
          }
        }
        return { text: out, translated: true, provider: name };
      }
    } catch {
      /* try next provider */
    }
  }
  return { text, translated: false };
}

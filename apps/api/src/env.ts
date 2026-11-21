import type { Locale } from "@raasta/i18n";

export interface RateLimiter {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  CACHE?: KVNamespace;
  DB?: D1Database;
  AI?: Ai;
  CHAT_LIMITER?: RateLimiter;
  FORM_LIMITER?: RateLimiter;
  TRANSLATE_LIMITER?: RateLimiter;

  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_MODEL?: string;
  OLLAMA_URL?: string;
  AI_PRIMARY?: string;

  BHASHINI_USER_ID?: string;
  BHASHINI_ULCA_API_KEY?: string;
  BHASHINI_PIPELINE_ID?: string;
  BHASHINI_CONFIG_URL?: string;
  LIBRETRANSLATE_URL?: string;

  DIGIT_BASE_URL?: string;
  DIGIT_TENANT_ID?: string;
  DIGIT_CLIENT_ID?: string;
  DIGIT_CLIENT_SECRET?: string;
  DIGIT_CITIZEN_UI_URL?: string;
  /** "true" forces the demo mock even when DIGIT_BASE_URL is set. */
  DIGIT_SANDBOX?: string;

  NOMINATIM_URL?: string;
  OSM_ROUTING_PROVIDER?: string;
  OSM_ROUTING_API_KEY?: string;
  OSRM_URL?: string;
  OSM_USER_AGENT?: string;
  OVERPASS_URL?: string;

  TURNSTILE_SECRET_KEY?: string;
  ALLOWED_ORIGINS?: string;
  TOKEN_SECRET?: string;
}

export type AppVars = {
  rawBody: string;
  lang: Locale;
};

export type AppEnv = { Bindings: Env; Variables: AppVars };

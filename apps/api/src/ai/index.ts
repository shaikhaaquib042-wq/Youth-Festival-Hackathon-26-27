import type { Env } from "../env";
import { ALL_PROVIDERS, type Provider } from "./providers";
import { AiUnavailableError, type AiResult, type CompleteArgs, type ProviderName } from "./types";

export * from "./types";
export { filterUrls, allowedUrlSet, StreamUrlFilter } from "./filter";

/** Free providers first (plan 4.0.1); Anthropic only when a key exists and always last. */
const FREE_FIRST: ProviderName[] = ["gemini", "workers", "openai", "ollama", "anthropic"];

export function providerOrder(env: Env): Provider[] {
  const available = FREE_FIRST.filter((n) => ALL_PROVIDERS[n].available(env));
  const primary = (env.AI_PRIMARY ?? "").toLowerCase() as ProviderName;
  const ordered = available.includes(primary) ? [primary, ...available.filter((n) => n !== primary)] : available;
  return ordered.map((n) => ALL_PROVIDERS[n]);
}

export function aiAvailable(env: Env): boolean {
  return providerOrder(env).length > 0;
}

/** Tries each configured provider in order. Throws AiUnavailableError when none works. */
export async function complete(env: Env, args: CompleteArgs): Promise<AiResult> {
  for (const p of providerOrder(env)) {
    try {
      const r = await p.complete(env, args);
      if (r.stream || (r.text && r.text.trim())) return r;
    } catch {
      // Move on to the next provider. Never log prompts or bodies.
    }
  }
  throw new AiUnavailableError();
}

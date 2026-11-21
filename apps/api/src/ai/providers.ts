import type { Env } from "../env";
import type { AiResult, CompleteArgs, ProviderName } from "./types";

export interface Provider {
  name: ProviderName;
  available(env: Env): boolean;
  complete(env: Env, args: CompleteArgs): Promise<AiResult>;
}

const TIMEOUT_MS = 25_000;

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<Response> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`provider_http_${res.status}`);
  return res;
}

/** Yields the `data:` payloads of an SSE response. */
async function* sseData(res: Response): AsyncGenerator<string> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
    }
  }
}

// ---------- Gemini (free tier, REST) ----------
const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const gemini: Provider = {
  name: "gemini",
  available: (env) => !!env.GEMINI_API_KEY,
  async complete(env, args) {
    const model = env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
    const body = {
      systemInstruction: { parts: [{ text: args.system }] },
      contents: args.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: {
        maxOutputTokens: args.maxTokens ?? 800,
        temperature: args.schema ? 0 : 0.3,
        ...(args.schema ? { responseMimeType: "application/json" } : {}),
      },
    };
    const headers = { "x-goog-api-key": env.GEMINI_API_KEY as string };
    const pick = (j: unknown): string =>
      ((j as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("");
    if (args.stream) {
      const res = await postJson(`${GEMINI_BASE}/${model}:streamGenerateContent?alt=sse`, headers, body);
      async function* gen() {
        for await (const d of sseData(res)) {
          try {
            const t = pick(JSON.parse(d));
            if (t) yield t;
          } catch {
            /* skip malformed event */
          }
        }
      }
      return { provider: "gemini", stream: gen() };
    }
    const res = await postJson(`${GEMINI_BASE}/${model}:generateContent`, headers, body);
    return { provider: "gemini", text: pick(await res.json()) };
  },
};

// ---------- Cloudflare Workers AI (free daily allocation) ----------
export const WORKERS_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export const workers: Provider = {
  name: "workers",
  available: (env) => !!env.AI,
  async complete(env, args) {
    const messages = [{ role: "system", content: args.system }, ...args.messages];
    const input: Record<string, unknown> = { messages, max_tokens: args.maxTokens ?? 800 };
    if (args.schema) input.response_format = { type: "json_schema", json_schema: args.schema };
    const out = (await (env.AI as Ai).run(WORKERS_MODEL as never, input as never)) as { response?: unknown };
    const r = out?.response;
    const text = typeof r === "string" ? r : r == null ? "" : JSON.stringify(r);
    return { provider: "workers", text };
  },
};

// ---------- OpenAI-compatible (Groq, OpenRouter free models, etc.) ----------
export const openaiCompatible: Provider = {
  name: "openai",
  available: (env) => !!env.OPENAI_BASE_URL,
  async complete(env, args) {
    const base = (env.OPENAI_BASE_URL as string).replace(/\/$/, "");
    const headers: Record<string, string> = env.OPENAI_API_KEY ? { authorization: `Bearer ${env.OPENAI_API_KEY}` } : {};
    const body = {
      model: env.OPENAI_MODEL || "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: args.system }, ...args.messages],
      max_tokens: args.maxTokens ?? 800,
      temperature: args.schema ? 0 : 0.3,
      stream: !!args.stream,
      ...(args.schema ? { response_format: { type: "json_object" } } : {}),
    };
    const res = await postJson(`${base}/chat/completions`, headers, body);
    if (args.stream) {
      async function* gen() {
        for await (const d of sseData(res)) {
          if (d === "[DONE]") return;
          try {
            const t = (JSON.parse(d) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
            if (t) yield t;
          } catch {
            /* skip */
          }
        }
      }
      return { provider: "openai", stream: gen() };
    }
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { provider: "openai", text: j.choices?.[0]?.message?.content ?? "" };
  },
};

// ---------- Anthropic (only when the user supplies a key) ----------
export const ANTHROPIC_MODEL = "claude-haiku-5-5";

export const anthropic: Provider = {
  name: "anthropic",
  available: (env) => !!env.ANTHROPIC_API_KEY,
  async complete(env, args) {
    const system = args.schema
      ? `${args.system}\n\nReply with one JSON object only, no prose and no code fences.`
      : args.system;
    const res = await postJson(
      "https://api.anthropic.com/v1/messages",
      { "x-api-key": env.ANTHROPIC_API_KEY as string, "anthropic-version": "2023-06-01" },
      { model: ANTHROPIC_MODEL, max_tokens: args.maxTokens ?? 800, system, messages: args.messages },
    );
    const j = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (j.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    return { provider: "anthropic", text };
  },
};

// ---------- Ollama (development only, localhost hosts only) ----------
export function isLocalhostUrl(raw: string | undefined): boolean {
  if (!raw) return false;
  try {
    const h = new URL(raw).hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1";
  } catch {
    return false;
  }
}

export const ollama: Provider = {
  name: "ollama",
  available: (env) => isLocalhostUrl(env.OLLAMA_URL),
  async complete(env, args) {
    const base = (env.OLLAMA_URL as string).replace(/\/$/, "");
    const res = await postJson(
      `${base}/api/chat`,
      {},
      {
        model: "qwen3.5:4b",
        stream: false,
        ...(args.schema ? { format: "json" } : {}),
        messages: [{ role: "system", content: args.system }, ...args.messages],
      },
    );
    const j = (await res.json()) as { message?: { content?: string } };
    return { provider: "ollama", text: j.message?.content ?? "" };
  },
};

export const ALL_PROVIDERS: Record<ProviderName, Provider> = { gemini, workers, openai: openaiCompatible, anthropic, ollama };

import type { Env } from "../src/env";

export const ORIGIN = "https://raasta.safalmutha.in";
export const BASE = "https://api.raasta.test";
export const SECRET = "test-secret-for-tokens-0123456789";

export class MemKV {
  store = new Map<string, string>();
  gets = 0;
  async get(key: string, type?: string): Promise<unknown> {
    this.gets++;
    const v = this.store.get(key);
    if (v === undefined) return null;
    return type === "json" ? JSON.parse(v) : v;
  }
  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
}

interface Row {
  table: string;
  args: unknown[];
}

/** A tiny D1 stand-in: records INSERTs and answers the lookups the app makes. */
export class MemD1 {
  rows: Row[] = [];
  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async run() {
            const m = /INSERT INTO (\w+)/i.exec(sql);
            if (m) self.rows.push({ table: m[1] as string, args });
            return { success: true };
          },
          async first() {
            const m = /FROM (\w+) WHERE/i.exec(sql);
            const table = m?.[1];
            const hit = self.rows.find((r) => {
              if (r.table !== table) return false;
              if (table === "digit_submissions") return r.args[0] === args[0] || r.args[3] === args[0];
              return r.args[0] === args[0];
            });
            if (!hit) return null;
            if (table === "digit_submissions") {
              return { id: hit.args[0], tenant_id: hit.args[2], service_request_id: hit.args[3], status: hit.args[4] };
            }
            return { id: hit.args[0] };
          },
        };
      },
    };
  }
}

export function makeEnv(over: Partial<Env> = {}): Env & { CACHE: MemKV & KVNamespace; DB: MemD1 & D1Database } {
  return {
    CACHE: new MemKV() as unknown as MemKV & KVNamespace,
    DB: new MemD1() as unknown as MemD1 & D1Database,
    TOKEN_SECRET: SECRET,
    ALLOWED_ORIGINS: `${ORIGIN},http://localhost:5173`,
    ...over,
  } as Env & { CACHE: MemKV & KVNamespace; DB: MemD1 & D1Database };
}

export function post(path: string, body: unknown, opts: { origin?: string | null; form?: boolean; headers?: Record<string, string> } = {}): Request {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.origin !== null) headers.origin = opts.origin ?? ORIGIN;
  headers["content-type"] = opts.form ? "application/x-www-form-urlencoded" : "application/json";
  const raw = typeof body === "string" ? body : opts.form ? new URLSearchParams(body as Record<string, string>).toString() : JSON.stringify(body);
  return new Request(`${BASE}${path}`, { method: "POST", headers, body: raw });
}

export function get(path: string, headers: Record<string, string> = {}): Request {
  return new Request(`${BASE}${path}`, { headers });
}

export function sseResponse(chunks: string[]): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (const t of chunks) c.enqueue(enc.encode(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] } }] })}\n\n`));
      c.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream" } });
}

export function setCookies(res: Response): string {
  return (res.headers as Headers & { getSetCookie(): string[] }).getSetCookie().join(";");
}

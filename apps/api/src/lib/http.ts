import type { Context } from "hono";
import { z } from "zod";
import type { AppEnv } from "../env";

export class HttpError extends Error {
  constructor(public status: 400 | 401 | 403 | 404 | 405 | 413 | 422 | 429 | 500 | 502 | 503, public code: string) {
    super(code);
  }
}

export const BODY_LIMIT_CHAT = 16 * 1024;
export const BODY_LIMIT_FORM = 4 * 1024;

/** Reads a request body as text, refusing anything larger than `max` bytes (Content-Length or actual). */
export async function readLimited(req: Request, max: number): Promise<string> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > max) throw new HttpError(413, "too_large");
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      void reader.cancel();
      throw new HttpError(413, "too_large");
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder().decode(buf);
}

export function bodyLimitFor(pathname: string): number {
  return pathname === "/api/chat" || pathname === "/r/chat" ? BODY_LIMIT_CHAT : BODY_LIMIT_FORM;
}

/** Parses the (already size-checked) JSON body with zod. */
export function parseJson<S extends z.ZodTypeAny>(c: Context<AppEnv>, schema: S): z.infer<S> {
  let data: unknown;
  try {
    data = JSON.parse(c.get("rawBody") || "{}");
  } catch {
    throw new HttpError(400, "bad_json");
  }
  const r = schema.safeParse(data);
  if (!r.success) throw new HttpError(422, "invalid_input");
  return r.data;
}

/** Parses an urlencoded form body into a plain string record (first value wins). */
export function parseForm(c: Context<AppEnv>): Record<string, string> {
  const out: Record<string, string> = {};
  const params = new URLSearchParams(c.get("rawBody") || "");
  for (const [k, v] of params) if (!(k in out)) out[k] = v;
  return out;
}

export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function clientIp(c: Context<AppEnv>): string {
  return c.req.header("cf-connecting-ip") ?? "anon";
}

export function newId(): string {
  return crypto.randomUUID();
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      /* ignore malformed cookie */
    }
  }
  return out;
}

export function cookieHeader(name: string, value: string, isHttps: boolean, maxAge = 31536000): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${isHttps ? "; Secure" : ""}`;
}

/** Only same-site relative paths are allowed as redirect targets. */
export function safeNext(next: string | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n]/.test(next)) return fallback;
  return next;
}

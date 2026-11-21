import type { MiddlewareHandler } from "hono";
import { SITE_URL } from "@raasta/config";
import type { AppEnv, Env, RateLimiter } from "../env";
import { HttpError, bodyLimitFor, clientIp, readLimited } from "./http";

// Plan section 11. style-src has no 'unsafe-inline': pages must not use inline style attributes.
export const CSP = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com",
  "connect-src 'self'",
  "img-src 'self' data: https://tile.openstreetmap.org",
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' https://fonts.googleapis.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

export const securityHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  const h = c.res.headers;
  if (!h.has("Content-Security-Policy")) h.set("Content-Security-Policy", CSP);
  h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "geolocation=(self), microphone=(self), camera=()");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  h.set("X-Frame-Options", "DENY");
  if (new URL(c.req.url).pathname.startsWith("/api/") && !h.get("Cache-Control")) h.set("Cache-Control", "no-store");
};

export function allowedOrigins(env: { ALLOWED_ORIGINS?: string }): string[] {
  const raw = env.ALLOWED_ORIGINS?.trim();
  const list = raw ? raw.split(",") : [SITE_URL, "http://localhost:5173", "http://localhost:8787"];
  return list.map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
}

function originOf(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

/** POST guard: Origin (or Referer) must be an allowed origin or this Worker's own origin; body is size limited. */
export const postGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.req.method === "POST") {
    const url = new URL(c.req.url);
    const origin = originOf(c.req.header("origin")) ?? originOf(c.req.header("referer"));
    const ok = !!origin && (origin === url.origin || allowedOrigins(c.env).includes(origin));
    if (!ok) throw new HttpError(403, "forbidden");
    c.set("rawBody", await readLimited(c.req.raw, bodyLimitFor(url.pathname)));
  }
  await next();
};

function limiterFor(env: Env, method: string, path: string): RateLimiter | undefined {
  if (path === "/api/health") return undefined;
  if (path === "/api/chat" || path === "/r/chat" || path === "/api/intake" || path === "/r/ask") return env.CHAT_LIMITER;
  if (
    method === "POST" &&
    (path.startsWith("/api/feedback") ||
      path.startsWith("/api/system-request") ||
      path.startsWith("/api/submit/") ||
      path.startsWith("/r/submit/") ||
      path.startsWith("/r/feedback") ||
      path.startsWith("/r/system-request"))
  )
    return env.FORM_LIMITER;
  if (path.startsWith("/api/")) return env.TRANSLATE_LIMITER;
  return undefined;
}

export const rateLimit: MiddlewareHandler<AppEnv> = async (c, next) => {
  const path = new URL(c.req.url).pathname;
  const limiter = limiterFor(c.env, c.req.method, path);
  if (limiter) {
    const { success } = await limiter.limit({ key: `${clientIp(c)}:${path.split("/").slice(0, 3).join("/")}` });
    if (!success) throw new HttpError(429, "rate_limited");
  }
  await next();
};

/** Verifies a Turnstile token. Returns true when no secret is configured (feature off). */
export async function verifyTurnstile(env: Env, token: string | undefined, ip: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
    if (ip !== "anon") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

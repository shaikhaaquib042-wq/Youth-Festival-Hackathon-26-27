// Stateless route tokens: base64url(payload).base64url(HMAC-SHA256). Payload holds only slots + geo + expiry.
import type { GeoContext, IntakeSlots } from "./types";

export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface TokenPayload {
  slots: IntakeSlots;
  geo: GeoContext;
  exp: number; // epoch ms
}

export type VerifyResult =
  | { ok: true; slots: IntakeSlots; geo: GeoContext; exp: number }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64u(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64u(s: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error("bad base64url");
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

const ms = (now: Date | number): number => (typeof now === "number" ? now : now.getTime());

export async function signToken(slots: IntakeSlots, geo: GeoContext, secret: string, now: Date | number): Promise<string> {
  if (!secret) throw new Error("rules: token secret is empty");
  const payload: TokenPayload = { slots, geo, exp: ms(now) + TOKEN_TTL_MS };
  const body = toB64u(enc.encode(JSON.stringify(payload)));
  const sig = await globalThis.crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), enc.encode(body));
  return `${body}.${toB64u(new Uint8Array(sig))}`;
}

export async function verifyToken(token: string, secret: string, now: Date | number): Promise<VerifyResult> {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };
  let sig: Uint8Array<ArrayBuffer>;
  try {
    sig = fromB64u(parts[1]);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const valid = await globalThis.crypto.subtle.verify("HMAC", await hmacKey(secret, "verify"), sig, enc.encode(parts[0]));
  if (!valid) return { ok: false, reason: "bad_signature" };
  let payload: TokenPayload;
  try {
    payload = JSON.parse(dec.decode(fromB64u(parts[0]))) as TokenPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof payload.exp !== "number" || !payload.slots || !payload.geo) return { ok: false, reason: "malformed" };
  if (ms(now) > payload.exp) return { ok: false, reason: "expired" };
  return { ok: true, slots: payload.slots, geo: payload.geo, exp: payload.exp };
}

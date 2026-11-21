import { describe, expect, it } from "vitest";
import { TOKEN_TTL_MS, signToken, verifyToken } from "../src";
import { GEO, slots } from "./fixtures";

const SECRET = "test-secret-not-real";
const now = new Date("2026-05-01T00:00:00Z");
const s = slots({ dispute_type: "civic_failure", summary: "pothole near school", city: "Pune" });

describe("route tokens", () => {
  it("round-trips slots and geo", async () => {
    const t = await signToken(s, GEO.pmc, SECRET, now);
    const v = await verifyToken(t, SECRET, now);
    expect(v).toMatchObject({ ok: true, slots: s, geo: GEO.pmc });
  });

  it("is url safe and carries only slots, geo and expiry", async () => {
    const t = await signToken(s, GEO.pmc, SECRET, now);
    expect(t).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    const payload = JSON.parse(Buffer.from(t.split(".")[0], "base64url").toString("utf8"));
    expect(Object.keys(payload).sort()).toEqual(["exp", "geo", "slots"]);
    expect(payload.exp).toBe(now.getTime() + TOKEN_TTL_MS);
  });

  it("is valid for 7 days and not a moment longer", async () => {
    const t = await signToken(s, GEO.pmc, SECRET, now);
    expect((await verifyToken(t, SECRET, now.getTime() + TOKEN_TTL_MS)).ok).toBe(true);
    expect(await verifyToken(t, SECRET, now.getTime() + TOKEN_TTL_MS + 1)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a tampered payload", async () => {
    const t = await signToken(s, GEO.pmc, SECRET, now);
    const [body, sig] = t.split(".");
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    p.slots.dispute_type = "cyber_fraud";
    const forged = `${Buffer.from(JSON.stringify(p)).toString("base64url")}.${sig}`;
    expect(await verifyToken(forged, SECRET, now)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a tampered signature, a wrong secret and extended expiry", async () => {
    const t = await signToken(s, GEO.pmc, SECRET, now);
    const [body, sig] = t.split(".");
    const flipped = sig.slice(0, -2) + (sig.endsWith("AA") ? "BB" : "AA");
    expect((await verifyToken(`${body}.${flipped}`, SECRET, now)).ok).toBe(false);
    expect((await verifyToken(t, "other-secret", now)).ok).toBe(false);
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    p.exp += 10 * TOKEN_TTL_MS;
    const ext = `${Buffer.from(JSON.stringify(p)).toString("base64url")}.${sig}`;
    expect((await verifyToken(ext, SECRET, now)).ok).toBe(false);
  });

  it("rejects malformed tokens without throwing", async () => {
    for (const bad of ["", "abc", "a.b.c", ".", "a.", ".b", "%%%.%%%"]) {
      const v = await verifyToken(bad, SECRET, now);
      expect(v.ok).toBe(false);
    }
  });

  it("refuses an empty secret when signing", async () => {
    await expect(signToken(s, GEO.pmc, "", now)).rejects.toThrow();
  });
});

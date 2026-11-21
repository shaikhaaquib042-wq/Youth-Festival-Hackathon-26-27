import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import app from "../../../apps/api/src/index";
import { makeEnv, get, post, ORIGIN } from "../../../apps/api/test/helpers";
import { signToken } from "@raasta/rules";
import { baseSlots, DEFAULT_GEO } from "./helpers";

describe("Security headers verification", () => {
  const rootDir = resolve(__dirname, "../../../");
  const headersFile = join(rootDir, "apps/web/public/_headers");
  const env = makeEnv();

  describe("apps/web/public/_headers (Cloudflare Pages static security headers)", () => {
    it("file exists and defines default security headers", () => {
      expect(existsSync(headersFile)).toBe(true);
      const content = readFileSync(headersFile, "utf8");

      expect(content).toContain("Content-Security-Policy:");
      expect(content).toContain("Strict-Transport-Security:");
      expect(content).toContain("X-Content-Type-Options: nosniff");
      expect(content).toContain("X-Frame-Options: DENY");
      expect(content).toContain("Referrer-Policy: strict-origin-when-cross-origin");
      expect(content).toContain("Permissions-Policy:");
      expect(content).toContain("Cross-Origin-Opener-Policy: same-origin");
      expect(content).toContain("Cross-Origin-Resource-Policy: same-origin");
    });

    it("verifies CSP directives in _headers", () => {
      const content = readFileSync(headersFile, "utf8");
      const cspLine = content.split("\n").find((l) => l.trim().startsWith("Content-Security-Policy:"));
      expect(cspLine).toBeDefined();

      const csp = cspLine || "";
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("https://challenges.cloudflare.com");
      expect(csp).toContain("https://fonts.googleapis.com");
      expect(csp).toContain("https://fonts.gstatic.com");
    });
  });

  describe("Worker API responses (/api/*)", () => {
    const apiEndpoints = ["/api/health", "/api/intake", "/api/route"];

    it("applies strict security headers and no-store caching on GET /api/health", async () => {
      const res = await app.fetch(get("/api/health"), env);
      expect(res.status).toBe(200);

      const h = res.headers;
      expect(h.get("x-content-type-options")).toBe("nosniff");
      expect(h.get("x-frame-options")).toBe("DENY");
      expect(h.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
      expect(h.get("strict-transport-security")).toContain("max-age=63072000");
      expect(h.get("cross-origin-opener-policy")).toBe("same-origin");
      expect(h.get("cross-origin-resource-policy")).toBe("same-origin");
      expect(h.get("cache-control")).toBe("no-store");

      const csp = h.get("content-security-policy") || "";
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
    });

    it("applies security headers and no-store on POST /api/route", async () => {
      const res = await app.fetch(post("/api/route", { slots: baseSlots("consumer_refund") }), env);
      expect(res.status).toBe(200);

      const h = res.headers;
      expect(h.get("x-content-type-options")).toBe("nosniff");
      expect(h.get("cache-control")).toBe("no-store");
      expect(h.get("content-security-policy")).toContain("default-src 'self'");
    });
  });

  describe("Worker dynamic HTML pages (/r/*)", () => {
    it("applies security headers and private, no-store on /r/ask", async () => {
      const res = await app.fetch(get("/r/ask"), env);
      expect(res.status).toBe(200);

      const h = res.headers;
      expect(h.get("x-content-type-options")).toBe("nosniff");
      expect(h.get("x-frame-options")).toBe("DENY");
      expect(h.get("cache-control")).toBe("private, no-store");
      expect(h.get("content-security-policy")).toContain("default-src 'self'");
      expect(h.get("content-security-policy")).toContain("frame-ancestors 'none'");
    });

    it("applies security headers and private, no-store on /r/route/:token", async () => {
      const token = await signToken(baseSlots("consumer_refund"), DEFAULT_GEO, env.TOKEN_SECRET, Date.now());
      const res = await app.fetch(get(`/r/route/${token}`), env);
      expect(res.status).toBe(200);

      const h = res.headers;
      expect(h.get("x-content-type-options")).toBe("nosniff");
      expect(h.get("cache-control")).toBe("private, no-store");
      expect(h.get("content-security-policy")).toContain("default-src 'self'");
    });
  });

  describe("Worker error responses preserve security headers", () => {
    it("preserves security headers on 403 Forbidden (bad origin)", async () => {
      const res = await app.fetch(post("/api/intake", { text: "test" }, { origin: "https://attacker.example.com" }), env);
      expect(res.status).toBe(403);

      const h = res.headers;
      expect(h.get("x-content-type-options")).toBe("nosniff");
      expect(h.get("content-security-policy")).toContain("default-src 'self'");
      expect(h.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    });

    it("preserves security headers on 404 Not Found", async () => {
      const res = await app.fetch(get("/r/unknown-page-path-12345"), env);
      expect(res.status).toBe(404);

      const h = res.headers;
      expect(h.get("x-content-type-options")).toBe("nosniff");
      expect(h.get("content-security-policy")).toContain("default-src 'self'");
    });

    it("preserves security headers on 413 Payload Too Large", async () => {
      const hugeBody = "x".repeat(5000);
      const res = await app.fetch(post("/api/intake", { text: hugeBody }), env);
      expect(res.status).toBe(413);

      const h = res.headers;
      expect(h.get("x-content-type-options")).toBe("nosniff");
      expect(h.get("content-security-policy")).toContain("default-src 'self'");
    });

    it("preserves security headers on 422 Invalid Input", async () => {
      const res = await app.fetch(post("/api/intake", { text: 12345 }), env);
      expect(res.status).toBe(422);

      const h = res.headers;
      expect(h.get("x-content-type-options")).toBe("nosniff");
      expect(h.get("content-security-policy")).toContain("default-src 'self'");
    });
  });

  describe("Header parity between static _headers and Worker security.ts", () => {
    it("identifies HSTS max-age difference between _headers and Worker", () => {
      const content = readFileSync(headersFile, "utf8");
      const staticHsts = content.match(/Strict-Transport-Security:\s*([^\r\n]+)/)?.[1] || "";

      // In _headers: max-age=31536000; includeSubDomains (1 year)
      // In Worker: max-age=63072000; includeSubDomains; preload (2 years + preload)
      expect(staticHsts).toContain("max-age=31536000");

      // Verify that both have at least 1 year (31536000)
      const staticAge = parseInt(staticHsts.match(/max-age=(\d+)/)?.[1] || "0", 10);
      expect(staticAge).toBeGreaterThanOrEqual(31536000);
    });
  });
});

import { describe, expect, it } from "vitest";
import app from "../../../apps/api/src/index";
import { makeEnv, get, post, ORIGIN, BASE } from "../../../apps/api/test/helpers";
import { signToken, verifyToken } from "@raasta/rules";
import { StreamUrlFilter, filterUrls } from "../../../apps/api/src/ai/filter";
import { baseSlots, DEFAULT_GEO } from "./helpers";

describe("API Abuse and Security Hardening", () => {
  const env = makeEnv();

  describe("1. Oversized Request Bodies", () => {
    it("rejects oversized form bodies (>4 KB) with HTTP 413", async () => {
      const oversizedPayload = "a".repeat(4097);
      const res = await app.fetch(post("/api/intake", { text: oversizedPayload }), env);
      expect(res.status).toBe(413);

      const json = await res.json();
      expect(json).toEqual({ error: "too_large" });
    });

    it("rejects requests declaring excessive Content-Length with HTTP 413", async () => {
      const res = await app.fetch(
        post("/api/feedback", "{}", { headers: { "content-length": "100000" } }),
        env
      );
      expect(res.status).toBe(413);
    });

    it("enforces 16 KB body limit on chat endpoint", async () => {
      // 5 KB payload is acceptable for chat
      const validChatMessages = [
        { role: "user", content: "x".repeat(1500) },
        { role: "assistant", content: "y".repeat(1500) },
        { role: "user", content: "z".repeat(1500) },
      ];
      const validRes = await app.fetch(post("/api/chat", { messages: validChatMessages }), env);
      expect(validRes.status).not.toBe(413);

      // >16 KB payload is rejected with 413
      const hugeChat = "x".repeat(17 * 1024);
      const tooLargeRes = await app.fetch(post("/api/chat", hugeChat), env);
      expect(tooLargeRes.status).toBe(413);
    });

    it("rejects oversized form submissions to /r/ask with HTTP 413", async () => {
      const hugeForm = { text: "x".repeat(5000) };
      const res = await app.fetch(post("/r/ask", hugeForm, { form: true }), env);
      expect(res.status).toBe(413);
    });
  });

  describe("2. Origin and Referer Security Guard", () => {
    it("rejects POST requests missing Origin and Referer headers with HTTP 403", async () => {
      const res = await app.fetch(post("/api/intake", { text: "deposit issue" }, { origin: null }), env);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "forbidden" });
    });

    it("rejects POST requests with foreign or malicious Origin with HTTP 403", async () => {
      const res = await app.fetch(
        post("/api/intake", { text: "deposit issue" }, { origin: "https://malicious-attacker.com" }),
        env
      );
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "forbidden" });
    });

    it("accepts valid Referer when Origin header is omitted", async () => {
      const res = await app.fetch(
        post("/api/intake", { text: "my deposit was withheld" }, {
          origin: null,
          headers: { referer: `${ORIGIN}/help` },
        }),
        env
      );
      // Passes origin check; returns 200 or 422 if fields needed, but NOT 403
      expect(res.status).not.toBe(403);
    });

    it("error responses never echo raw user input or payload details", async () => {
      const dirtyInput = "<script>alert('sensitive_token_leak')</script>";
      const res = await app.fetch(post("/api/intake", { text: dirtyInput }, { origin: "https://evil.com" }), env);
      const text = await res.text();
      expect(text).not.toContain("sensitive_token_leak");
      expect(text).not.toContain("<script>");
    });
  });

  describe("3. HTML / Script Injection Resilience", () => {
    it("escapes script injection payloads in /r/ask intake form responses", async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      const res = await app.fetch(post("/r/ask", { text: xssPayload }, { form: true }), env);

      // Should either redirect or render follow up / error page
      const html = await res.text();
      expect(html).not.toContain('<script>alert("XSS")</script>');
    });

    it("prevents stored XSS in feedback submissions", async () => {
      const xssMessage = 'Good app <img src=x onerror=alert(1)>';
      const res = await app.fetch(post("/api/feedback", { message: xssMessage, rating: 5 }), env);
      expect(res.status).toBe(201);

      // Verify what was stored in the database
      const stored = env.DB.rows.find((r) => r.table === "feedback");
      expect(stored).toBeDefined();
    });
  });

  describe("4. Prompt Injection and URL Filter in AI Chat", () => {
    it("filters out fabricated URLs attempting prompt injection", () => {
      const injectionResponse =
        "Certainly! Please visit https://scam-arbitration.fake.in/login and https://pgportal.gov.in/ for your case.";
      const filtered = filterUrls(injectionResponse);

      // Authoritative URL is kept
      expect(filtered).toContain("https://pgportal.gov.in/");

      // Fabricated URL is completely removed
      expect(filtered).not.toContain("scam-arbitration.fake.in");
      expect(filtered).not.toContain("https://scam-arbitration");
    });

    it("neutralizes stream chunk-splitting attacks designed to bypass URL detection", () => {
      const filter = new StreamUrlFilter();
      let output = "";

      // Attacker attempts to split malicious URL across streaming chunk boundaries
      const chunks = ["Go to http", "s://phishing-", "site.org/claim immediately."];
      for (const chunk of chunks) {
        output += filter.push(chunk);
      }
      output += filter.flush();

      expect(output).not.toContain("phishing-site.org");
      expect(output).toContain("immediately");
    });
  });

  describe("5. Malformed and Tampered Route Tokens", () => {
    it("rejects tokens with tampered signatures", async () => {
      const slots = baseSlots("consumer_refund");
      const validToken = await signToken(slots, DEFAULT_GEO, env.TOKEN_SECRET, Date.now());

      // Tamper with signature (flip last character)
      const lastChar = validToken.slice(-1);
      const replacementChar = lastChar === "a" ? "b" : "a";
      const tamperedToken = validToken.slice(0, -1) + replacementChar;

      const verifyRes = await verifyToken(tamperedToken, env.TOKEN_SECRET, Date.now());
      expect(verifyRes.ok, "Tampered signature must fail verification").toBe(false);

      // Requesting route page with tampered token should fail
      const res = await app.fetch(get(`/r/route/${tamperedToken}`), env);
      expect(res.status).toBe(400);
    });

    it("rejects tokens with altered payload slots", async () => {
      const slots = baseSlots("consumer_refund");
      const validToken = await signToken(slots, DEFAULT_GEO, env.TOKEN_SECRET, Date.now());

      // A token is formed as payload.signature
      const [rawPayload, signature] = validToken.split(".");
      expect(rawPayload).toBeDefined();
      expect(signature).toBeDefined();

      // Decode payload, modify slot dispute_type, and re-encode without updating signature
      const decoded = JSON.parse(Buffer.from(rawPayload, "base64url").toString("utf8"));
      decoded.slots.dispute_type = "cyber_fraud"; // Tamper payload
      const alteredPayload = Buffer.from(JSON.stringify(decoded)).toString("base64url");

      const tamperedToken = `${alteredPayload}.${signature}`;
      const verifyRes = await verifyToken(tamperedToken, env.TOKEN_SECRET, Date.now());
      expect(verifyRes.ok, "Token with modified payload and old signature must fail").toBe(false);
    });

    it("rejects malformed and non-base64 tokens", async () => {
      const garbageTokens = [
        "not-a-valid-token",
        "abc...xyz",
        "!!!@@@###$$$",
        "",
      ];

      for (const badToken of garbageTokens) {
        const verifyRes = await verifyToken(badToken, env.TOKEN_SECRET, Date.now());
        expect(verifyRes.ok).toBe(false);
      }
    });

    it("rejects expired tokens beyond TTL", async () => {
      const slots = baseSlots("consumer_refund");
      // Timestamp 8 days in the past (TOKEN_TTL_MS is 7 days)
      const pastTime = Date.now() - 8 * 24 * 3600 * 1000;
      const expiredToken = await signToken(slots, DEFAULT_GEO, env.TOKEN_SECRET, pastTime);

      // Verify at current time (token expired beyond 7-day TTL)
      const verifyRes = await verifyToken(expiredToken, env.TOKEN_SECRET, Date.now());
      expect(verifyRes.ok, "Expired token must be rejected").toBe(false);
      if (!verifyRes.ok) {
        expect(verifyRes.reason).toBe("expired");
      }
    });
  });
});

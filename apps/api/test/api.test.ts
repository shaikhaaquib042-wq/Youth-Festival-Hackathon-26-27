import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../src/index";
import { sha256Hex } from "../src/lib/http";
import { BASE, ORIGIN, get, makeEnv, post, setCookies, sseResponse } from "./helpers";

afterEach(() => vi.unstubAllGlobals());

const call = (req: Request, env = makeEnv()) => app.fetch(req, env);

describe("security", () => {
  it("sets security headers on JSON and HTML responses", async () => {
    for (const path of ["/api/health", "/r/ask"]) {
      const res = await call(get(path));
      expect(res.status).toBe(200);
      const csp = res.headers.get("content-security-policy") ?? "";
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("form-action 'self'");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
      expect(res.headers.get("strict-transport-security")).toContain("max-age");
      expect(res.headers.get("permissions-policy")).toContain("geolocation=(self)");
      expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin");
    }
  });

  it("rejects POSTs with a missing or foreign Origin", async () => {
    const none = await call(post("/api/intake", { text: "hello there" }, { origin: null }));
    expect(none.status).toBe(403);
    const evil = await call(post("/api/intake", { text: "hello there" }, { origin: "https://evil.example" }));
    expect(evil.status).toBe(403);
    expect(await evil.json()).toEqual({ error: "forbidden" });
    expect(evil.headers.get("content-security-policy")).toBeTruthy();
  });

  it("accepts a Referer when Origin is absent", async () => {
    const res = await call(post("/api/intake", {}, { origin: null, headers: { referer: `${ORIGIN}/help` } }));
    expect(res.status).toBe(422);
  });

  it("enforces body size limits (4 KB forms, 16 KB chat)", async () => {
    const big = "x".repeat(5000);
    const form = await call(post("/api/intake", { text: big }));
    expect(form.status).toBe(413);
    const declared = await call(post("/api/feedback", "{}", { headers: { "content-length": "999999" } }));
    expect(declared.status).toBe(413);
    // 5 KB is fine for chat, so it gets as far as validation or provider checks.
    const chat = await call(post("/api/chat", { messages: [{ role: "user", content: "a".repeat(1500) }, { role: "assistant", content: "b".repeat(1500) }, { role: "user", content: "c".repeat(1500) }] }));
    expect(chat.status).not.toBe(413);
    const tooBigChat = await call(post("/api/chat", "y".repeat(17 * 1024)));
    expect(tooBigChat.status).toBe(413);
  });

  it("returns generic validation errors", async () => {
    const res = await call(post("/api/intake", { text: 5 }));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "invalid_input" });
    const bad = await call(post("/api/intake", "{not json"));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "bad_json" });
  });

  it("applies the rate limiters", async () => {
    const deny = { limit: vi.fn().mockResolvedValue({ success: false }) };
    const allow = { limit: vi.fn().mockResolvedValue({ success: true }) };
    const env = makeEnv({ CHAT_LIMITER: deny, FORM_LIMITER: allow, TRANSLATE_LIMITER: deny });
    const chat = await call(post("/api/intake", { text: "my deposit" }), env);
    expect(chat.status).toBe(429);
    expect(await chat.json()).toEqual({ error: "rate_limited" });
    const tr = await call(get("/api/offices"), env);
    expect(tr.status).toBe(429);
    const health = await call(get("/api/health"), env);
    expect(health.status).toBe(200);
    const form = await call(post("/api/feedback", { message: "hi" }), env);
    expect(form.status).toBe(201);
    expect(allow.limit).toHaveBeenCalled();
  });
});

describe("turnstile and forms", () => {
  it("verifies Turnstile when a secret is set, then stores to D1", async () => {
    const env = makeEnv({ TURNSTILE_SECRET_KEY: "secret" });
    const fetchMock = vi.fn(async (url: string) => {
      expect(String(url)).toContain("challenges.cloudflare.com/turnstile/v0/siteverify");
      return new Response(JSON.stringify({ success: fetchMock.mock.calls.length > 1 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const fail = await call(post("/api/feedback", { message: "Great", "cf-turnstile-response": "bad" }), env);
    expect(fail.status).toBe(403);
    expect(env.DB.rows).toHaveLength(0);
    const missing = await call(post("/api/feedback", { message: "Great" }), env);
    expect(missing.status).toBe(403);
    const ok = await call(post("/api/system-request", { city: "Pune", dispute_desc: "Add my area", "cf-turnstile-response": "good" }), env);
    expect(ok.status).toBe(201);
    expect(env.DB.rows.map((r) => r.table)).toEqual(["system_requests"]);
  });

  it("redacts PII before storing feedback", async () => {
    const env = makeEnv();
    const res = await call(post("/api/feedback", { message: "Call me on 9876543210", rating: 4 }), env);
    expect(res.status).toBe(201);
    const stored = String(env.DB.rows[0]?.args[4]);
    expect(stored).not.toContain("9876543210");
  });

  it("no-JS feedback form stores and redirects to a thank-you page", async () => {
    const env = makeEnv();
    const res = await call(post("/r/feedback", { message: "Works well", rating: "5", category: "", page: "/" }, { form: true }), env);
    expect(res.status).toBe(303);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toMatch(/^\/r\/submitted\//);
    const page = await call(get(loc), env);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("Thank you");
  });
});

describe("AI adapter", () => {
  it("strips URLs that are not in platforms.json from the chat stream", async () => {
    const env = makeEnv({ GEMINI_API_KEY: "k" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          "You can file at https://evil.exa",
          "mple.com/phish or at https://pgportal.gov.in/ and also fake-portal.gov.in now.",
        ]),
      ),
    );
    const res = await call(post("/api/chat", { messages: [{ role: "user", content: "where do I file?" }] }), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const body = await res.text();
    const text = body
      .split("\n\n")
      .map((l) => l.replace(/^data: /, ""))
      .filter((l) => l && l !== "[DONE]")
      .map((l) => (JSON.parse(l) as { t: string }).t)
      .join("");
    expect(text).not.toContain("evil");
    expect(text).not.toContain("fake-portal");
    expect(text).toContain("[link removed]");
    expect(text).toContain("https://pgportal.gov.in/");
  });

  it("chat is unavailable (503) when no provider is configured", async () => {
    const res = await call(post("/api/chat", { messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(503);
  });

  it("intake uses the model JSON, validated with zod, with PII redacted first", async () => {
    const env = makeEnv({ GEMINI_API_KEY: "k" });
    let sent = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        sent = String(init.body);
        const json = JSON.stringify({ dispute_type: "unpaid_wages", summary: "Salary unpaid", amount_inr: 15000, evil_key: 1 });
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: json }] } }] }));
      }),
    );
    const res = await call(post("/api/intake", { text: "My salary of Rs 15000 is unpaid, call 9876543210" }), env);
    const j = (await res.json()) as { slots: Record<string, unknown>; source: string };
    expect(j.source).toBe("ai");
    expect(j.slots.dispute_type).toBe("unpaid_wages");
    expect(j.slots.evil_key).toBeUndefined();
    expect(sent).not.toContain("9876543210");
  });

  it("intake falls back to keywords when the provider fails (en, hi, mr)", async () => {
    const env = makeEnv({ GEMINI_API_KEY: "k" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    const cases: [string, string][] = [
      ["My landlord has not returned my deposit", "security_deposit"],
      ["मेरी तनख्वाह नहीं मिली", "unpaid_wages"],
      ["माझा पगार दिला नाही", "unpaid_wages"],
      ["I lost my phone", "lost_mobile"],
    ];
    for (const [text, expected] of cases) {
      const res = await call(post("/api/intake", { text }), env);
      const j = (await res.json()) as { slots: { dispute_type: string }; source: string };
      expect(j.source).toBe("keyword");
      expect(j.slots.dispute_type).toBe(expected);
    }
  });
});

describe("digit", () => {
  it("round trips through the demo mock and marks demo:true", async () => {
    const env = makeEnv();
    const created = await call(post("/api/submit/digit", { service_code: "StreetLightNotWorking", description: "Streetlight out near the main junction", city: "Pune" }), env);
    expect(created.status).toBe(201);
    const c = (await created.json()) as { demo: boolean; service_request_id: string; status: string; confirmation_path: string };
    expect(c.demo).toBe(true);
    expect(c.service_request_id).toMatch(/^DEMO-PGR-/);
    expect(env.DB.rows[0]?.table).toBe("digit_submissions");
    const status = await call(get(`/api/submit/digit/${c.service_request_id}`), env);
    const s = (await status.json()) as { demo: boolean; status: string };
    expect(s.demo).toBe(true);
    expect(s.status).toBe("PENDINGFORASSIGNMENT");
    const page = await call(get(c.confirmation_path), env);
    const html = await page.text();
    expect(html).toContain(c.service_request_id);
    expect(html).toContain("Demo sandbox");
  });

  it("validates the submission body", async () => {
    const res = await call(post("/api/submit/digit", { service_code: "x y", description: "hi" }));
    expect(res.status).toBe(422);
  });
});

describe("translate", () => {
  it("serves from KV cache without calling a provider", async () => {
    const env = makeEnv();
    const key = `tr:${await sha256Hex("mr\nHello")}`;
    await env.CACHE.put(key, "नमस्कार");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await call(post("/api/translate", { text: "Hello", lang: "mr" }), env);
    expect(await res.json()).toEqual({ text: "नमस्कार", translated: true, cached: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the source text with translated:false when no provider works", async () => {
    const res = await call(post("/api/translate", { text: "Hello", lang: "hi" }));
    expect(await res.json()).toEqual({ text: "Hello", translated: false });
  });

  it("uses Workers AI m2m100 and caches the result", async () => {
    const run = vi.fn().mockResolvedValue({ translated_text: "नमस्ते" });
    const env = makeEnv({ AI: { run } as never });
    const res = await call(post("/api/translate", { text: "Hello", lang: "hi" }), env);
    const j = (await res.json()) as { text: string; translated: boolean; provider: string };
    expect(j).toMatchObject({ text: "नमस्ते", translated: true, provider: "workers-ai" });
    expect(run).toHaveBeenCalledWith("@cf/meta/m2m100-1.2b", expect.objectContaining({ target_lang: "hi" }));
    const again = await call(post("/api/translate", { text: "Hello", lang: "hi" }), env);
    expect(((await again.json()) as { cached?: boolean }).cached).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe("geo and directions", () => {
  it("reverse geocodes with Nominatim, caches by 3 decimals, and resolves PMC vs PCMC", async () => {
    const env = makeEnv();
    const fetchMock = vi.fn(async (u: string, init: RequestInit) => {
      expect((init.headers as Record<string, string>)["user-agent"]).toContain("Raasta");
      expect(u).toContain("lat=18.559");
      return new Response(JSON.stringify({ address: { state: "Maharashtra", city: "Pune", suburb: "Aundh" } }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const r1 = (await (await call(get("/api/geo/reverse?lat=18.55912&lng=73.80771"), env)).json()) as { geo: { ulb: string; pmc_ward_id?: string; coverage: string }; state_code: string };
    expect(r1.state_code).toBe("MH");
    expect(r1.geo.ulb).toBe("PMC");
    expect(r1.geo.coverage).toBe("deep");
    await call(get("/api/geo/reverse?lat=18.55949&lng=73.80789"), env);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("directions works with no key through OSRM and returns a simplified polyline", async () => {
    const coords = Array.from({ length: 400 }, (_, i) => [73.8 + i * 0.0001, 18.5 + Math.sin(i / 20) * 0.001]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) => {
        expect(u).toContain("router.project-osrm.org/route/v1/driving/73.8,18.5;73.9,18.6");
        return new Response(JSON.stringify({ routes: [{ distance: 12345.6, duration: 900.4, geometry: { coordinates: coords } }] }));
      }),
    );
    const res = await call(get("/api/directions?from=18.5,73.8&to=18.6,73.9&mode=driving"));
    const j = (await res.json()) as { provider: string; distance_m: number; duration_s: number; polyline: number[][] };
    expect(j.provider).toBe("osrm");
    expect(j.distance_m).toBe(12346);
    expect(j.polyline.length).toBeGreaterThan(1);
    expect(j.polyline.length).toBeLessThan(coords.length);
    expect((await call(get("/api/directions?from=bad&to=18.6,73.9"))).status).toBe(422);
  });

  it("offices come from the registry first", async () => {
    const res = await call(get("/api/offices?type=ward_office&state=MH&city=Pune"));
    const j = (await res.json()) as { source: string; offices: { type: string }[] };
    expect(j.source).toBe("registry");
    expect(j.offices.length).toBeGreaterThan(0);
    expect(j.offices.every((o) => o.type === "ward_office")).toBe(true);
  });
});

describe("/r pages (no JavaScript)", () => {
  it("ask -> follow-up questions -> signed token -> result page", async () => {
    const env = makeEnv();
    const first = await call(post("/r/ask", { text: "My landlord has not returned my deposit for three months" }, { form: true }), env);
    expect(first.status).toBe(200);
    const html = await first.text();
    expect(html).toContain('name="st"');
    expect(html).toContain("a_deposit_amount");
    const st = /name="st" value="([^"]+)"/.exec(html)?.[1] as string;
    expect(st).toBeTruthy();

    const done = await call(post("/r/ask", { st, a_deposit_amount: "30000", a_written_complaint_sent: "no" }, { form: true }), env);
    expect(done.status).toBe(303);
    const loc = done.headers.get("location") as string;
    expect(loc).toMatch(/^\/r\/route\/[\w.-]+$/);

    const result = await call(get(loc), env);
    expect(result.status).toBe(200);
    const page = await result.text();
    expect(page).toContain("Raasta gives procedural guidance based on public government rules. It is not legal advice.");
    expect(page).toContain("<h1>");
    expect(page).toContain("/styles/raasta.css");
    expect(page).toContain("fonts.googleapis.com");
    expect(page).not.toContain(String.fromCharCode(0x2014));
  });

  it("rejects a tampered token", async () => {
    const res = await call(get("/r/route/abc.def"));
    expect(res.status).toBe(400);
  });

  it("guided flow carries answers in hidden fields and ends with a redirect", async () => {
    const env = makeEnv();
    const s1 = await call(get("/r/flow/security_deposit/1"), env);
    expect(s1.status).toBe(200);
    const s2 = await call(post("/r/flow/security_deposit/1", { a_deposit_amount: "20000" }, { form: true }), env);
    const h2 = await s2.text();
    expect(h2).toContain('type="hidden" name="a_deposit_amount" value="20000"');
    expect(h2).toContain("Question 2 of 4");
    const back = await call(post("/r/flow/security_deposit/2", { a_deposit_amount: "20000", _nav: "back" }, { form: true }), env);
    expect(await back.text()).toContain("Question 1 of 4");
    const last = await call(post("/r/flow/security_deposit/4", { a_deposit_amount: "20000", a_agreement_registered: "yes", a_written_complaint_sent: "no" }, { form: true }), env);
    expect(last.status).toBe(303);
    expect(last.headers.get("location")).toMatch(/^\/r\/route\//);
    expect((await call(get("/r/flow/nope/1"), env)).status).toBe(404);
    expect((await call(get("/r/flow/security_deposit/99"), env)).status).toBe(404);
  });

  it("sets the location cookie with SameSite=Lax and only redirects to local paths", async () => {
    const res = await call(post("/r/location", { state: "Maharashtra", city: "Pune", next: "/help", lang: "mr" }, { form: true }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/help");
    const cookies = setCookies(res);
    expect(cookies).toContain("raasta_loc=MH%7CPune");
    expect(cookies).toContain("SameSite=Lax");
    expect(cookies).toContain("raasta_lang=mr");
    const evil = await call(post("/r/location", { state: "MH", city: "Pune", next: "//evil.example" }, { form: true }));
    expect(evil.headers.get("location")).toBe("/");
  });

  it("language: ?lang sets a cookie, the cookie is then used", async () => {
    const res = await call(get(`/r/ask?lang=mr`));
    expect(setCookies(res)).toContain("raasta_lang=mr");
    expect(await res.text()).toContain('lang="mr"');
    const next = await call(get("/r/ask", { cookie: "raasta_lang=hi" }));
    expect(await next.text()).toContain('lang="hi"');
    expect(BASE).toBeTruthy();
  });

  it("PMC ward picker re-signs the token with the chosen ward", async () => {
    const env = makeEnv();
    const first = await call(post("/r/ask", { text: "pothole outside my house in Pune" }, { form: true, headers: { cookie: "raasta_loc=MH%7CPune" } }), env);
    let loc = first.headers.get("location");
    if (!loc) {
      const st = /name="st" value="([^"]+)"/.exec(await first.text())?.[1] as string;
      loc = (await call(post("/r/ask", { st }, { form: true }), env)).headers.get("location");
    }
    expect(loc).toMatch(/^\/r\/route\//);
    const ward = await call(post(`${loc}/ward`, { ward_id: "pmc_ward_kothrud_bavdhan" }, { form: true }), env);
    expect(ward.status).toBe(303);
    const bad = await call(post(`${loc}/ward`, { ward_id: "nope" }, { form: true }), env);
    expect(bad.status).toBe(422);
  });
});

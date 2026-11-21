import { describe, expect, it } from "vitest";
import { platforms } from "@raasta/data";
import { buildMailto } from "@raasta/docs-gen";
import { signToken } from "@raasta/rules";
import type { GeoContext, IntakeSlots, RouteResult } from "@raasta/rules/types";
import { jsx } from "hono/jsx";
import app from "../src/index";
import { ResultPage } from "../src/views/route/ResultPage";
import { SECRET, get, makeEnv, post } from "./helpers";

const env = makeEnv();
const call = (req: Request) => app.fetch(req, env);
const EM_DASH = String.fromCharCode(0x2014);

const slots = (over: Partial<IntakeSlots> = {}): IntakeSlots => ({
  dispute_type: "security_deposit",
  summary: "My landlord in Kothrud has not returned my deposit for 2 months",
  state_code: "MH",
  city: "Pune",
  amount_inr: 40000,
  days_since_incident: 60,
  missing_fields: [],
  ...over,
});
const geo: GeoContext = { state_code: "MH", city: "Pune", ulb: "PMC", coverage: "deep" };
const tokenFor = (s: IntakeSlots, g: GeoContext = geo) => signToken(s, g, SECRET, Date.now());

const fixture: RouteResult = {
  dispute_type: "civic_failure",
  urgency: "normal",
  first_peaceful_step: { key: "step.civic_report_and_note_ticket", doc_template: "pmc_ward_letter", free: true },
  primary: {
    platform_id: "pmc_care_pune",
    why_key: "why.legal_aid_free",
    fee: "Free",
    sla: "7 days",
    submission: [
      { kind: "api", adapter: "digit_pgr", tenantId: "demo.sandbox" },
      { kind: "prefill_url", template: "https://example.gov.in/form?text={summary}" },
      { kind: "whatsapp", template: "https://wa.me/918888251001?text={summary}" },
      { kind: "email", to: "ward@example.gov.in", cc: "zone@example.gov.in", subjectKey: "email.subject.civic" },
      { kind: "post", addressRef: "pmc_main_building" },
      { kind: "phone", number: "1800 103 0222" },
      { kind: "in_person", officeRef: "pmc_main_building" },
      { kind: "autofill_helper", portal: "pmc_care_pune" },
      { kind: "guide" },
    ],
  },
  alternatives: [
    { platform_id: "aaple_sarkar_maharashtra", why_key: "why.legal_aid_free", fee: "Free", sla: "21 days", submission: [{ kind: "guide" }], blocked_reason_key: "warn.never_share_otp" },
  ],
  documents: [{ key: "doc.x", label_en: "Photo of the problem", required: true }],
  timers: [],
  legal_aid: { eligible: "check", reason_key: "legalaid.check_income", contact: { office_id: "slsa:MH", name: "MSLSA", phone: "15100", verified: true } },
  offices: [],
  warnings: [],
  sources: [],
};

describe("result page", () => {
  it("renders every submission kind with truthful labels", async () => {
    const html = await jsx(ResultPage, { lang: "en", token: "tok", result: fixture, geo, timers: [], title: "Civic problem", slots: slots({ dispute_type: "civic_failure" }), demo: true }).toString();
    expect(html).toContain("File directly (demo sandbox)");
    expect(html).toContain('action="/r/submit/digit"');
    expect(html).toContain("https://example.gov.in/form?text=");
    expect(html).toContain("https://wa.me/918888251001?text=");
    expect(html).toContain("mailto:ward%40example.gov.in");
    expect(html).toContain("mail.google.com");
    expect(html).toContain("outlook.office.com");
    expect(html).toContain("/r/label?t=tok&amp;office=pmc_main_building");
    expect(html).toContain('href="tel:18001030222"');
    expect(html).toContain("/r/directions?to=pmc_main_building");
    expect(html).toContain("/r/guide/pmc_care_pune");
    expect(html).toContain("copy-tray");
    expect(html).toContain("/r/doc/pmc_ward_letter?t=tok");
    expect(html).toContain('class="checklist"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("is-blocked");
    expect(html).toContain('action="/r/legal-aid"');
    expect(html).toContain("Drafted for you");
    expect(html).not.toContain(EM_DASH);
    expect(html).not.toMatch(/\bui\.[a-z_]+\.[a-z_.]+/);
  });

  it("shows the ward picker only for civic and neighbour disputes", async () => {
    const civic = await jsx(ResultPage, { lang: "en", token: "t", result: fixture, geo, timers: [], title: "x" }).toString();
    expect(civic).toContain("/ward");
    const other = await jsx(ResultPage, { lang: "en", token: "t", result: { ...fixture, dispute_type: "security_deposit" }, geo, timers: [], title: "x" }).toString();
    expect(other).not.toContain("/ward");
  });

  it("trims a long mailto and says so", () => {
    const long = buildMailto({ to: "a@b.gov.in", subject: "s", body: "word ".repeat(800) });
    expect(long.trimmed).toBe(true);
    expect(long.url.length).toBeLessThanOrEqual(1800);
  });

  it("puts the emergency block first for cyber fraud", async () => {
    const tok = await tokenFor(slots({ dispute_type: "cyber_fraud", summary: "UPI fraud just now", days_since_incident: 0, is_emergency: true }));
    const res = await call(get(`/r/route/${tok}`));
    expect(res.status).toBe(200);
    const html = await res.text();
    const i = html.indexOf('class="alert');
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(html.indexOf("<h1"));
    expect(html).toContain('href="tel:1930"');
    expect(html).toContain('href="tel:112"');
    expect(html).toContain("/r/doc/bank_fraud_intimation?t=");
    expect(html).not.toContain(EM_DASH);
  });

  it("renders the deposit route end to end", async () => {
    const tok = await tokenFor(slots());
    const res = await call(get(`/r/route/${tok}`));
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain(`/r/doc/deposit_notice?t=${tok}`);
    expect(html).not.toContain(EM_DASH);
  });
});

describe("guide pages", () => {
  it("renders for every platform id", async () => {
    for (const p of platforms) {
      const res = await call(get(`/r/guide/${p.id}`));
      expect(res.status, p.id).toBe(200);
      const html = await res.text();
      expect(html).toContain('class="stepper"');
      expect(html).not.toContain(EM_DASH);
    }
  });

  it("shows the drafted summary when a token is given", async () => {
    const tok = await tokenFor(slots());
    const html = await (await call(get(`/r/guide/e_jagriti?t=${tok}`))).text();
    expect(html).toContain("Kothrud");
    expect(html).toContain("guide-draft");
  });

  it("404s for an unknown platform", async () => {
    expect((await call(get("/r/guide/nope"))).status).toBe(404);
  });
});

describe("documents and labels", () => {
  it("GET prefills the form from the token", async () => {
    const tok = await tokenFor(slots());
    const html = await (await call(get(`/r/doc/deposit_notice?t=${tok}`))).text();
    expect(html).toContain('name="f_deposit_amount"');
    expect(html).toContain('value="40000"');
  });

  it("POST returns a no-store English PDF", async () => {
    const res = await call(post("/r/doc/deposit_notice", { f_tenant_name: "Asha", f_owner_name: "Mr Rao", f_deposit_amount: "40000", doc_lang: "en" }, { form: true }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("POST in another language returns print HTML with an English PDF link", async () => {
    const res = await call(post("/r/doc/deposit_notice", { f_tenant_name: "Asha", doc_lang: "hi" }, { form: true }));
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toContain("English PDF");
  });

  it("keeps the origin check on", async () => {
    const res = await call(post("/r/doc/deposit_notice", { doc_lang: "en" }, { form: true, origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });

  it("label POST returns PDFs", async () => {
    for (const format of ["a4", "dl"]) {
      const res = await call(post("/r/label", { office: "pmc_main_building", from_name: "Asha", from_address: "Kothrud, Pune", format }, { form: true }));
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(new TextDecoder().decode(new Uint8Array(await res.arrayBuffer()).slice(0, 5))).toBe("%PDF-");
    }
    const form = await (await call(get("/r/label?office=pmc_main_building"))).text();
    expect(form).toContain("Speed Post");
    expect(form).toContain("article number");
  });
});

describe("directions, offices, legal aid", () => {
  it("directions shows text first and map links", async () => {
    const html = await (await call(get("/r/directions?to=pmc_main_building"))).text();
    expect(html).toContain("Call before you go");
    expect(html).toContain("openstreetmap.org");
    expect(html).toContain('href="geo:');
    expect(html).toContain("google.com/maps");
    expect(html).toContain("2 photocopies");
    expect(html).not.toContain(EM_DASH);
  });

  it("offices lists registry offices for Pune", async () => {
    const html = await (await call(get("/r/offices?state=MH&city=Pune&type=ward_office"))).text();
    expect(html).toContain("/r/directions?to=pmc_ward");
  });

  it("legal aid POST answers with a reason and 15100", async () => {
    const res = await call(post("/r/legal-aid", "flag=woman&state=MH&income=100000", { form: true }));
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("tel:15100");
    expect(html).toContain("free legal aid");
    expect(html).not.toContain(EM_DASH);
  });

  it("legal aid from a route token", async () => {
    const tok = await tokenFor(slots());
    const res = await call(post("/r/legal-aid", { t: tok, income: "90000" }, { form: true }));
    expect(res.status).toBe(200);
  });
});

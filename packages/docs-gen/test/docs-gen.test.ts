import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  buildDoc, buildGmail, buildMailto, buildOutlook, buildWhatsApp, renderEnvelopeDL, renderLabels,
  renderPdf, renderPrintHtml, templates, type Vars,
} from "../src/index";

const NOW = new Date("2026-11-21T00:00:00Z");
const ctx = { lang: "en", now: NOW };
const EM = String.fromCharCode(0x2014);

const FULL: Vars = {
  user_name: "Asha Patil", customer_name: "Asha Patil", worker_name: "Asha Patil", tenant_name: "Asha Patil",
  complainant_name: "Asha Patil", victim_name: "Asha Patil", borrower_name: "Asha Patil",
  buyer_name: "Asha Patil", applicant_name: "Asha Patil",
  user_address: "12 Lake Road, Kothrud, Pune", user_phone: "9000000000", user_email: "asha@example.org",
  seller_name: "Sample Traders", employer_name: "Sample Works", owner_name: "Mr Sample Owner",
  neighbor_name: "Mr Neighbour", product_name: "Sample Phone", purchase_cost: 12500,
  invoice_number: "INV-1", purchase_date: "2026-10-01", issue_summary: "It stopped working in a week.",
  relief_sought: "A full refund.", unpaid_amount: 45000, work_period: "1 March to 30 June",
  property_address: "Flat 4, Sample Society, Pune", deposit_amount: 60000, vacate_date: "2026-09-30",
  bank_name: "Sample Bank", account_last4: "1234", transaction_id: "TXN123", amount: 8000,
  transaction_date: "2026-11-19", lender_name: "Sample Finance", builder_name: "Sample Builders",
  project_name: "Sample Heights", rera_number: "P000000", amount_paid: 900000,
  ward_name: "Kothrud", issue_type: "Garbage not collected", address: "Lane 3, Kothrud",
  district: "Pune", annual_income: 90000, police_station: "Sample", incident_date: "2026-11-18",
  incident_summary: "Someone took my bag.", matter_summary: "Unpaid wages.",
};

describe("templates", () => {
  it("has all 14 ids", () => {
    expect(templates.map((t) => t.id).sort()).toEqual([
      "bank_fraud_intimation", "demand_notice_wages", "deposit_notice", "ejagriti_draft",
      "grievance_text", "gro_letter", "legal_aid_application", "maharera_conciliation",
      "nch_text", "neighbour_letter", "pmc_ward_letter", "police_complaint",
      "rbi_lender_precomplaint", "shebox_narrative",
    ]);
  });

  for (const t of templates) {
    describe(t.id, () => {
      it("matches snapshot with full values", () => {
        expect(buildDoc(t.id, FULL, ctx)).toMatchSnapshot();
      });

      it("renders blanks for missing values and never throws", () => {
        const d = buildDoc(t.id, {}, ctx);
        const all = JSON.stringify(d);
        expect(all).toContain("________");
        expect(d.footer).toContain("It is not legal advice.");
      });

      it("renders a PDF", async () => {
        const bytes = await renderPdf(buildDoc(t.id, FULL, ctx));
        expect(bytes.length).toBeGreaterThan(1000);
        expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
      });

      it("has no em dash in any output", () => {
        const d = buildDoc(t.id, {}, ctx);
        expect(JSON.stringify(d)).not.toContain(EM);
        expect(renderPrintHtml(d)).not.toContain(EM);
      });
    });
  }

  it("states the day counts the plan allows", () => {
    expect(JSON.stringify(buildDoc("demand_notice_wages", FULL, ctx))).toContain("7 days");
    expect(JSON.stringify(buildDoc("deposit_notice", FULL, ctx))).toContain("15 days");
    expect(JSON.stringify(buildDoc("bank_fraud_intimation", FULL, ctx))).toContain("3 working days");
  });

  it("throws on unknown template", () => {
    expect(() => buildDoc("nope", {}, ctx)).toThrow();
  });
});

describe("pdf", () => {
  it("handles Indic text without throwing and adds a note", async () => {
    const d = buildDoc("gro_letter", { ...FULL, issue_summary: "हिन्दी text" }, ctx);
    const bytes = await renderPdf(d);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
  });

  it("breaks pages for long letters", async () => {
    const d = buildDoc("gro_letter", { ...FULL, issue_summary: "word ".repeat(2000) }, ctx);
    const pdf = await PDFDocument.load(await renderPdf(d));
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});

describe("html", () => {
  it("escapes injected markup", () => {
    const d = buildDoc("gro_letter", { ...FULL, issue_summary: "<script>alert(1)</script>" }, ctx);
    const html = renderPrintHtml(d);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("@page");
    expect(html).toContain("Print or save as PDF");
  });

  it("uses rtl for Urdu and Indic fonts for Hindi", () => {
    const ur = renderPrintHtml(buildDoc("gro_letter", FULL, { lang: "ur", now: NOW }));
    expect(ur).toContain('dir="rtl"');
    const hi = renderPrintHtml(buildDoc("gro_letter", FULL, { lang: "hi", now: NOW }));
    expect(hi).toContain("Noto+Sans+Devanagari");
    expect(hi).toContain("Baloo+2");
  });
});

describe("labels", () => {
  const to = { name: "Ward Officer", address: "Ward Office, Pune" };
  const from = { name: "Asha Patil", address: "12 Lake Road, Pune" };

  it("A4 sheet, 4 up", async () => {
    const pdf = await PDFDocument.load(await renderLabels({ to, from, copies: 5 }));
    expect(pdf.getPageCount()).toBe(2);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeCloseTo(595.28, 0);
    expect(height).toBeCloseTo(841.89, 0);
  });

  it("DL envelope is 220 x 110 mm", async () => {
    const pdf = await PDFDocument.load(await renderEnvelopeDL({ to, from }));
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeCloseTo((220 * 72) / 25.4, 0);
    expect(height).toBeCloseTo((110 * 72) / 25.4, 0);
  });
});

describe("email", () => {
  it("keeps short mail intact and UTF-8 encoded", () => {
    const r = buildMailto({ to: "a@b.in", cc: "c@d.in", subject: "Hi é", body: "Line1\nLine2" });
    expect(r.trimmed).toBe(false);
    expect(r.url).toContain("mailto:a%40b.in?cc=c%40d.in");
    expect(r.url).toContain("%C3%A9");
    expect(r.url).toContain("%0D%0A");
  });

  it("trims long bodies to <= 1800 chars with the attach note", () => {
    const body = "This is a long paragraph of text. ".repeat(300);
    for (const f of [buildMailto, buildGmail, buildOutlook]) {
      const r = f({ to: "a@b.in", subject: "Long", body });
      expect(r.trimmed).toBe(true);
      expect(r.url.length).toBeLessThanOrEqual(1800);
      expect(decodeURIComponent(r.url)).toContain("Full letter attached, please attach the downloaded file.");
    }
  });

  it("gmail and outlook formats", () => {
    expect(buildGmail({ to: "a@b.in", subject: "s", body: "b" }).url)
      .toBe("https://mail.google.com/mail/?view=cm&to=a%40b.in&cc=&su=s&body=b");
    expect(buildOutlook({ to: "a@b.in", subject: "s", body: "b" }).url)
      .toContain("https://outlook.office.com/mail/deeplink/compose?to=a%40b.in");
  });

  it("whatsapp keeps digits", () => {
    expect(buildWhatsApp("+91 90000-00000", "hi there")).toBe("https://wa.me/919000000000?text=hi%20there");
  });
});

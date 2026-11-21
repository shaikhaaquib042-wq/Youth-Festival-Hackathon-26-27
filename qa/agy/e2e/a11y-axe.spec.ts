import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const STATIC_PAGES = [
  "/",
  "/help",
  "/help/money",
  "/offices",
  "/offices/mumbai",
  "/legal-aid",
  "/emergency",
  "/feedback",
  "/about",
  "/about/data",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/state/mh",
  "/mr/",
  "/ur/",
];

test.describe("axe-core accessibility audits", () => {
  // Measure settled colours: scroll-reveal fades would otherwise be caught mid-animation.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });
  for (const pagePath of STATIC_PAGES) {
    test(`axe audit on static page: ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath, { waitUntil: "load" });
      await page.waitForSelector("h1", { timeout: 10000 });
      // Short pause to ensure fonts and animations settle
      await page.waitForTimeout(300);

      const results = await new AxeBuilder({ page }).analyze();
      const violations = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      );

      const summary = violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          html: n.html,
          failureSummary: n.failureSummary,
        })),
      }));

      expect(
        summary,
        `Accessibility violation(s) on ${pagePath}: ${JSON.stringify(summary, null, 2)}`
      ).toEqual([]);
    });
  }

  test("axe audit on flow page: /r/flow/civic_failure/0", async ({ page }) => {
    await page.goto("/r/flow/civic_failure/0", { waitUntil: "load" });
    await page.waitForSelector("h1, .q-title", { timeout: 10000 });
    await page.waitForTimeout(300);

    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    const summary = violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({ target: n.target, html: n.html })),
    }));

    expect(
      summary,
      `Accessibility violation(s) on flow page: ${JSON.stringify(summary, null, 2)}`
    ).toEqual([]);
  });

  test("axe audit on letter form: /r/doc/bank_fraud_intimation", async ({ page }) => {
    await page.goto("/r/doc/bank_fraud_intimation", { waitUntil: "load" });
    await page.waitForSelector("h1", { timeout: 10000 });
    await page.waitForTimeout(300);

    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    const summary = violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({ target: n.target, html: n.html })),
    }));

    expect(
      summary,
      `Accessibility violation(s) on letter form: ${JSON.stringify(summary, null, 2)}`
    ).toEqual([]);
  });

  test("axe audit on chat page: /r/chat", async ({ page }) => {
    await page.goto("/r/chat", { waitUntil: "load" });
    await page.waitForSelector("h1, .chat-title", { timeout: 10000 });
    await page.waitForTimeout(300);

    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    const summary = violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({ target: n.target, html: n.html })),
    }));

    expect(
      summary,
      `Accessibility violation(s) on chat page: ${JSON.stringify(summary, null, 2)}`
    ).toEqual([]);
  });

  test("axe audit on guide page: /r/guide/e_jagriti", async ({ page }) => {
    await page.goto("/r/guide/e_jagriti", { waitUntil: "load" });
    await page.waitForSelector("h1", { timeout: 10000 });
    await page.waitForTimeout(300);

    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    const summary = violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({ target: n.target, html: n.html })),
    }));

    expect(
      summary,
      `Accessibility violation(s) on guide page: ${JSON.stringify(summary, null, 2)}`
    ).toEqual([]);
  });

  test("axe audit on result page: /r/route/:token", async ({ page }) => {
    // Generate valid result page via civic failure flow
    await page.goto("/r/flow/civic_failure/0", { waitUntil: "load" });
    // Guided civic flow: only questions that change the route are asked.
    for (let i = 0; i < 6 && !page.url().includes("/r/route/"); i++) {
      await page.waitForSelector('form[action*="/r/flow/"]');
      const card = await page.locator(".q-card").innerText();
      expect(card).not.toContain("If yes");
      expect(card).not.toContain("What is the problem");
      const no = page.locator("label").filter({ hasText: /^No$/ });
      if (await no.count()) await no.first().click();
      await Promise.all([page.waitForLoadState("load"), page.locator('form[action*="/r/flow/"] button.btn-primary').click()]);
    }
    await page.waitForURL(/\/r\/route\//, { timeout: 30000 });
    expect(page.url()).toContain("/r/route/");
    await page.waitForTimeout(300);

    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    const summary = violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({ target: n.target, html: n.html })),
    }));

    expect(
      summary,
      `Accessibility violation(s) on result page: ${JSON.stringify(summary, null, 2)}`
    ).toEqual([]);
  });
});

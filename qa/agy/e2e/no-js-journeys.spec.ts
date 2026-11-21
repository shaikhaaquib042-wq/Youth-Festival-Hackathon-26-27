import { test, expect, Page } from "@playwright/test";

test.describe("Non-JS Journeys at 360x640", () => {
  test.use({
    javaScriptEnabled: false,
    viewport: { width: 360, height: 640 },
  });
  test.setTimeout(180000);

  async function completeNoJsJourney(page: Page) {
    await page.waitForURL(/\/r\/route\//, { timeout: 60000 });
    const routeUrl = page.url();
    const token = routeUrl.match(/\/r\/route\/([^?#]+)/)![1];
    expect(token).toBeTruthy();

    // 1. Open letter
    const docLink = page.locator('a[href*="/r/doc/"]').first();
    await expect(docLink).toBeVisible({ timeout: 15000 });
    await docLink.click();
    await page.waitForURL(/\/r\/doc\//, { timeout: 30000 });

    // 2. Download PDF
    const downloadPromise = page.waitForEvent("download", { timeout: 20000 }).catch(() => null);
    await page.locator('form[action*="/r/doc/"] button[type="submit"]').first().click();
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    } else {
      const contentType = await page.evaluate(() => document.contentType);
      expect(contentType).toMatch(/application\/pdf|text\/html/);
    }

    // 3. Open postal label
    await page.goto(`/r/label?t=${encodeURIComponent(token)}`);
    await page.waitForSelector('form[action*="/r/label"]', { timeout: 15000 });
    await expect(page.locator("h1")).toBeVisible();

    // 4. Open Ask chat and send message
    await page.goto(`/r/chat?t=${encodeURIComponent(token)}`);
    await page.waitForSelector("#chat-q", { timeout: 15000 });
    await page.locator("#chat-q").fill("What should I do next?");
    await page.locator('.chat-input button[type="submit"]').click();
    await page.waitForSelector(".bubble-me", { timeout: 60000 });
  }

  test("(1) deposit problem in Pune (no-JS)", async ({ page }) => {
    await page.goto("/");
    await page.locator("#ask-text").fill("My landlord in Pune has not returned my deposit of Rs 40,000 for 2 months");
    await page.locator('button[type="submit"].ask-send').click();

    await page.waitForURL(/\/r\/(ask|route)/, { timeout: 60000 });
    if (page.url().includes("/r/ask")) {
      const btn = page.locator('form[action="/r/ask"] button[type="submit"]:has-text("Show me the door")');
      if (await btn.count()) await btn.click();
    }
    await completeNoJsJourney(page);
  });

  test("(2) pothole tile (no-JS)", async ({ page }) => {
    await page.goto("/r/flow/civic_failure/0");
    for (let i = 0; i < 6 && !page.url().includes("/r/route/"); i++) {
      await page.waitForSelector('form[action*="/r/flow/"]', { timeout: 15000 });
      const no = page.locator("label").filter({ hasText: /^No$/ });
      if (await no.count()) await no.first().click();
      await Promise.all([
        page.waitForLoadState("load"),
        page.locator('form[action*="/r/flow/"] button.btn-primary').click(),
      ]);
    }
    await completeNoJsJourney(page);
  });

  test('(3) UPI fraud just now (no-JS)', async ({ page }) => {
    await page.goto("/");
    await page.locator("#ask-text").fill("Rs 20000 was taken by UPI fraud just now");
    await page.locator('button[type="submit"].ask-send').click();

    await page.waitForURL(/\/r\/(ask|route)/, { timeout: 60000 });
    expect(page.url()).toContain("/r/route/");
    expect(page.url()).not.toContain("/r/ask");

    const top1930 = page.locator('.alert a[href*="1930"], .res-hero a[href*="1930"]');
    await expect(top1930.first()).toBeVisible();

    await completeNoJsJourney(page);
  });

  test('(4) sexual assault (no-JS)', async ({ page }) => {
    await page.goto("/");
    await page.locator("#ask-text").fill("I was sexually assaulted");
    await page.locator('button[type="submit"].ask-send').click();

    await page.waitForURL(/\/r\/(ask|route)/, { timeout: 60000 });
    expect(page.url()).toContain("/r/route/");
    expect(page.url()).not.toContain("/r/ask");

    const link112 = page.locator('a[href*="112"]');
    await expect(link112.first()).toBeVisible();

    await completeNoJsJourney(page);
  });

  test("(5) online bullying (no-JS)", async ({ page }) => {
    await page.goto("/");
    await page.locator("#ask-text").fill("I am facing online bullying and harassment with abusive messages on Instagram");
    await page.locator('button[type="submit"].ask-send').click();

    await page.waitForURL(/\/r\/(ask|route)/, { timeout: 60000 });
    if (page.url().includes("/r/ask")) {
      const btn = page.locator('form[action="/r/ask"] button[type="submit"]:has-text("Show me the door")');
      if (await btn.count()) await btn.click();
    }
    await completeNoJsJourney(page);
  });

  test("(6) lost mobile (no-JS)", async ({ page }) => {
    await page.goto("/");
    await page.locator("#ask-text").fill("I lost my mobile phone yesterday on the bus in Pune");
    await page.locator('button[type="submit"].ask-send').click();

    await page.waitForURL(/\/r\/(ask|route)/, { timeout: 60000 });
    if (page.url().includes("/r/ask")) {
      const btn = page.locator('form[action="/r/ask"] button[type="submit"]:has-text("Show me the door")');
      if (await btn.count()) await btn.click();
    }
    await completeNoJsJourney(page);
  });

  test("(7) unpaid salary (no-JS)", async ({ page }) => {
    await page.goto("/");
    await page.locator("#ask-text").fill("My employer has not paid my salary of Rs 45,000 for 2 months");
    await page.locator('button[type="submit"].ask-send').click();

    await page.waitForURL(/\/r\/(ask|route)/, { timeout: 60000 });
    if (page.url().includes("/r/ask")) {
      const btn = page.locator('form[action="/r/ask"] button[type="submit"]:has-text("Show me the door")');
      if (await btn.count()) await btn.click();
    }
    await completeNoJsJourney(page);
  });

  test("(8) faulty product (no-JS)", async ({ page }) => {
    await page.goto("/");
    await page.locator("#ask-text").fill("I bought a faulty smartphone and the seller refuses to repair or refund");
    await page.locator('button[type="submit"].ask-send').click();

    await page.waitForURL(/\/r\/(ask|route)/, { timeout: 60000 });
    if (page.url().includes("/r/ask")) {
      const btn = page.locator('form[action="/r/ask"] button[type="submit"]:has-text("Show me the door")');
      if (await btn.count()) await btn.click();
    }
    await completeNoJsJourney(page);
  });
});

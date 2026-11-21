import { test, expect } from "@playwright/test";

test.describe("Journeys with JavaScript DISABLED at 360x640", () => {
  test.use({
    javaScriptEnabled: false,
    viewport: { width: 360, height: 640 },
  });

  test("(i) Landlord deposit refund journey (JS disabled) from landing /", async ({ page }) => {
    await page.goto("/");
    // Check if landing page renders form when JS is disabled
    const textarea = page.locator("#ask-text");
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill("My landlord in Kothrud has not returned my Rs 40,000 deposit for 2 months");
    await page.locator('button[type="submit"].ask-send').click();

    // Follow-up page (only when something that changes the route is still unknown)
    await page.waitForURL(/\/r\/(ask|route)/, { timeout: 60000 });
    if (!page.url().includes("/r/route/")) {
      await expect(page.locator("h1")).toContainText("Tell us a little more");
      await page.locator('form[action="/r/ask"] button[type="submit"]:has-text("Show me the door")').click();
    }

    // Result page
    const firstStep = page.locator(".j-step.j-first, .j-first");
    await expect(firstStep).toBeVisible();

    const rightDoor = page.locator(".door-card, .j-step:has(.door-card)");
    await expect(rightDoor.first()).toBeVisible();

    const docsSection = page.locator(".checklist, #docs");
    await expect(docsSection.first()).toBeVisible();

    // Prepare this letter
    const prepBtn = page.locator('a:has-text("Prepare this letter")');
    await expect(prepBtn).toBeVisible();
    await prepBtn.click();

    // Submit letter form
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 }).catch(() => null);
    await page.locator('form[action*="/r/doc/"] button[type="submit"]').click();
    const download = await downloadPromise;

    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    } else {
      const contentType = await page.evaluate(() => document.contentType);
      expect(contentType === "application/pdf" || contentType === "text/html").toBe(true);
    }
  });

  test("(i-ssr) Landlord deposit refund journey (JS disabled) via SSR /r/ask", async ({ page }) => {
    await page.goto("/r/ask");
    const textarea = page.locator("#ask-text");
    await expect(textarea).toBeVisible();
    await textarea.fill("My landlord in Kothrud has not returned my Rs 40,000 deposit for 2 months");
    await page.locator('form[action="/r/ask"] button[type="submit"]').click();

    // Follow-up page
    await expect(page.locator("h1")).toContainText("Tell us a little more");
    await page.locator('form[action="/r/ask"] button[type="submit"]:has-text("Show me the door")').click();

    // Result page
    const firstStep = page.locator(".j-step.j-first, .j-first");
    await expect(firstStep).toBeVisible();

    const rightDoor = page.locator(".door-card, .j-step:has(.door-card)");
    await expect(rightDoor.first()).toBeVisible();

    const docsSection = page.locator(".checklist, #docs");
    await expect(docsSection.first()).toBeVisible();

    // Prepare this letter
    const prepBtn = page.locator('a:has-text("Prepare this letter")');
    await expect(prepBtn).toBeVisible();
    await prepBtn.click();

    // Submit letter form
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 }).catch(() => null);
    await page.locator('form[action*="/r/doc/"] button[type="submit"]').click();
    const download = await downloadPromise;

    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    } else {
      const contentType = await page.evaluate(() => document.contentType);
      expect(contentType === "application/pdf" || contentType === "text/html").toBe(true);
    }
  });

  test("(ii) Pothole civic failure flow (JS disabled) -> skip condition -> result page", async ({ page }) => {
    await page.goto("/r/flow/civic_failure/0");
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
  });

  test("(iii) UPI fraud (JS disabled) -> result shows 1930 call link at top", async ({ page }) => {
    await page.goto("/");
    const textarea = page.locator("#ask-text");
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill("Rs 20000 was taken from my account by UPI fraud just now");
    await page.locator('button[type="submit"].ask-send').click();

    await page.waitForURL(/\/r\/(ask|route)/, { timeout: 60000 });
    if (!page.url().includes("/r/route/")) {
      await page.locator('form[action="/r/ask"] button[type="submit"]:has-text("Show me the door")').click();
    }

    const topLink1930 = page.locator('.alert a[href="tel:1930"], .res-hero a[href="tel:1930"]');
    await expect(topLink1930).toBeVisible({ timeout: 5000 });
  });

  test("(iii-ssr) UPI fraud (JS disabled) via SSR /r/ask -> result shows 1930 call link at top", async ({ page }) => {
    await page.goto("/r/ask");
    const textarea = page.locator("#ask-text");
    await expect(textarea).toBeVisible();
    await textarea.fill("Rs 20000 was taken from my account by UPI fraud just now");
    await page.locator('form[action="/r/ask"] button[type="submit"]').click();

    await page.waitForURL(/\/r\/(ask|route)/, { timeout: 60000 });
    if (!page.url().includes("/r/route/")) {
      await page.locator('form[action="/r/ask"] button[type="submit"]:has-text("Show me the door")').click();
    }

    const topLink1930 = page.locator('.alert a[href="tel:1930"], .res-hero a[href="tel:1930"]');
    await expect(topLink1930).toBeVisible({ timeout: 5000 });
  });
});

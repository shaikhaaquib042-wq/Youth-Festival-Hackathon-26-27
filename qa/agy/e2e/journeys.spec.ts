import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { width: 375, height: 667, name: "375px" },
  { width: 768, height: 1024, name: "768px" },
  { width: 1280, height: 800, name: "1280px" },
];

for (const vp of VIEWPORTS) {
  test.describe(`Journeys at ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
    });

    test(`(i) Landlord deposit refund journey -> PDF/print`, async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#ask-text")).toBeVisible();
      await page.locator("#ask-text").fill("My landlord in Kothrud has not returned my Rs 40,000 deposit for 2 months");
      await page.locator('button[type="submit"].ask-send').click();

      // Follow-up page
      await page.waitForURL(/\/r\/(ask|route)/, { timeout: 60000 });
      if (!page.url().includes("/r/route/")) {
      await expect(page.locator("h1")).toContainText("Tell us a little more");
      
      // Answer follow-up / proceed
      const submitBtn = page.locator('form[action="/r/ask"] button[type="submit"]:has-text("Show me the door")');
      await expect(submitBtn).toBeVisible();
      await submitBtn.click();
      }

      // Result page
      await page.waitForURL(/\/r\/route\//, { timeout: 30000 });

      // Result page shows a first step with its plain step-by-step guide open, and highlighted links on the door
      const firstStep = page.locator(".j-step.j-first, .j-first");
      await expect(firstStep).toBeVisible();
      await expect(page.locator(".j-first details.howto[open] .howto-step").first()).toBeVisible();
      expect(await page.locator(".door-card details.howto .howto-link").count()).toBeGreaterThan(0);

      // Shows a right door
      const rightDoor = page.locator(".door-card, .j-step:has(.door-card)");
      await expect(rightDoor.first()).toBeVisible();

      // Shows documents
      const docsSection = page.locator(".checklist, #docs");
      await expect(docsSection.first()).toBeVisible();

      // Open "Prepare this letter"
      const prepBtn = page.locator('a:has-text("Prepare this letter")');
      await expect(prepBtn).toBeVisible();
      await prepBtn.click();

      // Letter form page
      await page.waitForURL(/\/r\/doc\//, { timeout: 30000 });
      await expect(page.locator("h1")).toBeVisible();

      // Submit letter form
      const downloadPromise = page.waitForEvent("download", { timeout: 15000 }).catch(() => null);
      await page.locator('form[action*="/r/doc/"] button[type="submit"]').click();
      const download = await downloadPromise;

      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
      } else {
        // If not a file download, it should be an HTML print page or preview
        const contentType = await page.evaluate(() => document.contentType);
        expect(contentType === "application/pdf" || contentType === "text/html").toBe(true);
      }
    });

    test(`(ii) Pothole civic failure flow -> skip condition -> result page`, async ({ page }) => {
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

    test(`(iii) UPI fraud -> result shows 1930 call link at top`, async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#ask-text")).toBeVisible();
      await page.locator("#ask-text").fill("Rs 20000 was taken from my account by UPI fraud just now");
      await page.locator('button[type="submit"].ask-send').click();

      // Follow-up page or direct route
      await page.waitForURL(/\/r\/(ask|route)/, { timeout: 60000 });
      if (page.url().includes("/r/ask")) {
        await page.locator('form[action="/r/ask"] button[type="submit"]:has-text("Show me the door")').click();
        await page.waitForURL(/\/r\/route\//, { timeout: 30000 });
      }

      // Check whether 1930 call link is displayed at the top in the emergency hero/alert section
      const topLink1930 = page.locator('.alert a[href="tel:1930"], .res-hero a[href="tel:1930"]');
      await expect(topLink1930).toBeVisible({ timeout: 5000 });
    });

    test(`(iv) Sexual assault -> result shows tel:112 and no money questions`, async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#ask-text")).toBeVisible();
      await page.locator("#ask-text").fill("sexual assault");
      await page.locator('button[type="submit"].ask-send').click();

      // Should bypass non-safety questions directly to emergency route
      await page.waitForURL(/\/r\/route\//, { timeout: 30000 });
      const link112 = page.locator('a[href="tel:112"]');
      await expect(link112.first()).toBeVisible();

      // Verify no money questions were asked
      const pageText = await page.innerText("body");
      expect(pageText).not.toContain("How much money");
      expect(pageText).not.toContain("Total security deposit");
    });
  });
}

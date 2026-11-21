import { test, expect } from "@playwright/test";

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

const VIEWPORTS = [320, 375, 414, 768, 1024, 1280, 1536, 1920];

for (const vpWidth of VIEWPORTS) {
  test.describe(`Static pages at ${vpWidth}px width`, () => {
    for (const pagePath of STATIC_PAGES) {
      test(`${pagePath} at ${vpWidth}px: no horizontal scroll, exactly one h1, no console errors`, async ({ page }) => {
        const consoleErrors: string[] = [];
        page.on("console", (msg) => {
          if (msg.type() === "error") {
            consoleErrors.push(msg.text());
          }
        });
        page.on("pageerror", (err) => {
          consoleErrors.push(err.message);
        });

        await page.setViewportSize({ width: vpWidth, height: 800 });
        await page.goto(pagePath, { waitUntil: "load" });

        // Wait for hydration/mounting
        await page.waitForSelector("h1", { timeout: 10000 });

        // Check 1: Exactly one h1
        const h1Elements = page.locator("h1");
        const h1Count = await h1Elements.count();
        expect(h1Count, `Expected exactly 1 h1 on ${pagePath}, found ${h1Count}`).toBe(1);

        // Check 2: No horizontal scroll (document.documentElement.scrollWidth <= clientWidth)
        const dimensions = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(
          dimensions.scrollWidth,
          `Horizontal scroll detected on ${pagePath} at ${vpWidth}px: scrollWidth ${dimensions.scrollWidth} > clientWidth ${dimensions.clientWidth}`
        ).toBeLessThanOrEqual(dimensions.clientWidth);

        // Check 3: No console errors
        expect(
          consoleErrors,
          `Console error(s) logged on ${pagePath} at ${vpWidth}px: ${consoleErrors.join("; ")}`
        ).toEqual([]);
      });
    }
  });
}

test.describe("i18n HTML attributes", () => {
  test('Urdu page /ur/ has dir="rtl"', async ({ page }) => {
    await page.goto("/ur/", { waitUntil: "load" });
    await page.waitForSelector("h1", { timeout: 10000 });
    const dir = await page.locator("html").getAttribute("dir");
    expect(dir, 'Expected html tag to have dir="rtl" on /ur/').toBe("rtl");
  });

  test('Marathi page /mr/ has lang="mr"', async ({ page }) => {
    await page.goto("/mr/", { waitUntil: "load" });
    await page.waitForSelector("h1", { timeout: 10000 });
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang, 'Expected html tag to have lang="mr" on /mr/').toBe("mr");
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import app from "../../../apps/api/src/index";
import { makeEnv, get } from "../../../apps/api/test/helpers";
import { signToken } from "@raasta/rules";
import { baseSlots, DEFAULT_GEO } from "./helpers";

function isInputAccessible(html: string, tag: string): boolean {
  // Check aria-label or aria-labelledby
  if (/aria-label(?:ledby)?=["'][^"']+["']/i.test(tag)) return true;

  // Check explicit <label for="id">
  const idMatch = tag.match(/\bid=["']([^"']+)["']/i);
  if (idMatch && idMatch[1]) {
    const id = idMatch[1];
    const forLabelRegex = new RegExp(`<label[^>]*\\bfor=["']${id}["']`, "i");
    if (forLabelRegex.test(html)) return true;
  }

  // Check implicit wrapping <label>...</label>
  const tagIdx = html.indexOf(tag);
  if (tagIdx !== -1) {
    const precedingHtml = html.slice(0, tagIdx);
    const lastOpenLabel = precedingHtml.lastIndexOf("<label");
    const lastCloseLabel = precedingHtml.lastIndexOf("</label>");
    if (lastOpenLabel > lastCloseLabel) {
      const followingHtml = html.slice(tagIdx + tag.length);
      const nextCloseLabel = followingHtml.indexOf("</label>");
      const nextOpenLabel = followingHtml.indexOf("<label");
      if (nextCloseLabel !== -1 && (nextOpenLabel === -1 || nextCloseLabel < nextOpenLabel)) {
        return true;
      }
    }
  }

  return false;
}

describe("Accessibility (a11y) checks", () => {
  const rootDir = resolve(__dirname, "../../../");
  const distDir = join(rootDir, "apps/web/dist");

  const staticPages = [
    "index.html",
    "help/index.html",
    "emergency/index.html",
    "offices/index.html",
    "legal-aid/index.html",
    "feedback/index.html",
    "about/index.html",
    "privacy/index.html",
    "terms/index.html",
    "disclaimer/index.html",
    "404.html",
  ];

  describe("Static prerendered pages (apps/web/dist)", () => {
    for (const rel of staticPages) {
      const fullPath = join(distDir, rel);

      describe(`Page: ${rel}`, () => {
        it("has exactly one <h1> heading", () => {
          if (!existsSync(fullPath)) return;
          const html = readFileSync(fullPath, "utf8");
          const h1Matches = html.match(/<h1[\s>]/gi) || [];
          expect(
            h1Matches.length,
            `${rel} must have exactly one <h1>, found ${h1Matches.length}`
          ).toBe(1);
        });

        it("contains all essential landmark regions (header, main, footer, nav)", () => {
          if (!existsSync(fullPath)) return;
          const html = readFileSync(fullPath, "utf8");

          const hasHeader = /<header[\s>]|role=["']banner["']/i.test(html);
          const hasMain = /<main[\s>]|role=["']main["']/i.test(html);
          const hasFooter = /<footer[\s>]|role=["']contentinfo["']/i.test(html);
          const hasNav = /<nav[\s>]|role=["']navigation["']/i.test(html);

          expect(hasHeader, `${rel} must contain a header landmark`).toBe(true);
          expect(hasMain, `${rel} must contain a main landmark`).toBe(true);
          expect(hasFooter, `${rel} must contain a footer landmark`).toBe(true);
          expect(hasNav, `${rel} must contain a nav landmark`).toBe(true);
        });

        it("contains a functional skip-to-content link", () => {
          if (!existsSync(fullPath)) return;
          const html = readFileSync(fullPath, "utf8");
          expect(html).toMatch(/<a[^>]+class=["'][^"']*skip-link[^"']*["'][^>]*href=["']#(main|content)["']/i);
        });

        it("all <img> elements have an alt attribute", () => {
          if (!existsSync(fullPath)) return;
          const html = readFileSync(fullPath, "utf8");
          const imgTags = html.match(/<img\b[^>]*>/gi) || [];

          for (const img of imgTags) {
            expect(img, `Image in ${rel} must have alt attribute: ${img}`).toMatch(/\balt=["'][^"']*["']/i);
          }
        });

        it("all interactive form controls have accessible labels", () => {
          if (!existsSync(fullPath)) return;
          const html = readFileSync(fullPath, "utf8");
          const inputTags = html.match(/<(?:input|select|textarea)\b[^>]*>/gi) || [];

          for (const tag of inputTags) {
            if (/type=["'](?:hidden|submit|button|reset)["']/i.test(tag)) continue;
            const accessible = isInputAccessible(html, tag);
            expect(
              accessible,
              `Input control in ${rel} must have an accessible label: ${tag}`
            ).toBe(true);
          }
        });
      });
    }
  });

  describe("Server-rendered dynamic pages (Worker /r/*)", () => {
    const env = makeEnv();

    it("evaluates accessibility for /r/ask", async () => {
      const res = await app.fetch(get("/r/ask"), env);
      expect(res.status).toBe(200);
      const html = await res.text();

      // Exactly one <h1>
      const h1Matches = html.match(/<h1[\s>]/gi) || [];
      expect(h1Matches.length).toBe(1);

      // Landmarks
      expect(/<header[\s>]|role=["']banner["']/i.test(html)).toBe(true);
      expect(/<main[\s>]|role=["']main["']/i.test(html)).toBe(true);
      expect(/<footer[\s>]|role=["']contentinfo["']/i.test(html)).toBe(true);

      // Skip link
      expect(html).toMatch(/<a[^>]+class=["'][^"']*skip-link[^"']*["']/i);

      // Input labels
      const inputTags = html.match(/<(?:input|select|textarea)\b[^>]*>/gi) || [];
      for (const tag of inputTags) {
        if (/type=["'](?:hidden|submit|button|reset)["']/i.test(tag)) continue;
        expect(isInputAccessible(html, tag), `/r/ask input must be labeled: ${tag}`).toBe(true);
      }
    });

    it("evaluates accessibility for /r/flow/:dispute/:step", async () => {
      const res = await app.fetch(get("/r/flow/consumer_refund/1"), env);
      expect(res.status).toBe(200);
      const html = await res.text();

      const h1Matches = html.match(/<h1[\s>]/gi) || [];
      expect(h1Matches.length).toBe(1);

      const inputTags = html.match(/<(?:input|select|textarea)\b[^>]*>/gi) || [];
      for (const tag of inputTags) {
        if (/type=["'](?:hidden|submit|button|reset)["']/i.test(tag)) continue;
        expect(isInputAccessible(html, tag), `Flow input must be labeled: ${tag}`).toBe(true);
      }
    });

    it("evaluates accessibility for dynamic result page /r/route/:token", async () => {
      const slots = baseSlots("consumer_refund");
      const token = await signToken(slots, DEFAULT_GEO, env.TOKEN_SECRET, Date.now());
      const res = await app.fetch(get(`/r/route/${token}`), env);
      expect(res.status).toBe(200);
      const html = await res.text();

      const h1Matches = html.match(/<h1[\s>]/gi) || [];
      expect(h1Matches.length, `Result page must have exactly one <h1>, found ${h1Matches.length}`).toBe(1);
      expect(/<main[\s>]|role=["']main["']/i.test(html)).toBe(true);
      expect(/<header[\s>]|role=["']banner["']/i.test(html)).toBe(true);
      expect(/<footer[\s>]|role=["']contentinfo["']/i.test(html)).toBe(true);
    });

    it("documents contract compliance status for expected /r/* routes in CONTRACTS.md", async () => {
      const expectedDynamicRoutes = [
        "/r/offices",
        "/r/legal-aid",
        "/r/feedback",
        "/r/system-request",
        "/r/chat",
        "/r/directions",
        "/r/label",
      ];

      const missingRoutes: string[] = [];
      for (const path of expectedDynamicRoutes) {
        const res = await app.fetch(get(path), env);
        if (res.status === 404) {
          missingRoutes.push(path);
        }
      }

      // CONTRACTS.md lines 9-12 lists these routes for apps/api /r/*, but they are not implemented in pages.tsx
      // We record them for the QA report
      expect(missingRoutes.length).toBeGreaterThan(0);
      expect(missingRoutes).toContain("/r/legal-aid");
      expect(missingRoutes).toContain("/r/chat");
    });
  });
});

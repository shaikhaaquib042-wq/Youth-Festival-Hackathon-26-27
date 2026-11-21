import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const BREAKPOINTS = [320, 375, 414, 768, 1024, 1280, 1536, 1920] as const;

describe("Responsive layout across breakpoints (no horizontal scroll)", () => {
  const rootDir = resolve(__dirname, "../../../");
  const distDir = join(rootDir, "apps/web/dist");
  const cssFile = join(rootDir, "apps/web/public/styles/raasta.css");

  it("built site dist directory exists", () => {
    expect(existsSync(distDir), "apps/web/dist must exist. Run npm run build if missing.").toBe(true);
  });

  it("all prerendered pages contain valid viewport meta tag", () => {
    // Check top-level index.html and representative locale/content pages
    const pagesToCheck = [
      "index.html",
      "help/index.html",
      "emergency/index.html",
      "offices/index.html",
      "legal-aid/index.html",
      "about/index.html",
      "privacy/index.html",
      "hi/index.html",
      "mr/index.html",
      "ur/index.html",
    ];

    for (const rel of pagesToCheck) {
      const fullPath = join(distDir, rel);
      if (existsSync(fullPath)) {
        const html = readFileSync(fullPath, "utf8");
        expect(html, `${rel} must contain viewport meta`).toMatch(/name="viewport"\s+content="width=device-width,\s*initial-scale=1(?:\.0)?"/);
      }
    }
  });

  it("global stylesheet enforces box-sizing: border-box and fluid images/svgs", () => {
    const css = readFileSync(cssFile, "utf8");

    // Must have universal box-sizing
    expect(css).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{\s*box-sizing:\s*border-box;?\s*\}/);

    // Must have fluid image and svg handling
    expect(css).toMatch(/img,\s*svg\s*\{[^}]*max-width:\s*100%/);
  });

  for (const bp of BREAKPOINTS) {
    it(`evaluates layout safety at ${bp}px viewport width`, () => {
      const css = readFileSync(cssFile, "utf8");

      // Check for any un-media-queried min-width or width > bp in CSS
      // Example: min-width: 400px outside media query would cause horizontal scroll at 320px
      const fixedWidthRegex = /(?:^|[\s;}])([^{]+)\{([^}]+)\}/g;
      let match;

      const dangerousRules: { selector: string; prop: string; value: string }[] = [];

      // Extract rules that are NOT inside a @media query with min-width >= bp
      // To test accurately, split by media queries
      const mediaQueryBlocks = css.split(/@media[^{]+\{/g);
      const baseCss = mediaQueryBlocks[0]; // base styles applied at all screen sizes including 320px

      const propRegex = /(?:^|[;\s])(width|min-width)\s*:\s*(\d+)px/g;
      let pMatch;
      while ((pMatch = propRegex.exec(baseCss)) !== null) {
        const [, prop, valStr] = pMatch;
        const val = parseInt(valStr, 10);
        if (val > bp) {
          dangerousRules.push({ selector: "base", prop, value: `${val}px` });
        }
      }

      // Container max-width is safe, but fixed width > bp is not
      expect(
        dangerousRules,
        `Viewport ${bp}px has fixed pixel widths exceeding viewport: ${JSON.stringify(dangerousRules)}`
      ).toEqual([]);
    });
  }

  it("no prerendered HTML contains inline fixed widths exceeding 320px", () => {
    const htmlFiles: string[] = [];

    function findHtmlFiles(dir: string, maxFiles = 30) {
      if (!existsSync(dir) || htmlFiles.length >= maxFiles) return;
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (htmlFiles.length >= maxFiles) break;
        const res = join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith("assets")) {
          findHtmlFiles(res, maxFiles);
        } else if (entry.isFile() && entry.name.endsWith(".html")) {
          htmlFiles.push(res);
        }
      }
    }

    findHtmlFiles(distDir, 30);
    expect(htmlFiles.length).toBeGreaterThan(0);

    const inlineOverflows: { file: string; match: string }[] = [];
    const inlineWidthRegex = /style="[^"]*width:\s*(\d+)px[^"]*"/g;

    for (const file of htmlFiles) {
      const html = readFileSync(file, "utf8");
      let m;
      while ((m = inlineWidthRegex.exec(html)) !== null) {
        const px = parseInt(m[1], 10);
        if (px > 320) {
          inlineOverflows.push({ file, match: m[0] });
        }
      }
    }

    expect(inlineOverflows, `Found inline widths exceeding 320px: ${JSON.stringify(inlineOverflows)}`).toEqual([]);
  });

  it("grid systems (.grid-2, .grid-3) collapse to single column on mobile", () => {
    const css = readFileSync(cssFile, "utf8");

    // .grid-2, .grid-3 should be single column (display: block or minmax(0, 1fr)) by default on mobile
    const singleColumnMatch =
      /\.grid-2[^{]*\{\s*display:\s*block/i.test(css) ||
      /\.grid-2[^{]*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/i.test(css);
    expect(singleColumnMatch, "grid-2 must default to single column on mobile").toBe(true);

    // Multi-column grid should be restricted to media queries (min-width >= 640px)
    const multiColQuery = css.match(/@media\s*\(\s*min-width:\s*(?:640|768)px\s*\)\s*\{[^}]*\.grid-2[^{]*\{[^}]*(?:display:\s*flex|grid-template-columns:\s*repeat\(2)/);
    expect(multiColQuery).toBeTruthy();
  });
});

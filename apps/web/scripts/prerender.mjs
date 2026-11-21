// Renders every static route once per locale into dist/**/index.html using the SSR bundle.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const ssrEntry = join(root, "dist-ssr", "entry-server.js");

if (!existsSync(join(dist, "index.html")) || !existsSync(ssrEntry)) {
  console.error("prerender: run the client and SSR builds first");
  process.exit(1);
}

const template = readFileSync(join(dist, "index.html"), "utf8");
const mod = await import(pathToFileURL(ssrEntry).href);
const { render, prepare, metaFor, CATEGORY_IDS, STATIC_PATHS, LOCALES, LANG_META, SITE_URL, APP_NAME, extraPaths } = mod;
await prepare();

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const urlPath = (lang, path) => {
  if (lang === "en") return path;
  return path === "/" ? `/${lang}/` : `/${lang}${path}`;
};

const DEFAULT_FONT_LOCALES = new Set(["en", "hi", "mr"]);

function fontLinks(lang) {
  const fams = [];
  if (!DEFAULT_FONT_LOCALES.has(lang)) {
    const f = LANG_META[lang].font.replace(/ /g, "+");
    fams.push(`family=${f}:wght@400;600;700`);
  } else {
    fams.push("family=Baloo+2:wght@600;700");
  }
  fams.push("family=Nunito:wght@400;600;700");
  const href = `https://fonts.googleapis.com/css2?${fams.join("&")}&display=swap`;
  let out = `<link rel="preconnect" href="https://fonts.googleapis.com">\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n    <link rel="stylesheet" href="${href}">`;
  if (!DEFAULT_FONT_LOCALES.has(lang)) {
    const fam = LANG_META[lang].font;
    out += `\n    <style>html[lang="${lang}"] body,html[lang="${lang}"] h1,html[lang="${lang}"] h2,html[lang="${lang}"] h3,html[lang="${lang}"] .btn,html[lang="${lang}"] .chip{font-family:'${fam}','Nunito',sans-serif}</style>`;
  }
  return out;
}

function headFor(lang, path, meta, notFound) {
  const parts = [];
  parts.push(`<title>${esc(meta.title)}</title>`);
  parts.push(`<meta name="description" content="${esc(meta.description)}">`);
  if (notFound || meta.noindex) {
    parts.push('<meta name="robots" content="noindex">');
  } else {
    const canon = SITE_URL + urlPath(lang, path);
    parts.push(`<link rel="canonical" href="${canon}">`);
    for (const l of LOCALES) {
      parts.push(`<link rel="alternate" hreflang="${LANG_META[l].tag}" href="${SITE_URL + urlPath(l, path)}">`);
    }
    parts.push(`<link rel="alternate" hreflang="x-default" href="${SITE_URL + urlPath("en", path)}">`);
    parts.push(`<meta property="og:url" content="${canon}">`);
  }
  parts.push(`<meta property="og:site_name" content="${esc(APP_NAME)}">`);
  parts.push('<meta property="og:type" content="website">');
  parts.push(`<meta property="og:title" content="${esc(meta.title)}">`);
  parts.push(`<meta property="og:description" content="${esc(meta.description)}">`);
  parts.push(`<meta property="og:locale" content="${LANG_META[lang].tag}">`);
  parts.push('<link rel="manifest" href="/site.webmanifest">');
  parts.push('<meta name="theme-color" content="#E56420">');
  parts.push(fontLinks(lang));
  return parts.join("\n    ");
}

function page(lang, path, notFound = false) {
  const html = render(notFound ? "/__not-found__" : path, lang);
  const meta = metaFor(lang, notFound ? "/__not-found__" : path);
  let out = template
    .replace(/<html lang="[^"]*" dir="[^"]*">/, `<html lang="${LANG_META[lang].tag}" dir="${LANG_META[lang].dir}">`)
    .replace("<!--head-->", headFor(lang, path, meta, notFound))
    .replace("<!--app-->", html);
  if (!out.includes(html.slice(0, 40))) throw new Error("prerender: app placeholder missing in template");
  return out;
}

function writePage(rel, content) {
  const file = join(dist, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

const paths = [...STATIC_PATHS, ...CATEGORY_IDS.map((c) => `/help/${c}`), ...(extraPaths ?? [])];
let count = 0;
for (const lang of LOCALES) {
  for (const p of paths) {
    const rel = lang === "en" ? (p === "/" ? "index.html" : `${p.slice(1)}/index.html`) : p === "/" ? `${lang}/index.html` : `${lang}${p}/index.html`;
    writePage(rel, page(lang, p));
    count++;
  }
}
writePage("404.html", page("en", "/__not-found__", true));
rmSync(join(root, "dist-ssr"), { recursive: true, force: true });
console.log(`prerender: wrote ${count + 1} pages (${LOCALES.length} locales)`);

// sitemap.xml: every prerendered route in every locale, with hreflang alternates.
const sitemapEntries = paths.map((p) => {
  const alts = LOCALES.map((l) => `    <xhtml:link rel="alternate" hreflang="${LANG_META[l].tag}" href="${esc(SITE_URL + urlPath(l, p))}"/>`);
  alts.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(SITE_URL + urlPath("en", p))}"/>`);
  return LOCALES.map((l) => `  <url>\n    <loc>${esc(SITE_URL + urlPath(l, p))}</loc>\n${alts.join("\n")}\n  </url>`).join("\n");
});
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemapEntries.join("\n")}\n</urlset>\n`;
writeFileSync(join(dist, "sitemap.xml"), sitemap);
console.log(`prerender: wrote sitemap.xml with ${paths.length * LOCALES.length} URLs`);

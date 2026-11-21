// Renders every static route once per locale into dist/**/index.html using the SSR bundle.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
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

// The active locale's dictionary, as inert JSON the client reads before hydrating (not executed, so no CSP hash needed).
function i18nScript(lang) {
  const json = JSON.stringify(mod.dictFor(lang)).replace(/</g, String.fromCharCode(92) + "u003c");
  return `<script type="application/json" id="raasta-i18n">${json}</script>`;
}

function fontLinks(lang) {
  const fams = [];
  if (!DEFAULT_FONT_LOCALES.has(lang)) {
    const f = LANG_META[lang].font.replace(/ /g, "+");
    fams.push(`family=${f}:wght@400;500;600;700;800`);
  } else {
    fams.push("family=Baloo+2:wght@500;600;700;800");
  }
  fams.push("family=Nunito:wght@400;600;700;800");
  fams.push("family=Caveat:wght@600");
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
    .replace("<!--app-->", html + i18nScript(lang));
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

// CSP: allow every distinct inline <script> and <style> body by sha256 hash (no 'unsafe-inline').
function listHtml(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === "ui-preview.html") return [];
    const p = join(dir, e.name);
    if (e.isDirectory()) return listHtml(p);
    return e.name.endsWith(".html") ? [p] : [];
  });
}
const scriptHashes = new Set();
const styleHashes = new Set();
let inlineStyleAttrs = 0;
const hashOf = (body) => `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`;
for (const file of listHtml(dist)) {
  const html = readFileSync(file, "utf8");
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(m[1])) continue;
    scriptHashes.add(hashOf(m[2]));
  }
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) styleHashes.add(hashOf(m[1]));
  inlineStyleAttrs += (html.match(/\sstyle="/gi) ?? []).length;
}
const headersFile = join(dist, "_headers");
if (existsSync(headersFile)) {
  const lines = readFileSync(headersFile, "utf8").split("\n");
  const updated = lines.map((line) => {
    if (!/^\s*Content-Security-Policy:/i.test(line)) return line;
    const prefix = line.slice(0, line.indexOf(":") + 1);
    const directives = line.slice(prefix.length).split(";").map((d) => d.trim()).filter(Boolean);
    const add = (name, hashes) => {
      const i = directives.findIndex((d) => d.split(/\s+/)[0] === name);
      if (i < 0) throw new Error(`prerender: CSP has no ${name} directive`);
      const existing = directives[i].split(/\s+/).slice(1);
      const merged = [...new Set([...existing, ...hashes])];
      directives[i] = [name, ...merged].join(" ");
    };
    add("script-src", [...scriptHashes].sort());
    add("style-src", [...styleHashes].sort());
    return `${prefix} ${directives.join("; ")}`;
  });
  writeFileSync(headersFile, updated.join("\n"));
  console.log(`prerender: _headers CSP adds ${scriptHashes.size} script and ${styleHashes.size} style hashes`);
} else {
  console.warn("prerender: dist/_headers missing, CSP hashes not written");
}
if (inlineStyleAttrs > 0) console.warn(`prerender: ${inlineStyleAttrs} inline style="" attributes found; style-src-attr is not covered (would need 'unsafe-hashes')`);

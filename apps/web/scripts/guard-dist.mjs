// Build guard: fails the build if dist breaks the Raasta rules.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const TEXT = new Set([".html", ".js", ".mjs", ".css", ".svg", ".json", ".txt", ".xml", ".webmanifest"]);
const EM_DASH = String.fromCharCode(0x2014);
const MAX_JS_GZIP = 60 * 1024;

const problems = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else check(p);
  }
}

function check(file) {
  const rel = file.slice(dist.length + 1).replace(/\\/g, "/");
  const ext = extname(file);
  if (ext === ".map") problems.push(`${rel}: source map in dist`);
  if (!TEXT.has(ext)) return;
  const text = readFileSync(file, "utf8");
  if (text.includes(EM_DASH)) problems.push(`${rel}: contains U+2014`);
  if (text.includes("Vite + React")) problems.push(`${rel}: contains "Vite + React"`);
  if ((ext === ".js" || ext === ".mjs") && text.includes("console.log")) problems.push(`${rel}: contains console.log`);
}

walk(dist);

// Landing page first-load JS: scripts and modulepreloads that the modern browser fetches.
const landing = readFileSync(join(dist, "index.html"), "utf8");
const refs = new Set();
for (const m of landing.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)) refs.add(m[1]);
for (const m of landing.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)) refs.add(m[1]);
let total = 0;
for (const ref of refs) {
  const f = join(dist, ref.replace(/^\//, ""));
  total += gzipSync(readFileSync(f)).length;
}
const kb = (total / 1024).toFixed(1);
console.log(`guard: landing JS ${kb} KB gzip across ${refs.size} file(s), limit ${MAX_JS_GZIP / 1024} KB`);
if (total > MAX_JS_GZIP) problems.push(`landing JS ${kb} KB gzip exceeds ${MAX_JS_GZIP / 1024} KB`);

if (problems.length) {
  console.error("guard: FAILED");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("guard: ok");

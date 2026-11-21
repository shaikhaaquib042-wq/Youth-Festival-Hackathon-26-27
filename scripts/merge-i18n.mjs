// Merges translated strings (qa/i18n/<set>-<lang>.json, set = howto or questions) into packages/i18n/locales/<lang>.json.
// A translation is kept only if it keeps every {placeholder} and every phone number of the English text and has no em dash.
// Anything that fails stays out, so the page falls back to English for that line.
//   node scripts/merge-i18n.mjs [howto|questions]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SET = process.argv[2] ?? "howto";
const src = JSON.parse(readFileSync(join(root, `qa/i18n/${SET}-en.json`), "utf8"));
const LANGS = ["hi", "mr", "bn", "gu", "ta", "te", "kn", "ml", "pa", "or", "ur"];
const holes = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
const nums = (s) => (s.match(/\d[\d-]{2,}\d/g) ?? []).sort().join(",");

let total = 0;
for (const lang of LANGS) {
  const file = join(root, `qa/i18n/${SET}-${lang}.json`);
  if (!existsSync(file)) {
    console.log(`${lang}: no file, skipped`);
    continue;
  }
  const tr = JSON.parse(readFileSync(file, "utf8"));
  const dictPath = join(root, `packages/i18n/locales/${lang}.json`);
  const dict = JSON.parse(readFileSync(dictPath, "utf8"));
  const bad = [];
  let kept = 0;
  for (const [k, en] of Object.entries(src)) {
    const v = tr[k];
    if (typeof v !== "string" || !v.trim()) { bad.push(`${k}: missing`); continue; }
    if (holes(v) !== holes(en)) { bad.push(`${k}: placeholders`); continue; }
    if (nums(v).replace(/-/g, "") !== nums(en).replace(/-/g, "")) { bad.push(`${k}: numbers`); continue; }
    if (v.includes("—")) { bad.push(`${k}: em dash`); continue; }
    dict[k] = v.trim();
    kept++;
  }
  const sorted = Object.fromEntries(Object.keys(dict).sort().map((k) => [k, dict[k]]));
  writeFileSync(dictPath, JSON.stringify(sorted, null, 2) + "\n");
  total += kept;
  console.log(`${lang}: kept ${kept}/${Object.keys(src).length}${bad.length ? `, dropped ${bad.length} (${bad.slice(0, 4).join("; ")}${bad.length > 4 ? "; ..." : ""})` : ""}`);
}
console.log(`merged ${total} strings`);

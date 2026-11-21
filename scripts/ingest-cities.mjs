// Builds packages/data/src/offices.cities.json from the researched source (packages/data/source/offices-major-cities.json).
// Every entry starts verified:false: an office only counts as verified after scripts/check-links.mjs confirms its source page.
import { readFileSync, writeFileSync } from "node:fs";
const src = JSON.parse(readFileSync("packages/data/source/offices-major-cities.json", "utf8"));
const pune = new Set(JSON.parse(readFileSync("packages/data/src/offices.pune.json", "utf8")).map((o) => o.id));
const clean = (s) => (typeof s === "string" ? s.replace(/—/g, ", ").trim() : s);
const out = src
  .filter((o) => !pune.has(o.id))
  .map((o) => {
    const r = { id: o.id, type: o.type, name: clean(o.name), city: o.city, state_code: o.state_code, verified: false, source: o.source_url ?? "research" };
    for (const k of ["address", "phone", "email", "website"]) if (o[k]) r[k] = clean(o[k]);
    return r;
  });
writeFileSync("packages/data/src/offices.cities.json", JSON.stringify(out, null, 2) + "\n");
console.log("wrote", out.length, "offices");

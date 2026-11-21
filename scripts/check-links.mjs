// Polite, sequential link checker for every URL in the data registry.
// - Checks platforms.json URLs, state grievance portals and SLSA links, and city-office sources and websites.
// - A link counts as live on HTTP 2xx or 3xx (HEAD first, GET fallback for servers that reject HEAD).
// - Writes qa/link-report.json and flips `verified` to true only for state portals and city offices whose link is live.
// - Exits 1 if any URL mentions the retired edaakhil.nic.in domain.
// Usage: node scripts/check-links.mjs [--write]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const WRITE = process.argv.includes("--write");
const UA = "Raasta/1.0 link checker (hackathon project)";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const platforms = read("packages/data/src/platforms.json");
const states = read("packages/data/src/states.json");
const cities = read("packages/data/src/offices.cities.json");

function collect(obj, out, where) {
  if (typeof obj === "string") {
    if (/^https?:\/\//.test(obj)) out.push({ url: obj, where });
  } else if (Array.isArray(obj)) obj.forEach((v, i) => collect(v, out, `${where}[${i}]`));
  else if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj)) collect(v, out, `${where}.${k}`);
}

const targets = [];
for (const p of platforms) collect(p.urls ?? {}, targets, `platform:${p.id}`);
for (const s of states) {
  if (s.grievance_portal?.url) targets.push({ url: s.grievance_portal.url, where: `state:${s.code}:portal` });
  if (s.slsa?.url) targets.push({ url: s.slsa.url, where: `state:${s.code}:slsa` });
}
for (const o of cities) {
  if (o.source?.startsWith("http")) targets.push({ url: o.source, where: `office:${o.id}:source` });
  if (o.website) targets.push({ url: o.website, where: `office:${o.id}:website` });
}

const unique = [...new Map(targets.map((t) => [t.url, t])).values()];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function probe(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(url, { method, redirect: "manual", signal: ctrl.signal, headers: { "user-agent": UA } });
      clearTimeout(timer);
      if (res.status < 400) return { status: res.status, ok: true };
      if (method === "GET" || ![403, 405, 501].includes(res.status)) return { status: res.status, ok: false };
    } catch (e) {
      if (method === "GET") return { status: 0, ok: false, error: String(e.name ?? e) };
    }
  }
  return { status: 0, ok: false };
}

const results = {};
let bad = 0;
for (const [i, t] of unique.entries()) {
  const r = await probe(t.url);
  results[t.url] = { ...r, where: t.where };
  if (!r.ok) bad++;
  process.stdout.write(`${i + 1}/${unique.length} ${r.ok ? "ok " : "BAD"} ${r.status} ${t.url}\n`);
  await sleep(600);
}

const edaakhil = unique.filter((t) => /edaakhil/i.test(t.url) && !/deprecated/.test(t.where));
mkdirSync("qa", { recursive: true });
writeFileSync("qa/link-report.json", JSON.stringify({ checked_at: new Date().toISOString(), total: unique.length, bad, results }, null, 2) + "\n");
console.log(`\n${unique.length} links, ${bad} not reachable. Report: qa/link-report.json`);

if (WRITE) {
  const live = (u) => !!u && results[u]?.ok === true;
  for (const s of states) {
    if (s.grievance_portal) s.grievance_portal.verified = live(s.grievance_portal.url);
    if (s.slsa) s.slsa.verified = live(s.slsa.url);
  }
  for (const o of cities) o.verified = live(o.source) || live(o.website);
  writeFileSync("packages/data/src/states.json", JSON.stringify(states, null, 2) + "\n");
  writeFileSync("packages/data/src/offices.cities.json", JSON.stringify(cities, null, 2) + "\n");
  console.log(`verified: ${cities.filter((o) => o.verified).length}/${cities.length} city offices`);
}

if (edaakhil.length) {
  console.error("Retired edaakhil URL found:", edaakhil.map((t) => t.where).join(", "));
  process.exit(1);
}

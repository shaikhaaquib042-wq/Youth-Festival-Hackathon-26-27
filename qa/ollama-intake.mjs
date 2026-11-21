// Intake sweep: sends real-sounding complaints to the LOCAL Worker (which uses local Ollama for understanding)
// and checks where each one lands. Run while `npm run local` is up:  node qa/ollama-intake.mjs
// Writes qa/ollama-intake-report.json. Never contacts the hosted site.
import { writeFileSync } from "node:fs";

const BASE = process.env.RAASTA_LOCAL_API ?? "http://127.0.0.1:8787";
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(BASE)) throw new Error("Local API only");

const CASES = [
  ["My landlord in Pune is not returning my deposit of 30000 for 2 months", "security_deposit"],
  ["There is a huge pothole on our road for weeks", "civic_failure"],
  ["Rs 20000 was taken from my account by UPI fraud just now", "cyber_fraud", { emergency: true }],
  ["I was sexually assaulted by a neighbour last night", "police_complaint", { violence: true, noAmount: true }],
  ["People keep trolling and bullying me on Instagram with a fake profile", "cyber_harassment", { noAmount: true }],
  ["I lost my mobile phone in the bus", "lost_mobile", { noAmount: true }],
  ["My employer has not paid my salary for 3 months", "unpaid_wages"],
  ["The washing machine I bought is faulty and the shop refuses to replace it", "consumer_refund"],
  ["माझा मोबाईल हरवला आहे", "lost_mobile"],
  ["मकान मालिक मेरा डिपॉजिट वापस नहीं दे रहा", "security_deposit"],
];

const out = [];
for (const [text, expected, opts = {}] of CASES) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/intake`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:4173" },
    body: JSON.stringify({ text, lang: "en" }),
  });
  const body = await res.json().catch(() => ({}));
  const slots = body.slots ?? body;
  const problems = [];
  if (res.status !== 200) problems.push(`HTTP ${res.status}`);
  if (slots.dispute_type !== expected) problems.push(`dispute ${slots.dispute_type} != ${expected}`);
  if (opts.emergency && !slots.is_emergency) problems.push("not marked emergency");
  if (opts.emergency && (slots.missing_fields ?? []).length) problems.push("asks questions before 1930");
  if (opts.violence && !slots.violence_indicated) problems.push("violence not detected");
  if (opts.noAmount && (slots.missing_fields ?? []).some((f) => /amount/.test(f))) problems.push("asks for money");
  const row = { text, expected, got: slots.dispute_type, source: body.source, ms: Date.now() - t0, problems };
  out.push(row);
  console.log(`${problems.length ? "FAIL" : "ok  "} ${row.ms}ms ${expected.padEnd(20)} ${problems.join("; ")}`);
}
writeFileSync(new URL("./ollama-intake-report.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(`${out.filter((r) => !r.problems.length).length}/${out.length} passed`);

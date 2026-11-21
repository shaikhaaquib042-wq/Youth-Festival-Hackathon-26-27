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
  ["Owner did not send fees for my work", "unpaid_wages"],
  ["My head did not give me my stipend", "unpaid_wages"],
  ["The coaching class is not refunding my fees", "consumer_refund"],
  ["Bank deducted wrong charges from my account and is not reversing them", "banking_nbfc"],
  ["My PF withdrawal claim is stuck for months", "pension_pf"],
  ["Builder has not given possession of my flat for 2 years", "builder_delay"],
  ["Someone keeps sending threatening messages on WhatsApp", "cyber_harassment"],
  ["My neighbour is building and my wall has cracked", "neighbour_construction"],
  ["My ration card application is pending for months at the office", "govt_service"],
  ["The insurance company rejected my health claim", "insurance_claim"],
  ["The shopkeeper charged more than MRP for water bottle", "mrp_overcharge"],
  ["My manager touches me and makes sexual comments at office", "workplace_harassment"],
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

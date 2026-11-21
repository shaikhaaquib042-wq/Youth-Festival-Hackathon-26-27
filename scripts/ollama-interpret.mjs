// Drafts plain-language platform insights with a local model (qwen3.5:4b via Ollama).
// Run: node scripts/ollama-interpret.mjs
// Output: packages/data/src/derived/platform-insights.json (source "qwen3.5:4b-draft").
// Hard facts (URLs, phones, emails, fees, deadlines) are never produced here; outputs that contain them are rejected.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { platformInsightSchema, platformInsightsFileSchema, DISPUTE_IDS } from "../packages/data/src/schemas.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OLLAMA = "http://localhost:11434";
const MODEL = "qwen3.5:4b";
const OUT_DIR = join(ROOT, "packages/data/src/derived");
const OUT = join(OUT_DIR, "platform-insights.json");

const platforms = JSON.parse(readFileSync(join(ROOT, "packages/data/src/platforms.json"), "utf8"));

// Reject anything that carries a hard fact. These must come from platforms.json only.
const BAD = [
  { re: /https?:\/\/|www\.|\.gov\.in|\.nic\.in|\.org\b|\.com\b|\.in\/|@/i, why: "url or email" },
  { re: /\+?\d[\d\s-]{8,}\d|\b1800\b|\b1930\b|\b15100\b|\b1915\b|\b112\b|\b1091\b/, why: "phone or helpline number" },
  { re: /₹|\bRs\.?\s?\d|\bINR\b|\brupees?\b|\brs\s?\d/i, why: "rupee figure" },
  { re: /\b\d+\s*(working\s+)?(day|days|hour|hours|hr|hrs|month|months|year|years)\b/i, why: "day count" },
  { re: /2014/, why: "em dash" },
];

const outputSchema = z.object({
  plain_summary_en: z.string().min(1),
  who_should_use: z.string().min(1),
  intent_keywords: z.object({ en: z.array(z.string()), hi: z.array(z.string()), mr: z.array(z.string()) }),
  dispute_types: z.array(z.string()),
  first_peaceful_step_hint: z.string().min(1),
});

function leakReason(obj) {
  const text = JSON.stringify(obj);
  for (const { re, why } of BAD) if (re.test(text)) return why;
  if (obj.plain_summary_en.trim().split(/\s+/).length > 50) return "summary over 50 words";
  return null;
}

function slim(p) {
  // Send the model only the descriptive fields; facts are kept out of the prompt.
  const pick = (k) => p[k];
  return JSON.stringify(
    {
      name: pick("name"),
      managing_body: pick("managing_body"),
      tier: pick("tier"),
      domain: pick("domain"),
      jurisdiction: pick("jurisdiction"),
      categories: pick("categories"),
      exclusions: pick("exclusions"),
      step_by_step_guide: (pick("step_by_step_guide") || []).slice(0, 6),
    },
    null,
    1,
  ).slice(0, 5000);
}

function prompt(p) {
  return [
    "You write plain-language summaries for a civic grievance app used by people in India.",
    "Read the platform description below and reply with ONLY a JSON object with exactly these keys:",
    '{ "plain_summary_en": "at most 50 words, Class 8 reading level", "who_should_use": "one sentence", "intent_keywords": {"en": [], "hi": [], "mr": []}, "dispute_types": [], "first_peaceful_step_hint": "one sentence on the first step to try before this platform" }',
    `dispute_types must be chosen only from: ${DISPUTE_IDS.join(", ")}.`,
    "intent_keywords: 3 to 6 short everyday words or phrases a citizen might type, in English, Hindi and Marathi.",
    "Do NOT write any URL, website, email address, phone or helpline number, rupee amount, fee, or number of days or hours. Do not use dashes as punctuation.",
    "",
    "Platform description:",
    slim(p),
  ].join("\n");
}

async function chat(content) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      format: "json",
      stream: false,
      think: false,
      options: { temperature: 0.2 },
      messages: [{ role: "user", content }],
    }),
    signal: AbortSignal.timeout(240000),
  });
  if (!res.ok) throw new Error(`ollama HTTP ${res.status}`);
  const body = await res.json();
  return body.message?.content ?? "";
}

function parseCandidate(raw, platformId) {
  const parsed = outputSchema.parse(JSON.parse(raw));
  const dispute_types = parsed.dispute_types.filter((d) => DISPUTE_IDS.includes(d));
  const candidate = { platform_id: platformId, ...parsed, dispute_types };
  const checked = platformInsightSchema.parse(candidate);
  const reason = leakReason(checked);
  if (reason) throw new Error(`rejected: ${reason}`);
  return checked;
}

async function interpret(p) {
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await chat(prompt(p));
      return parseCandidate(raw, p.id);
    } catch (err) {
      lastErr = err;
      console.warn(`  ${p.id} attempt ${attempt} failed: ${err.message}`);
    }
  }
  console.warn(`  ${p.id}: skipped after retry`);
  return null;
}

async function main() {
  // Check Ollama is up and the model is present (pull is left to the operator).
  const tags = await fetch(`${OLLAMA}/api/tags`).then((r) => r.json());
  if (!tags.models?.some((m) => m.name === MODEL || m.model === MODEL)) {
    throw new Error(`model ${MODEL} missing; run: ollama pull ${MODEL}`);
  }
  const items = [];
  for (const p of platforms) {
    console.log(`interpreting ${p.id}`);
    const item = await interpret(p);
    if (item) items.push(item);
  }
  const file = { source: "qwen3.5:4b-draft", generated_at: new Date().toISOString(), items };
  platformInsightsFileSchema.parse(file);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, JSON.stringify(file, null, 2) + "\n", "utf8");
  console.log(`wrote ${items.length}/${platforms.length} insights to packages/data/src/derived/platform-insights.json`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

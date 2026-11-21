// Generate the voice clips with Gemini TTS → public/audio/<lang>/<id>.m4a
// Run: node scripts/gen-audio.mjs [mr hi kn te en]   (default: mr hi kn te en)
// Needs GEMINI_API_KEY in .env.local (server/dev only — never VITE_). macOS `afconvert` turns the PCM into AAC.
// Text = exactly what the app shows (same tables + number words as scripts/audio-script.mjs).
// Re-run after changing any spoken string; existing files are skipped unless FORCE=1.
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { CLIPS, NUMBER_WORDS } from '../src/i18n/clips.js';

const root = new URL('../', import.meta.url).pathname;
const env = Object.fromEntries(
  readFileSync(`${root}.env.local`, 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY missing in .env.local'); process.exit(1); }

const LANGS = process.argv.slice(2).length ? process.argv.slice(2) : ['mr', 'hi', 'kn', 'te', 'en'];
const NAMES = { mr: 'Marathi', hi: 'Hindi', kn: 'Kannada', te: 'Telugu', en: 'Indian English' };
const VOICE = process.env.GEMINI_VOICE || 'Kore'; // calm, firm; try 'Charon' / 'Aoede' if it sounds off
const tables = Object.fromEntries(await Promise.all(['en', 'mr', 'hi', 'kn', 'te'].map(async (l) => [l, (await import(`../src/i18n/${l}.js`)).default])));

const DEV = '०१२३४५६७८९';
const toInt = (s) => parseInt([...s].map((c) => (DEV.includes(c) ? DEV.indexOf(c) : c)).join(''), 10);
const spoken = (lang, key, vars = {}) => {
  let s = (tables[lang][key] ?? tables.en[key]).replace(/\{(\w+)\}/g, (_, k) => vars[k]);
  s = s.replace(/[0-9०-९]+/g, (m) => NUMBER_WORDS[lang]?.[toInt(m)] ?? m);
  s = s.replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '').trim(); // no emoji in speech
  return lang === 'kn' ? s.replaceAll('ಎಂಟುಕ್ಕೆ', 'ಎಂಟಕ್ಕೆ') : s;
};

// Pick a TTS model this key can use (names change; prefer the newest flash TTS).
const API = 'https://generativelanguage.googleapis.com/v1beta';
async function pickModel() {
  if (process.env.GEMINI_TTS_MODEL) return process.env.GEMINI_TTS_MODEL;
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': KEY } });
  if (!r.ok) throw new Error(`list models: ${r.status} ${await r.text()}`);
  const names = (await r.json()).models.map((m) => m.name.replace('models/', '')).filter((n) => n.includes('tts'));
  if (!names.length) throw new Error('no TTS model available for this key');
  names.sort((a, b) => (b.includes('flash') - a.includes('flash')) || b.localeCompare(a));
  console.log('TTS models:', names.join(', '));
  return names[0];
}

async function tts(model, lang, text) {
  const prompt = `Read the following ${NAMES[lang]} text aloud exactly as written, as a native ${NAMES[lang]} speaker: calm, clear, friendly, slightly slow, like a public-safety announcement. Do not add or translate anything.\n\n${text}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(`${API}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
      }),
    });
    if (r.ok) {
      const part = (await r.json())?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (part) return { pcm: Buffer.from(part.inlineData.data, 'base64'), mime: part.inlineData.mimeType };
    } else if (r.status !== 429 && r.status < 500) {
      throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`);
    }
    await new Promise((res) => setTimeout(res, 4000 * attempt)); // rate limit / transient
  }
  throw new Error('gave up after retries');
}

function wav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const model = await pickModel();
console.log(`model ${model}, voice ${VOICE}, langs ${LANGS.join(' ')}`);
let ok = 0, fail = 0;
for (const lang of LANGS) {
  mkdirSync(`${root}public/audio/${lang}`, { recursive: true });
  for (const c of CLIPS) {
    const out = `${root}public/audio/${lang}/${c.id}.m4a`;
    if (existsSync(out) && !process.env.FORCE) continue;
    const text = spoken(lang, c.key, c.vars);
    try {
      const { pcm, mime } = await tts(model, lang, text);
      const rate = Number(/rate=(\d+)/.exec(mime ?? '')?.[1] ?? 24000);
      const tmp = `${out}.wav`;
      writeFileSync(tmp, wav(pcm, rate));
      execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '48000', tmp, out]);
      unlinkSync(tmp);
      ok++; console.log(`✓ ${lang}/${c.id}  ${text}`);
    } catch (e) {
      fail++; console.error(`✗ ${lang}/${c.id}: ${e.message}`);
    }
  }
}
console.log(`done: ${ok} made, ${fail} failed. Then add the languages to CONFIG.HEAT.AUDIO_CLIP_LANGS in config.js.`);

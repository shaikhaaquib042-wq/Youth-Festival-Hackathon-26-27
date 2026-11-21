// English voice clips with Deepgram Aura-2 → public/audio/en/<id>.m4a  (Deepgram TTS has no Indian languages.)
// Run: node scripts/gen-audio-deepgram.mjs   (FORCE=1 to redo; DG_VOICE=aura-2-harmonia-en by default)
// Key: DEEPGRAM_API_KEY in .env.local (never VITE_). Text = exactly the app's English strings.
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { CLIPS, NUMBER_WORDS } from '../src/i18n/clips.js';
import en from '../src/i18n/en.js';

const root = decodeURIComponent(new URL('../', import.meta.url).pathname);
const KEY = process.env.DEEPGRAM_API_KEY || readFileSync(`${root}.env.local`, 'utf8').match(/^DEEPGRAM_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) { console.error('DEEPGRAM_API_KEY missing'); process.exit(1); }
const VOICE = process.env.DG_VOICE || 'aura-2-harmonia-en';
const only = process.argv.slice(2);

const spoken = (key, vars = {}) => en[key].replace(/\{(\w+)\}/g, (_, k) => vars[k])
  .replace(/\b\d+\b/g, (m) => NUMBER_WORDS.en?.[+m] ?? m)
  .replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '').replace(/\s+/g, ' ').trim();

mkdirSync(`${root}public/audio/en`, { recursive: true });
let ok = 0, fail = 0;
for (const c of CLIPS) {
  if (only.length && !only.includes(c.id)) continue;
  const out = `${root}public/audio/en/${c.id}.m4a`;
  if (existsSync(out) && !process.env.FORCE) continue;
  const text = spoken(c.key, c.vars);
  try {
    const r = await fetch(`https://api.deepgram.com/v1/speak?model=${VOICE}&encoding=mp3`, {
      method: 'POST', headers: { authorization: `Token ${KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
    const tmp = `${out}.mp3`;
    writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', tmp, out]);
    unlinkSync(tmp);
    ok++; console.log(`✓ en/${c.id}  "${text}"`);
  } catch (e) { fail++; console.error(`✗ en/${c.id}: ${e.message}`); }
}
console.log(`done: ${ok} made, ${fail} failed (voice ${VOICE})`);

// Voice alerts (PRD §21.3) via the Web Speech API — ORCHESTRATOR-OWNED.
// Spoken language: the UI language if the city pack lists it under `languages.voice`, else the pack's first voice language.
// Maharashtra packs: mr, hi · Karnataka: kn, te · Telangana: te, hi (see citypacks/*.json).
// Fallbacks: no Marathi voice (e.g. macOS) → read the Marathi text with a Hindi voice (same Devanagari script);
// no voice for the language at all → English voice speaks the English text. Screen text is always shown regardless.
import { LANGS, getLang, tIn } from './index.js';
import { cityPack } from '../../config.js';

const SCRIPT_FALLBACK = { mr: 'hi' }; // voice language that can read this script

let voices = [];
const loadVoices = () => { voices = speechSynthesis?.getVoices?.() ?? []; };
if (globalThis.speechSynthesis) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

const voiceFor = (lang) => {
  const tag = LANGS[lang]?.bcp47.toLowerCase();
  return voices.find((v) => v.lang.toLowerCase().replace('_', '-') === tag) ?? null;
};

/** Which language will be spoken for the current UI language in this pack. */
export function voiceLang(pack = cityPack()) {
  const allowed = pack.languages?.voice ?? ['en'];
  return allowed.includes(getLang()) ? getLang() : allowed[0];
}

/** Report what the device can actually speak — show this in settings / check before the demo. */
export function voiceSupport() {
  loadVoices();
  return Object.fromEntries(Object.keys(LANGS).map((l) => [l, voiceFor(l)?.name ?? (SCRIPT_FALLBACK[l] && voiceFor(SCRIPT_FALLBACK[l]) ? `via ${voiceFor(SCRIPT_FALLBACK[l]).name}` : null)]));
}

/**
 * Speak a localised message. Returns the {lang, voice, text} actually used (null if speech unavailable).
 * @param {string} key  i18n key, e.g. 'heat.cycle'
 * @param {object} vars template vars, e.g. {work: 30, rest: 30}
 */
export function speak(key, vars, { pack = cityPack(), interrupt = true } = {}) {
  if (!globalThis.speechSynthesis) return null;
  loadVoices();
  const lang = voiceLang(pack);
  const text = tIn(lang, key, vars);
  let voice = voiceFor(lang) ?? (SCRIPT_FALLBACK[lang] && voiceFor(SCRIPT_FALLBACK[lang]));
  let spokenText = text;
  if (!voice) { voice = voiceFor('en'); spokenText = tIn('en', key, vars); }

  const u = new SpeechSynthesisUtterance(spokenText);
  if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = LANGS[lang].bcp47; }
  u.rate = 0.95;
  if (interrupt) speechSynthesis.cancel();
  speechSynthesis.speak(u);
  navigator.vibrate?.([200, 100, 200]);
  return { lang, voice: voice?.name ?? null, text: spokenText };
}

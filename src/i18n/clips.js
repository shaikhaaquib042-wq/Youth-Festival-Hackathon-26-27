// Pre-recorded voice clips (PRD §21.3). File: public/audio/<lang>/<id>.m4a (AAC; generated with Gemini TTS: scripts/gen-audio.mjs)
// speak() plays a clip when one exists for (key, vars) and the language is listed in CONFIG.AUDIO_CLIP_LANGS;
// otherwise it falls back to the device's text-to-speech. Script for recording: docs/audio-script.md
export const CLIPS = [
  { id: 'heat-normal', key: 'heat.normal', vars: { n: 20 } },
  { id: 'heat-cycle-45-15', key: 'heat.cycle', vars: { work: 45, rest: 15 } },
  { id: 'heat-cycle-30-30', key: 'heat.cycle', vars: { work: 30, rest: 30 } },
  { id: 'heat-cycle-15-45', key: 'heat.cycle', vars: { work: 15, rest: 45 } },
  { id: 'heat-stop', key: 'heat.stop' },
  { id: 'heat-water', key: 'heat.water' },
  { id: 'heat-break-15', key: 'heat.breakStart', vars: { n: 15 } },
  { id: 'heat-break-30', key: 'heat.breakStart', vars: { n: 30 } },
  { id: 'heat-break-45', key: 'heat.breakStart', vars: { n: 45 } },
  { id: 'unwell-emergency', key: 'unwell.emergency' },
  { id: 'unwell-firstaid', key: 'unwell.firstAid' },
  { id: 'unwell-exhaustion', key: 'unwell.exhaustion' },
  { id: 'flood-do-not-enter', key: 'red.doNotEnter' },
  { id: 'flood-route-avoid', key: 'voice.routeAvoid' },
  { id: 'alert-official', key: 'voice.officialAlert' },
  { id: 'card-flood-safe', key: 'card.flood.safe' },
  { id: 'card-flood-careful', key: 'severity.yellow' },
  { id: 'onb-ready', key: 'onb.ready' },
];

const same = (a = {}, b = {}) => {
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => String(a[k]) === String(b[k]));
};
export const findClip = (key, vars) => CLIPS.find((c) => c.key === key && same(c.vars, vars)) ?? null;

// Numbers as spoken words, so recordings don't read "20" in English. Screen text keeps digits.
export const NUMBER_WORDS = {
  mr: { 15: 'पंधरा', 20: 'वीस', 30: 'तीस', 45: 'पंचेचाळीस', 108: 'एकशे आठ', 1: 'एक' },
  hi: { 15: 'पंद्रह', 20: 'बीस', 30: 'तीस', 45: 'पैंतालीस', 108: 'एक सौ आठ', 1: 'एक' },
  kn: { 15: 'ಹದಿನೈದು', 20: 'ಇಪ್ಪತ್ತು', 30: 'ಮೂವತ್ತು', 45: 'ನಲವತ್ತೈದು', 108: 'ಒಂದು ಸೊನ್ನೆ ಎಂಟು', 1: 'ಒಂದು' },
  te: { 15: 'పదిహేను', 20: 'ఇరవై', 30: 'ముప్పై', 45: 'నలభై ఐదు', 108: 'ఒకటి సున్నా ఎనిమిది', 1: 'ఒక' },
  en: { 108: 'one zero eight' },
};

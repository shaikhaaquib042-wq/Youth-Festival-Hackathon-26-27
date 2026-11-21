// 🎤 Voice (step V + V+). Tap the mic → speak → tap again (auto-stops) → /api/transcribe (Deepgram, server-side key).
// 1) Spoken cry for help (engine/sos.js) → Help sheet straight away, no sign-in needed.
// 2) Rain side otherwise → Report form pre-filled from the words (type, depth, underpass, place) — user still taps Send.
// Never auto-dials. The 🆘 button stays; voice is never the only way to Help (no network → no transcript).
import { t, getLang, onLang } from '../i18n/index.js';
import { detectHelp, sosKeyterms } from '../engine/sos.js';
import { matchPlaces, classifyPost } from '../engine/gazetteer.js';
import { toast } from './report.js';

const MAX_MS = 12000;
let btn, overlay, rec = null, stream = null, timer = null, deps;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * @param {{gazetteer: any[], openHelp: (o?:object)=>void, openReport: (o?:object)=>void, getHazard: ()=>string}} d
 */
export function initVoice(d) {
  deps = d;
  btn = document.createElement('button');
  btn.id = 'voice-btn';
  btn.type = 'button';
  btn.textContent = '🎤';
  overlay = document.createElement('div');
  overlay.id = 'voice-overlay';
  overlay.hidden = true;
  document.getElementById('app')?.append(btn, overlay);
  onLang(() => { btn.setAttribute('aria-label', t('voice.button')); btn.title = t('voice.button'); });
  btn.addEventListener('click', () => (rec ? stop() : start()));
  overlay.addEventListener('click', () => rec && stop());
}

function show(html) { overlay.innerHTML = html; overlay.hidden = false; }
function hide() { overlay.hidden = true; }

async function start() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return toast(t('voice.noMic'));
  if (!navigator.onLine) return toast(t('voice.offline'));
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return toast(t('voice.noMic'));
  }
  const chunks = [];
  rec = new MediaRecorder(stream);
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    stream?.getTracks().forEach((tr) => tr.stop());
    stream = null;
    rec = null;
    btn.classList.remove('rec');
    send(new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' }));
  };
  rec.start();
  btn.classList.add('rec');
  show(`<div class="vo-card"><div class="vo-pulse">🎤</div><b>${esc(t('voice.listening'))}</b><small>${esc(t('voice.stop'))}</small></div>`);
  timer = setTimeout(stop, MAX_MS);
}

function stop() {
  clearTimeout(timer);
  if (rec && rec.state !== 'inactive') rec.stop();
}

async function send(blob) {
  if (blob.size < 1000) { hide(); return toast(t('voice.notHeard')); }
  show(`<div class="vo-card"><div class="vo-pulse">⏳</div><b>${esc(t('voice.working'))}</b></div>`);
  const lang = getLang();
  const q = new URLSearchParams({ lang });
  // Hints for Deepgram: help words + the city's place names (in the speaker's script when the gazetteer has it).
  const isDeva = lang === 'mr' || lang === 'hi';
  const places = deps.gazetteer
    .map((p) => (isDeva && p.aliases?.find((a) => /[\u0900-\u097F]/.test(a))) || p.name.replace(/\s*\(.*\)$/, '').split(',')[0])
    .filter((n, i, a) => n.length <= 30 && a.indexOf(n) === i)
    .slice(0, 30);
  [...sosKeyterms(lang), ...places, 'underpass', 'knee deep', 'ankle deep'].forEach((k) => q.append('keyterm', k));
  let text = '';
  try {
    const r = await fetch(`/api/transcribe?${q}`, { method: 'POST', headers: { 'content-type': blob.type.split(';')[0] }, body: blob });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { hide(); return toast(d.error === 'not_configured' ? t('voice.unavailable') : t('voice.notHeard')); }
    text = (d.transcript ?? '').trim();
  } catch {
    hide();
    return toast(t('voice.offline'));
  }
  hide();
  handleTranscript(text);
}

/** Exported for testing / the demo: run the same logic on typed text (window.__voice('मदत करा')). */
export function handleTranscript(text) {
  if (!text) return toast(t('voice.notHeard'));
  const sos = detectHelp(text);
  const hazard = deps.getHazard();
  const toReport = () => {
    const c = classifyPost(text);
    const place = matchPlaces(text, deps.gazetteer)[0] ?? null;
    deps.openReport({ prefill: { type: c.type, depth: c.depthKnown ? c.depth : null, inUnderpass: c.underpass, place, transcript: text } });
  };
  if (sos.help) return deps.openHelp({ heard: text, onContinue: hazard === 'flood' ? toReport : null });
  if (hazard === 'flood') return toReport();
  toast(`${t('voice.heard', { text })} · ${t('voice.tryHelp')}`, 5000);
}

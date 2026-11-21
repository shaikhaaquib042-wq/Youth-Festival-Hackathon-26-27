// First-run setup: 3 taps — language → who are you → location. Big buttons, pictures, own-script language names.
// Shown once (sajag.onboarded). ?setup=1 shows it again, ?setup=0 skips it. Skipped for ?scenario= links (judge demo).
import { t, setLang, LANGS, pickerLangs } from '../i18n/index.js';
import { speak } from '../i18n/speak.js';
import { CONFIG, cityPack, CITY_PACKS } from '../../config.js';
import { distM } from '../engine/geo.js';
import { WHO, applyWho, currentWho } from './profile.js';
import { requestLocation, getFix } from '../location.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let el, step = 0, rec = null; // rec = { lang, city } recommended from the device position

/** Which of our city packs is the person in (inside its bounds, else the nearest within 150 km)? */
export function cityForFix(fix) {
  if (!fix) return null;
  const packs = Object.values(CITY_PACKS);
  const inside = packs.find((p) => { const [w, s, e, n] = p.bounds; return fix.lng >= w && fix.lng <= e && fix.lat >= s && fix.lat <= n; });
  if (inside) return inside;
  let best = null, bd = Infinity;
  for (const p of packs) { const d = distM(fix, { lat: p.center[1], lng: p.center[0] }); if (d < bd) { bd = d; best = p; } }
  return bd <= 150000 ? best : null;
}

/** Only if location permission was ALREADY granted — never prompt on the first screen. */
async function detectLanguage() {
  try {
    const p = await navigator.permissions?.query({ name: 'geolocation' });
    if (p?.state !== 'granted') return;
    const fix = getFix() ?? await requestLocation({ timeoutMs: 6000 });
    const city = cityForFix(fix);
    if (city?.languages?.default) { rec = { lang: city.languages.default, city }; updateRecommendation(); }
  } catch { /* permissions API unavailable */ }
}

function updateRecommendation() {
  const label = el?.querySelector('.rec-tag');
  if (label && rec) label.textContent = `📍 ${LANGS[rec.lang].name} · ${t('onb.recommended', { city: rec.city.name })}`;
}

function render() {
  if (step === 0) {
    el.innerHTML = `<div class="onb"><div class="onb-logo">सजग · Sajag</div>
      <h1>${esc(t('onb.pickLang'))}</h1>
      <div class="onb-grid">${pickerLangs(cityPack()).map((l) => `<button class="tile" data-lang="${l}"><span class="big">${esc(LANGS[l].name)}</span></button>`).join('')}</div>
      <span class="rec-tag" aria-live="polite"></span></div>`;
    updateRecommendation();
  } else if (step === 1) {
    el.innerHTML = `<div class="onb"><h1>${esc(t('more.who'))}</h1>
      <div class="onb-grid">${WHO.map((w) => `<button class="tile ${currentWho() === w.id ? 'on' : ''}" data-who="${w.id}"><span class="ico">${w.icon}</span><span>${esc(t(w.key))}</span></button>`).join('')}</div>
      <button class="btn btn-ghost" data-act="back">←</button></div>`;
  } else {
    el.innerHTML = `<div class="onb"><div class="ico huge">📍</div><h1>${esc(t('onb.location'))}</h1>
      <button class="btn btn-primary btn-xl" data-act="allow">${esc(t('onb.allow'))}</button>
      <button class="btn btn-ghost" data-act="skip">${esc(t('onb.skip'))}</button></div>`;
  }
}

function finish(overlay) {
  if (!overlay.isConnected) return;
  try { localStorage.setItem('sajag.onboarded', '1'); } catch { /* ignore */ }
  overlay.remove();
  speak('onb.ready');
}

export function startOnboarding({ force = false } = {}) {
  const q = new URLSearchParams(location.search);
  const inSeason = Object.values(CONFIG.SEASON_HAZARD).some((months) => months.includes(new Date().getMonth() + 1));
  const explicitHazard = ['flood', 'heat'].includes(q.get('hazard'));
  const switchHazard = !force && !inSeason && !explicitHazard && !q.has('scenario');
  let done = false; try { done = localStorage.getItem('sajag.onboarded') === '1'; } catch { /* ignore */ }
  if (!force && q.get('setup') === '0') return; // ?setup=0 = skip (demo links, screenshots)
  if (!force && (done || q.has('scenario')) && !q.has('setup')) return;
  step = 0; rec = null;
  el = document.createElement('div');
  el.id = 'onboarding';
  document.body.append(el);
  const overlay = el;
  overlay.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.lang) { setLang(b.dataset.lang); step = 1; return render(); }
    if (b.dataset.who) { applyWho(b.dataset.who, { switchHazard }); step = 2; return render(); }
    if (b.dataset.act === 'back') { step = Math.max(0, step - 1); return render(); }
    if (b.dataset.act === 'allow') { b.disabled = true; await requestLocation({ timeoutMs: 10000 }); return finish(overlay); }
    if (b.dataset.act === 'skip') return finish(overlay);
  });
  render();
  detectLanguage();
}

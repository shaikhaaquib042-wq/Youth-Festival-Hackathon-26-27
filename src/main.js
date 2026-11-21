import './style.css';
import { createMap } from './map/map.js';
import { addPinLayers, showHazard } from './map/pins.js';
import { watchSachet } from './feeds/sachet.js';
import { CONFIG, cityPack } from '../config.js';
import { t, initLang, setLang, onLang, pickerLangs, LANGS } from './i18n/index.js';
import { speak, voiceSupport } from './i18n/speak.js';
import { startStore, getPins } from './store.js';
import { initReport, onVote, setReportHazard } from './ui/report.js';
import { mountAccountChip } from './ui/signin.js';
import { initLocation, getFix } from './location.js';
import { initRoute } from './ui/route.js';
import { initShift } from './heat/ui/shift.js';
import { initUnwell } from './heat/ui/unwell.js';

const pack = cityPack();
initLang(pack);
window.__i18n = { t, setLang, speak, voiceSupport }; // console testing: __i18n.setLang('kn'); __i18n.speak('heat.water')

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Language picker — city pack languages first, then the rest.
const picker = document.getElementById('lang-picker');
picker.innerHTML = pickerLangs(pack).map((l) => `<option value="${l}">${LANGS[l].name}</option>`).join('');
picker.addEventListener('change', () => setLang(picker.value));

const map = createMap('map', pack);
window.__map = map; // handy for debugging in the console
window.__pins = getPins;

// Static text + mode chip (§6.6 — Scenario player flips the chip to SCENARIO).
onLang((lang) => {
  picker.value = lang;
  document.getElementById('mode-chip').textContent = t('mode.live');
  document.getElementById('disclaimer').textContent = t('disclaimer');
  document.querySelectorAll('[data-k]').forEach((el) => { el.textContent = t(el.dataset.k); });
  document.title = `${t('app.name')} — ${pack.name}`;
});

// Pins + live reports (PRD §5, §22.5).
startStore();
initLocation(map);
window.__fix = getFix;
addPinLayers(map, { onVote });
initReport(map);
initRoute(map);
initUnwell();
initShift();
mountAccountChip(document.getElementById('account-chip'));

// Flood | Heat toggle (PRD §22.1). ?hazard=heat deep link; last choice remembered.
const HZ_KEY = 'sajag.hazard';
function setHazard(h) {
  document.querySelectorAll('#hazard-toggle [data-h]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.h === h)));
  document.body.dataset.hazard = h;
  showHazard(map, h);
  setReportHazard(h);
  try { localStorage.setItem(HZ_KEY, h); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('sajag:hazard', { detail: { hazard: h } }));
}
document.getElementById('hazard-toggle').addEventListener('click', (e) => { const b = e.target.closest('[data-h]'); if (b) setHazard(b.dataset.h); });
let saved = null; try { saved = localStorage.getItem(HZ_KEY); } catch { /* ignore */ }
setHazard(new URLSearchParams(location.search).get('hazard') ?? saved ?? 'flood');

// Official alert banner (Tier 1, SACHET). Real feed; shows the latest alert mentioning this city. Feed text is escaped.
const banner = document.getElementById('alert-banner');
watchSachet((alerts) => {
  window.__sachet = alerts; // all city-matched alerts incl. history (useful for the hotspot-memory / authority views)
  const a = alerts[0];
  const ageH = a ? Math.round((Date.now() - Date.parse(a.publishedAt)) / 36e5) : Infinity;
  if (ageH > CONFIG.SACHET_ACTIVE_HOURS) { banner.hidden = true; return; }
  banner.hidden = false;
  const src = /^https:\/\/sachet\.ndma\.gov\.in\//.test(a.link) ? a.link : 'https://sachet.ndma.gov.in/';
  banner.innerHTML = `<b>${esc(t('alert.official'))} · SACHET/${esc(a.author.match(/\(([^)]+)\)/)?.[1] ?? 'NDMA')}</b> · ${ageH} h — ${esc(a.title)} <a href="${esc(src)}" target="_blank" rel="noopener">↗</a>`;
}, pack);

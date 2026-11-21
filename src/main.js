import './style.css';
import { createMap } from './map/map.js';
import { addPinLayers, showHazard } from './map/pins.js';
import { initAlerts } from './ui/alerts.js';
import { CONFIG, cityPack } from '../config.js';
import { t, initLang, setLang, onLang, pickerLangs, LANGS } from './i18n/index.js';
import { speak, voiceSupport } from './i18n/speak.js';
import { startStore, getPins } from './store.js';
import { initReport, onVote, setReportHazard, openReport } from './ui/report.js';
import { mountAccountChip } from './ui/signin.js';
import { initLocation, getFix } from './location.js';
import { initRoute } from './ui/route.js';
import { initShift } from './heat/ui/shift.js';
import { initUnwell } from './heat/ui/unwell.js';
import { initScenario } from './scenario/player.js';
import { initMore } from './ui/more.js';
import { initHelp } from './ui/help.js';
import { startOnboarding } from './ui/onboarding.js';
import { startWeather } from './feeds/openmeteo.js';
import { initWeatherLayers } from './map/weather.js';
import { initCards } from './ui/cards.js';
import { initCitySwitch } from './ui/citySwitch.js';

const pack = cityPack();
initLang(pack);
window.__i18n = { t, setLang, speak, voiceSupport }; // console testing: __i18n.setLang('kn'); __i18n.speak('heat.water')

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

window.addEventListener('sajag:set-hazard', (e) => setHazard(e.detail.hazard)); // used by the Scenario player

// Official alert banner (Tier 1, SACHET live; scenario alerts tagged SIMULATED).
initAlerts(pack);

// Scenario player (PRD §6.6) — tap the LIVE chip or More → Demo. ?scenario=<id> autoloads.
initScenario();

// Simple shell (UX pass): More menu, Help sheet, 💧 near-me toggle, first-run setup.
initMore(map, { openReportCooling: () => openReport() });
initHelp();
let coolingOn = false;
document.getElementById('cool-btn').addEventListener('click', () => {
  coolingOn = !coolingOn;
  document.getElementById('cool-btn').classList.toggle('on', coolingOn);
  window.dispatchEvent(new CustomEvent('sajag:show-cooling', { detail: { on: coolingOn } }));
});
window.addEventListener('sajag:hazard', () => { coolingOn = false; document.getElementById('cool-btn').classList.remove('on'); });
startOnboarding();

// ==== step 4 wiring (agy) ====
startWeather(pack);
initWeatherLayers(map, pack);
initCards(map, {
  getHazard: () => document.body.dataset.hazard ?? 'flood',
  onHazardChange: (fn) => {
    window.addEventListener('sajag:hazard', (e) => fn(e.detail.hazard));
    document.getElementById('hazard-toggle')?.addEventListener('click', () => {
      setTimeout(() => fn(document.body.dataset.hazard ?? 'flood'), 0);
    });
  },
});
// ==== end step 4 wiring ====

// ==== city switch (codex) ====
initCitySwitch();
// ==== end city switch ====

// ==== PWA: service worker (production only — would fight Vite HMR in dev) ====
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

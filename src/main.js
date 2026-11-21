import './style.css';
import { initTheme } from './theme.js';
initTheme(); // before the map, so it starts in the right flavor
import { createMap } from './map/map.js';
import { addPinLayers, showHazard } from './map/pins.js';
import { initAlerts } from './ui/alerts.js';
import { CONFIG, cityPack } from '../config.js';
import { t, initLang, setLang, onLang, pickerLangs, LANGS } from './i18n/index.js';
import { speak, voiceSupport } from './i18n/speak.js';
import { startStore, getPins, gazetteer } from './store.js';
import { initReport, onVote, setReportHazard, openReport } from './ui/report.js';
import { mountAccountChip } from './ui/signin.js';
import { initLocation, getFix } from './location.js';
import { initRoute } from './ui/route.js';
import { initShift } from './heat/ui/shift.js';
import { initUnwell } from './heat/ui/unwell.js';
import { initScenario } from './scenario/player.js';
import { initMore } from './ui/more.js';
import { initHelp, openHelp } from './ui/help.js';
import { initMyReports } from './ui/myreports.js';
import { initPaste } from './ui/paste.js';
import { initVoice, handleTranscript } from './ui/voice.js';
import { startOnboarding } from './ui/onboarding.js';
import { startWeather } from './feeds/openmeteo.js';
import { initWeatherLayers } from './map/weather.js';
import { initCards } from './ui/cards.js';
import { initCitySwitch } from './ui/citySwitch.js';
import './theme-fixes.css';

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
  window.dispatchEvent(new CustomEvent('sajag:hazard', { detail: { hazard: h } }));
}
// Season by real calendar month (not the scenario clock): Feb–May → Heat, Jun–Oct → Rain (CONFIG.SEASON_HAZARD).
const month = new Date().getMonth() + 1;
const season = Object.entries(CONFIG.SEASON_HAZARD).find(([, ms]) => ms.includes(month))?.[0] ?? 'none';
document.getElementById('hazard-toggle').addEventListener('click', (e) => {
  const b = e.target.closest('[data-h]');
  if (!b) return;
  setHazard(b.dataset.h);
  try { localStorage.setItem(HZ_KEY, JSON.stringify({ h: b.dataset.h, season })); } catch { /* ignore */ } // manual pick, valid this season
});
let pick = null; try { pick = JSON.parse(localStorage.getItem(HZ_KEY)); } catch { /* old plain-string value or none */ }
const urlHazard = new URLSearchParams(location.search).get('hazard');
setHazard(urlHazard ?? (pick?.season === season ? pick.h : null) ?? (season !== 'none' ? season : pick?.h) ?? 'flood');

window.addEventListener('sajag:set-hazard', (e) => setHazard(e.detail.hazard)); // used by the Scenario player

// Official alert banner (Tier 1, SACHET live; scenario alerts tagged SIMULATED).
initAlerts(pack);

// Scenario player (PRD §6.6) — tap the LIVE chip or More → Demo. ?scenario=<id> autoloads.
initScenario();

// Simple shell (UX pass): More menu, Help sheet, 💧 near-me toggle, first-run setup.
initMore(map, { openReportCooling: () => openReport() });
initHelp();
initMyReports(map); // 👤 My reports: current + previous reports, people helped
initPaste(map);
// 🎤 Voice: spoken help → Help sheet; otherwise a pre-filled report (step V / V+). window.__voice('…') runs it on typed text.
initVoice({ gazetteer, openHelp, openReport, getHazard: () => document.body.dataset.hazard ?? 'flood' });
window.__voice = handleTranscript;
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

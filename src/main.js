import './style.css';
import { createMap } from './map/map.js';
import { watchSachet } from './feeds/sachet.js';
import { CONFIG, cityPack } from '../config.js';
import { t, initLang, setLang, onLang, pickerLangs, LANGS } from './i18n/index.js';
import { speak, voiceSupport } from './i18n/speak.js';

const pack = cityPack();
initLang(pack);
window.__i18n = { t, setLang, speak, voiceSupport }; // console testing: __i18n.setLang('kn'); __i18n.speak('heat.water')

// Language picker — city pack languages first, then the rest.
const picker = document.getElementById('lang-picker');
picker.innerHTML = pickerLangs(pack).map((l) => `<option value="${l}">${LANGS[l].name}</option>`).join('');
picker.addEventListener('change', () => setLang(picker.value));
const map = createMap('map', pack);
window.__map = map; // handy for debugging in the console

// Mode chip (§6.6) — Scenario player will flip this to SCENARIO.
onLang((lang) => {
  picker.value = lang;
  document.getElementById('mode-chip').textContent = t('mode.live');
  document.title = `${t('app.name')} — ${pack.name}`;
});

// Official alert banner (Tier 1, SACHET). Real feed; shows the latest alert mentioning this city.
const banner = document.getElementById('alert-banner');
watchSachet((alerts) => {
  window.__sachet = alerts; // all city-matched alerts incl. history (useful for the hotspot-memory / authority views)
  const a = alerts[0];
  const ageH = a ? Math.round((Date.now() - Date.parse(a.publishedAt)) / 36e5) : Infinity;
  if (ageH > CONFIG.SACHET_ACTIVE_HOURS) { banner.hidden = true; return; }
  banner.hidden = false;
  banner.innerHTML = `<b>${t('alert.official')} · SACHET/${a.author.match(/\(([^)]+)\)/)?.[1] ?? 'NDMA'}</b> · ${ageH} h ago — ${a.title} <a href="${a.link}" target="_blank" rel="noopener">source</a>`;
}, pack);

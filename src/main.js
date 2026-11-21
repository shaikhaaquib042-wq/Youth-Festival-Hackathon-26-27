import './style.css';
import { createMap } from './map/map.js';
import { watchSachet } from './feeds/sachet.js';
import { CONFIG, cityPack } from '../config.js';

const pack = cityPack();
const map = createMap('map', pack);
window.__map = map; // handy for debugging in the console

// Mode chip (§6.6) — Scenario player will flip this to SCENARIO.
document.getElementById('mode-chip').textContent = 'LIVE';

// Official alert banner (Tier 1, SACHET). Real feed; shows the latest alert mentioning this city.
const banner = document.getElementById('alert-banner');
watchSachet((alerts) => {
  window.__sachet = alerts; // all city-matched alerts incl. history (useful for the hotspot-memory / authority views)
  const a = alerts[0];
  const ageH = a ? Math.round((Date.now() - Date.parse(a.publishedAt)) / 36e5) : Infinity;
  if (ageH > CONFIG.SACHET_ACTIVE_HOURS) { banner.hidden = true; return; }
  banner.hidden = false;
  banner.innerHTML = `<b>OFFICIAL · SACHET/${a.author.match(/\(([^)]+)\)/)?.[1] ?? 'NDMA'}</b> · ${ageH} h ago — ${a.title} <a href="${a.link}" target="_blank" rel="noopener">source</a>`;
}, pack);

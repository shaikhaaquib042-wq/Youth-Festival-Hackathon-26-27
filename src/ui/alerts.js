// Official alert banner (Tier 1). Live: NDMA SACHET feed. Scenario: SACHET-format SIMULATED alerts (always tagged).
import { watchSachet } from '../feeds/sachet.js';
import { CONFIG } from '../../config.js';
import { t, onLang } from '../i18n/index.js';
import { now } from '../store.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let banner, live = [], scenario = null;

function render() {
  const a = scenario?.[0] ?? live[0];
  if (!a) { banner.hidden = true; return; }
  const ageMin = Math.max(0, Math.round((now() - Date.parse(a.publishedAt)) / 60000));
  if (!a.simulated && ageMin / 60 > CONFIG.SACHET_ACTIVE_HOURS) { banner.hidden = true; return; }
  const src = !a.simulated && /^https:\/\/sachet\.ndma\.gov\.in\//.test(a.link) ? a.link : null;
  const who = a.author?.match(/\(([^)]+)\)/)?.[1] ?? a.author ?? 'NDMA';
  const age = ageMin < 120 ? t('pin.ageMin', { n: ageMin }) : `${Math.round(ageMin / 60)} h`;
  banner.hidden = false;
  banner.classList.toggle('simulated', !!a.simulated);
  banner.innerHTML = `${a.simulated ? `<span class="tag-sim">${esc(t('tag.simulated'))}</span> ` : ''}<b>${esc(t('alert.official'))} · SACHET/${esc(who)}</b> · ${esc(age)} — ${esc(a.title)}${src ? ` <a href="${esc(src)}" target="_blank" rel="noopener">↗</a>` : ''}`;
}

/** Scenario player: pass SACHET-shaped alerts ({title, author, publishedAt, simulated:true}) or null to return to live. */
export function setScenarioAlerts(list) { scenario = list && list.length ? list : null; render(); }

export function initAlerts(pack) {
  banner = document.getElementById('alert-banner');
  watchSachet((alerts) => { window.__sachet = alerts; live = alerts; render(); }, pack);
  onLang(() => render());
  setInterval(render, 30_000);
}

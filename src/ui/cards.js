// Status cards UI (PRD §21, §22.1, §22.2, §23).
// Verdict-first: Flood card & Heat card side-by-side, never merged into one colour.
// Large card for active hazard, mini chip for inactive side, red breakthrough banner if hidden side is RED.
import './cards.css';

const toDate = (at) => new Date(/Z$|[+-]\d{2}:\d{2}$/.test(at) ? at : `${at}+05:30`);
function safeAgainVars(hs) {
  const sa = hs.safeAgain;
  if (!sa?.at) return sa?.vars ?? {};
  let time = fmtClock(toDate(sa.at));
  if (hs.showMhSop && time < '16:00') time = '16:00';
  return { ...sa.vars, time };
}
import { getPins, subscribe, now, fmtClock } from '../store.js';
import { getFix, onFix } from '../location.js';
import { nearestCell, onGrid } from '../feeds/openmeteo.js';
import { setMode } from '../map/pins.js';
import { t, onLang } from '../i18n/index.js';
import { speak } from '../i18n/speak.js';
import { cityPack, CONFIG } from '../../config.js';
import {
  advise,
  computeFloodCardStatus,
  computeHeatCardStatus,
} from '../engine/advisory.js';

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );

let container = null;
let currentMap = null;
let activeHazard = 'flood';
let userMode = 'commuter';
let workType = 'moderate';
let newToHeat = false;

function loadStoredPrefs() {
  try {
    userMode = localStorage.getItem('sajag.userMode') || 'commuter';
    workType = localStorage.getItem('sajag.workType') || 'moderate';
    newToHeat = localStorage.getItem('sajag.newToHeat') === '1';
  } catch {
    /* private mode */
  }
}

function getUserLocation() {
  const fix = getFix();
  if (fix?.lat != null && fix?.lng != null) {
    return { lat: fix.lat, lng: fix.lng };
  }
  if (currentMap) {
    const c = currentMap.getCenter();
    return { lat: c.lat, lng: c.lng };
  }
  const pack = cityPack();
  return { lat: pack.center[1], lng: pack.center[0] };
}

function switchHazard(target) {
  const btn = document.querySelector(`#hazard-toggle [data-h="${target}"]`);
  if (btn) btn.click();
  activeHazard = target;
  document.body.dataset.hazard = target;
  window.dispatchEvent(new CustomEvent('sajag:hazard', { detail: { hazard: target } }));
  render();
}

function render() {
  if (!container || !currentMap) return;

  const pack = cityPack();
  const isMaharashtra = pack?.id === 'pune' || pack?.id === 'mumbai';
  const userLoc = getUserLocation();
  const cell = nearestCell(userLoc);
  const currentTime = now();
  const pins = getPins({ includeCooling: false });

  // Compute status for both hazards
  const floodStatus = computeFloodCardStatus({
    pins,
    cell,
    userLoc,
    mode: userMode,
    now: currentTime,
    maxDistM: 1000,
  });

  const heatStatus = computeHeatCardStatus({
    cell,
    workType,
    newToHeat,
    isMaharashtra,
    now: currentTime,
    cfg: CONFIG?.HEAT,
  });

  const adviceList = advise({
    cell,
    pins,
    mode: userMode,
    now: currentTime,
  });

  container.innerHTML = '';

  // 1. Red Breakthrough Banner (if hidden side is RED)
  const hiddenHazard = activeHazard === 'flood' ? 'heat' : 'flood';
  const hiddenStatus = activeHazard === 'flood' ? heatStatus : floodStatus;

  if (hiddenStatus.level === 'red') {
    const banner = document.createElement('div');
    banner.className = 'card-breakthrough';
    const hiddenTitle = t(hiddenHazard === 'heat' ? 'hazard.heat' : 'hazard.flood');
    const hiddenAction = t(hiddenStatus.actionKey, hiddenStatus.actionVars);
    banner.innerHTML = `
      <span>⚠️ <b>${esc(hiddenTitle)} RED:</b> ${esc(hiddenAction)}</span>
      <button type="button" class="btn-switch">${esc(t('card.tapToSwitch'))} ❯</button>
    `;
    banner.onclick = () => switchHazard(hiddenHazard);
    container.appendChild(banner);
  }

  // 2. Active status card
  const activeCard = document.createElement('div');
  const activeLevel = activeHazard === 'flood' ? floodStatus.level : heatStatus.level;
  activeCard.className = `status-card sev-${activeLevel}`;

  if (activeHazard === 'flood') {
    // ── Flood Card ──────────────────────────────────────────
    const sevLabel = t('severity.' + floodStatus.level);
    const actionText = t(floodStatus.actionKey, floodStatus.actionVars);

    // Header with mode selector + sound button
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
      <div class="card-title-group">
        <span class="card-title">🌧️ ${esc(t('card.floodTitle'))}</span>
        <span class="card-badge badge-${floodStatus.level}">${esc(sevLabel)}</span>
      </div>
      <div class="card-controls">
        <select class="select-mode" aria-label="Mode">
          <option value="commuter"${userMode === 'commuter' ? ' selected' : ''}>${esc(t('mode.commuter'))}</option>
          <option value="rider"${userMode === 'rider' ? ' selected' : ''}>${esc(t('mode.rider'))}</option>
          <option value="parent"${userMode === 'parent' ? ' selected' : ''}>${esc(t('mode.parent'))}</option>
          <option value="pedestrian"${userMode === 'pedestrian' ? ' selected' : ''}>${esc(t('mode.pedestrian'))}</option>
        </select>
        <button type="button" class="btn-speak" title="${esc(t('card.readAloud'))}">🔊</button>
      </div>
    `;

    header.querySelector('.select-mode').onchange = (e) => {
      userMode = e.target.value;
      try { localStorage.setItem('sajag.userMode', userMode); } catch { /* ignore */ }
      setMode(userMode);
      window.dispatchEvent(new CustomEvent('sajag:mode', { detail: { mode: userMode } }));
      render();
    };

    header.querySelector('.btn-speak').onclick = () => {
      speak(floodStatus.actionKey, floodStatus.actionVars);
    };

    activeCard.appendChild(header);

    // Action line
    const actionEl = document.createElement('div');
    actionEl.className = 'card-action-line';
    actionEl.textContent = actionText;
    activeCard.appendChild(actionEl);

    // Evidence line
    const evidenceEl = document.createElement('div');
    evidenceEl.className = 'card-evidence-line';
    if (floodStatus.evidence) {
      const nearStr = floodStatus.evidence.near
        ? ` · ${t('report.near', { name: floodStatus.evidence.near })}`
        : '';
      evidenceEl.textContent =
        t('report.evidence', {
          n: floodStatus.evidence.confirmations,
          age: floodStatus.evidence.ageMin,
        }) + nearStr;
    } else {
      const precip = cell?.current?.precipitation ?? 0;
      evidenceEl.textContent = `${t('card.noFloodNearby')} (${precip} mm)`;
    }
    activeCard.appendChild(evidenceEl);

    // "Before you leave" advisory strip
    const advEl = document.createElement('div');
    advEl.className = 'card-advisory-strip';
    const advText = adviceList.map((a) => t(a.key, a.vars)).join(' · ');
    advEl.innerHTML = `<b>🎒 ${esc(t('advice.title'))}:</b> ${esc(advText)}`;
    activeCard.appendChild(advEl);

  } else {
    // ── Heat Card ───────────────────────────────────────────
    const sevLabel = t('severity.' + heatStatus.level);
    const actionText = t(heatStatus.actionKey, heatStatus.actionVars);

    // Header with work type selector + new to heat + sound button
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
      <div class="card-title-group">
        <span class="card-title">☀️ ${esc(t('card.heatTitle'))}</span>
        <span class="card-badge badge-${heatStatus.level}">${esc(sevLabel)}</span>
      </div>
      <div class="card-controls">
        <select class="select-work" aria-label="Work workload">
          <option value="light"${workType === 'light' ? ' selected' : ''}>${esc(t('work.light'))}</option>
          <option value="moderate"${workType === 'moderate' ? ' selected' : ''}>${esc(t('work.moderate'))}</option>
          <option value="heavy"${workType === 'heavy' ? ' selected' : ''}>${esc(t('work.heavy'))}</option>
        </select>
        <label class="toggle-newtoheat">
          <input type="checkbox"${newToHeat ? ' checked' : ''}>
          <span>${esc(t('heat.newToHeat'))}</span>
        </label>
        <button type="button" class="btn-speak" title="${esc(t('card.readAloud'))}">🔊</button>
      </div>
    `;

    header.querySelector('.select-work').onchange = (e) => {
      workType = e.target.value;
      try { localStorage.setItem('sajag.workType', workType); } catch { /* ignore */ }
      render();
    };

    header.querySelector('.toggle-newtoheat input').onchange = (e) => {
      newToHeat = e.target.checked;
      try { localStorage.setItem('sajag.newToHeat', newToHeat ? '1' : '0'); } catch { /* ignore */ }
      render();
    };

    header.querySelector('.btn-speak').onclick = () => {
      speak(heatStatus.actionKey, heatStatus.actionVars);
    };

    activeCard.appendChild(header);

    // Action line
    const actionEl = document.createElement('div');
    actionEl.className = 'card-action-line';
    actionEl.textContent = actionText;
    activeCard.appendChild(actionEl);

    // Conditions line (temperature + estimated WBGT)
    const condEl = document.createElement('div');
    condEl.className = 'card-conditions-line';
    condEl.textContent = t('heat.conditions', {
      temp: Math.round(heatStatus.temp),
      wbgt: heatStatus.wbgt,
    });
    activeCard.appendChild(condEl);

    // Safe again time
    if (heatStatus.safeAgain?.i18nKey) {
      const safeEl = document.createElement('div');
      safeEl.className = 'card-safe-again';
      safeEl.textContent = t(heatStatus.safeAgain.i18nKey, safeAgainVars(heatStatus));
      activeCard.appendChild(safeEl);
    }

    // NDMA Advisory on orange/red
    if (heatStatus.showNdma) {
      const ndmaEl = document.createElement('div');
      ndmaEl.className = 'card-ndma';
      ndmaEl.textContent = t('heat.ndmaAdvisory');
      activeCard.appendChild(ndmaEl);
    }

    // Maharashtra SOP on orange/red
    if (heatStatus.showMhSop) {
      const sopEl = document.createElement('div');
      sopEl.className = 'card-sop';
      sopEl.textContent = t('heat.mhSop');
      activeCard.appendChild(sopEl);
    }

    // "Before you leave" advisory strip
    const advEl = document.createElement('div');
    advEl.className = 'card-advisory-strip';
    const advText = adviceList.map((a) => t(a.key, a.vars)).join(' · ');
    advEl.innerHTML = `<b>🎒 ${esc(t('advice.title'))}:</b> ${esc(advText)}`;
    activeCard.appendChild(advEl);
  }

  container.appendChild(activeCard);

  // 3. Mini chip for the inactive hazard
  const miniChip = document.createElement('div');
  miniChip.className = 'card-mini-chip';
  const inactiveIcon = hiddenHazard === 'heat' ? '☀️' : '🌧️';
  const inactiveName = t(hiddenHazard === 'heat' ? 'hazard.heat' : 'hazard.flood');
  const inactiveSev = t('severity.' + hiddenStatus.level);
  miniChip.innerHTML = `
    <span class="mini-dot dot-${hiddenStatus.level}"></span>
    <span>${inactiveIcon} <b>${esc(inactiveName)}:</b> ${esc(inactiveSev)}</span>
    <span style="opacity: 0.6; font-size: 10px;">❯</span>
  `;
  miniChip.onclick = () => switchHazard(hiddenHazard);
  container.appendChild(miniChip);
}

/**
 * Initializes the Status Cards under the top bar.
 */
export function initCards(map, { getHazard, onHazardChange } = {}) {
  currentMap = map;
  loadStoredPrefs();
  setMode(userMode);

  if (!container) {
    container = document.createElement('div');
    container.id = 'status-cards-root';
    document.getElementById('app')?.appendChild(container);
  }

  if (getHazard) {
    activeHazard = getHazard() || 'flood';
  } else {
    activeHazard = document.body.dataset.hazard || 'flood';
  }

  const handleHazardUpdate = (h) => {
    if (!h) return;
    activeHazard = h;
    render();
  };

  if (onHazardChange) {
    onHazardChange(handleHazardUpdate);
  }

  window.addEventListener('sajag:hazard', (e) => {
    handleHazardUpdate(e.detail?.hazard);
  });

  // Watch for direct dataset changes
  const observer = new MutationObserver(() => {
    const h = document.body.dataset.hazard;
    if (h && h !== activeHazard) {
      handleHazardUpdate(h);
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-hazard'] });

  // Subscriptions for reactive data changes
  subscribe(() => render());
  onGrid(() => render());
  onFix(() => render());
  onLang(() => render());

  map.on('moveend', () => {
    // If no active GPS fix, re-evaluate status at the new map center
    if (!getFix()) render();
  });

  render();
}

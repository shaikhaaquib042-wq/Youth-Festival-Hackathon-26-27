// Status cards UI (PRD §21, §22.1, §22.2, §23).
// One big answer: big emoji, short sentence in large type (≥ 24 px), big 🔊 button (≥ 56 px).
// Secondary details collapsed by default. Safe-to-work-again stays visible when orange/red.
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
let detailsOpen = false;

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

const FLOOD_EMOJIS = {
  green: '✅',
  yellow: '⚠️',
  orange: '⚠️',
  red: '⛔',
};

const HEAT_EMOJIS = {
  green: '😊',
  yellow: '🥵',
  orange: '🥵',
  red: '🛑',
};

function render() {
  if (!container || !currentMap) return;

  // Preserve details toggle state across re-renders
  const existingDetails = container.querySelector('.card-more-details');
  if (existingDetails) {
    detailsOpen = existingDetails.open;
  }

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
  const advText = adviceList.map((a) => t(a.key, a.vars)).join(' · ');

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

  // Main row: Big emoji + Large type headline + Big speak button
  const mainRow = document.createElement('div');
  mainRow.className = 'card-main-row';

  const emojiEl = document.createElement('div');
  emojiEl.className = 'card-emoji';

  const textGroup = document.createElement('div');
  textGroup.className = 'card-text-block';

  const headlineEl = document.createElement('div');
  headlineEl.className = 'card-headline';

  const speakBtn = document.createElement('button');
  speakBtn.type = 'button';
  speakBtn.className = 'btn-speak-big';
  speakBtn.setAttribute('aria-label', t('card.readAloud'));
  speakBtn.title = t('card.readAloud');
  speakBtn.textContent = '🔊';

  // Collapsed "More details ▾" section
  const detailsEl = document.createElement('details');
  detailsEl.className = 'card-more-details';
  if (detailsOpen) detailsEl.open = true;
  detailsEl.ontoggle = () => { detailsOpen = detailsEl.open; };

  const summaryEl = document.createElement('summary');
  summaryEl.className = 'card-more-summary';
  summaryEl.textContent = `${t('card.moreDetails')} ▾`;
  detailsEl.appendChild(summaryEl);

  const moreContent = document.createElement('div');
  moreContent.className = 'card-more-content';

  if (activeHazard === 'flood') {
    // ── Flood Card ──────────────────────────────────────────
    emojiEl.textContent = FLOOD_EMOJIS[floodStatus.level] || '⚠️';

    let floodWord = t('card.flood.safe');
    if (floodStatus.level === 'red') {
      floodWord = t('card.flood.danger');
    } else if (floodStatus.level === 'yellow' || floodStatus.level === 'orange') {
      floodWord = t('card.flood.careful');
    }
    headlineEl.textContent = floodWord;
    textGroup.appendChild(headlineEl);

    speakBtn.onclick = () => {
      if (floodStatus.level === 'red') {
        speak('red.doNotEnter');
      } else if (floodStatus.level === 'yellow' || floodStatus.level === 'orange') {
        speak('severity.yellow');
      } else {
        speak('card.flood.safe');
      }
    };

    // Details: Evidence line
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
    moreContent.appendChild(evidenceEl);

    // Details: Advisory strip
    const advEl = document.createElement('div');
    advEl.className = 'card-advisory-strip';
    advEl.innerHTML = `<b>🎒 ${esc(t('advice.title'))}:</b> ${esc(advText)}`;
    moreContent.appendChild(advEl);

  } else {
    // ── Heat Card ───────────────────────────────────────────
    emojiEl.textContent = HEAT_EMOJIS[heatStatus.level] || '🥵';

    headlineEl.textContent = t('heat.level.' + heatStatus.level);
    textGroup.appendChild(headlineEl);

    // Work / rest sentence
    const sublineEl = document.createElement('div');
    sublineEl.className = 'card-subline';
    sublineEl.textContent = t(heatStatus.actionKey, heatStatus.actionVars);
    textGroup.appendChild(sublineEl);

    // Key feature: Safe to work again stays visible when level is orange/red
    const isHighHeat = heatStatus.level === 'orange' || heatStatus.level === 'red';
    if (isHighHeat && heatStatus.safeAgain?.i18nKey) {
      const safeEl = document.createElement('div');
      safeEl.className = 'card-safe-again';
      safeEl.textContent = t(heatStatus.safeAgain.i18nKey, safeAgainVars(heatStatus));
      textGroup.appendChild(safeEl);
    }

    speakBtn.onclick = () => {
      speak(heatStatus.actionKey, heatStatus.actionVars);
    };

    // Details: Conditions line with WBGT behind small ⓘ toggle
    const condEl = document.createElement('div');
    condEl.className = 'card-conditions-line';
    condEl.innerHTML = `
      <span>🌡️ <b>${Math.round(heatStatus.temp)}°C</b></span>
      <button type="button" class="btn-wbgt-info" title="Info" aria-label="Info">ⓘ</button>
      <div class="wbgt-popup" hidden>
        ${esc(t('heat.conditions', { temp: Math.round(heatStatus.temp), wbgt: heatStatus.wbgt }))} (${esc(t('card.regionalEst'))})
      </div>
    `;
    const wbgtBtn = condEl.querySelector('.btn-wbgt-info');
    const wbgtPopup = condEl.querySelector('.wbgt-popup');
    wbgtBtn.onclick = (e) => {
      e.stopPropagation();
      wbgtPopup.hidden = !wbgtPopup.hidden;
    };
    moreContent.appendChild(condEl);

    // Details: Safe-again if green/yellow (orange/red is already visible above)
    if (!isHighHeat && heatStatus.safeAgain?.i18nKey) {
      const safeEl = document.createElement('div');
      safeEl.className = 'card-safe-again';
      safeEl.textContent = t(heatStatus.safeAgain.i18nKey, safeAgainVars(heatStatus));
      moreContent.appendChild(safeEl);
    }

    // Details: NDMA Advisory on orange/red
    if (heatStatus.showNdma) {
      const ndmaEl = document.createElement('div');
      ndmaEl.className = 'card-ndma';
      ndmaEl.textContent = t('heat.ndmaAdvisory');
      moreContent.appendChild(ndmaEl);
    }

    // Details: Maharashtra SOP on orange/red
    if (heatStatus.showMhSop) {
      const sopEl = document.createElement('div');
      sopEl.className = 'card-sop';
      sopEl.textContent = t('heat.mhSop');
      moreContent.appendChild(sopEl);
    }

    // Details: Advisory strip
    const advEl = document.createElement('div');
    advEl.className = 'card-advisory-strip';
    advEl.innerHTML = `<b>🎒 ${esc(t('advice.title'))}:</b> ${esc(advText)}`;
    moreContent.appendChild(advEl);
  }

  mainRow.appendChild(emojiEl);
  mainRow.appendChild(textGroup);
  mainRow.appendChild(speakBtn);
  activeCard.appendChild(mainRow);

  detailsEl.appendChild(moreContent);
  activeCard.appendChild(detailsEl);
  container.appendChild(activeCard);

  // 3. Mini chip for the inactive hazard
  const miniChip = document.createElement('div');
  miniChip.className = 'card-mini-chip';
  const inactiveIcon = hiddenHazard === 'heat' ? '☀️' : '🌧️';
  const inactiveName = t(hiddenHazard === 'heat' ? 'hazard.heat' : 'hazard.flood');
  let chipStatusWord = t('chip.ok');
  if (hiddenStatus.level === 'red') {
    chipStatusWord = t('chip.danger');
  } else if (hiddenStatus.level === 'yellow' || hiddenStatus.level === 'orange') {
    chipStatusWord = t('chip.caution');
  }

  miniChip.innerHTML = `
    <span class="mini-dot dot-${hiddenStatus.level}"></span>
    <span>${inactiveIcon} <b>${esc(inactiveName)}:</b> ${esc(chipStatusWord)}</span>
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

  // Listen to profile / mode events from Setup and More menu
  window.addEventListener('sajag:mode', (e) => {
    if (e.detail?.mode) {
      userMode = e.detail.mode;
      setMode(userMode);
      render();
    }
  });

  window.addEventListener('sajag:profile', (e) => {
    if (e.detail) {
      if (e.detail.userMode) {
        userMode = e.detail.userMode;
        setMode(userMode);
      }
      if (e.detail.workType) workType = e.detail.workType;
      if (e.detail.newToHeat !== undefined) {
        newToHeat = e.detail.newToHeat === '1' || e.detail.newToHeat === true;
      }
      render();
    }
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

// Report flow (PRD §6.3, §22.3, §22.4): < 10 s, one hand, picture-first.
// Login required (sheet opens if signed out). Position = map centre under crosshair.
// Must stay within REPORT_MAX_DISTANCE_M of the GPS fix.
import { t, onLang } from '../i18n/index.js';
import { CONFIG } from '../../config.js';
import { makePin } from '../engine/pin.js';
import { distM } from '../engine/geo.js';
import { currentUser, onAuth, ensureAnonUser } from '../backend/auth.js';
import { submitReport, vote } from '../backend/reports.js';
import { addLocalPin, refreshLive } from '../store.js';
import { openSignIn, takeIntent } from './signin.js';
import { getFix, requestLocation } from '../location.js';
import { depthIcon } from './depthIcons.js';

let map, hazard = 'flood', sheet, crosshair, draft = null, sending = null, photoRead = 0;
const MAX_PHOTO_BYTES = 200_000;

export function toast(msg, ms = 3500) {
  const b = document.getElementById('toast');
  if (!b) return;
  b.textContent = msg;
  b.hidden = false;
  clearTimeout(toast.tm);
  toast.tm = setTimeout(() => {
    b.hidden = true;
  }, ms);
}

const TYPES = { flood: ['flood', 'clog'], heat: ['cooling'] };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const AMENITY_ICONS = {
  water: '🚰',
  shade: '🌳',
  ors: '💊',
  clinic: '🏥',
  toilet: '🚻',
  cool_room: '❄️',
};

function ensureSheet() {
  if (sheet) return;
  crosshair = document.createElement('div');
  crosshair.className = 'crosshair';
  crosshair.hidden = true;
  crosshair.textContent = '📍';
  document.getElementById('app')?.append(crosshair);

  sheet = document.createElement('div');
  sheet.className = 'report-sheet';
  sheet.hidden = true;
  document.getElementById('app')?.append(sheet);

  sheet.addEventListener('click', onClick);
  sheet.addEventListener('change', (e) => {
    if (e.target.matches('[data-f=photo]')) readPhoto(e.target.files?.[0]);
  });
}

function render() {
  if (!sheet || sheet.hidden) return;
  const d = draft;
  if (!d) return;

  let html = `
    <div class="report-header">
      <div class="rs-hint">${t('report.placeHint')}</div>
      <button type="button" class="btn btn-ghost" data-act="cancel" style="padding:4px 10px;font-size:18px;font-weight:700;">✕</button>
    </div>
  `;
  if (d.transcript) {
    html += `<div class="rs-heard">🎤 ${esc(t('voice.heard', { text: d.transcript }))}${d.placeName ? ` · 📍 ${esc(t('report.near', { name: d.placeName }))}` : ''}</div>`;
  }

  if (hazard === 'flood') {
    // Step 1 (Flood): Big tiles for Water on road / Blocked drain
    html += `
      <div class="report-step-title">${t('report.whatYouSee')}</div>
      <div class="report-tiles">
        <button type="button" class="report-tile-btn ${d.type === 'flood' ? 'selected' : ''}" data-g="type" data-v="flood">
          <span class="tile-icon">🌊</span>
          <span class="tile-text">${t('action.reportFlood')}</span>
        </button>
        <button type="button" class="report-tile-btn ${d.type === 'clog' ? 'selected' : ''}" data-g="type" data-v="clog">
          <span class="tile-icon">🚧</span>
          <span class="tile-text">${t('action.reportClog')}</span>
        </button>
      </div>
    `;

    // Step 2 (Flood): Depth as 3 big picture tiles with inline SVG standing person
    if (d.type === 'flood') {
      html += `
        <div class="report-step-title">${t('report.howDeep')}</div>
        <div class="report-tiles tiles-3">
          <button type="button" class="report-tile-btn ${d.depth === 'ankle' ? 'selected' : ''}" data-g="depth" data-v="ankle">
            <span class="tile-icon">${depthIcon('ankle', 34)}</span>
            <span class="tile-text">${t('depth.ankle')}</span>
          </button>
          <button type="button" class="report-tile-btn ${d.depth === 'knee' ? 'selected' : ''}" data-g="depth" data-v="knee">
            <span class="tile-icon">${depthIcon('knee', 34)}</span>
            <span class="tile-text">${t('depth.knee')}</span>
          </button>
          <button type="button" class="report-tile-btn ${d.depth === 'above_knee' ? 'selected' : ''}" data-g="depth" data-v="above_knee">
            <span class="tile-icon">${depthIcon('above_knee', 34)}</span>
            <span class="tile-text">${t('depth.above_knee')}</span>
          </button>
        </div>
      `;
    }

    // Prominent Photo Proof tile right under depth
    html += renderProofTile(d);

    if (d.type === 'flood') {
      html += `
        <details class="report-more-options">
          <summary class="report-more-summary">${t('report.moreOptions')} ▾</summary>
          <div class="rs-row">
            <button type="button" class="chip ${d.inUnderpass ? 'on' : ''}" data-g="under" data-v="${d.inUnderpass ? '0' : '1'}">
              ⛔ ${t('pin.underpass')}
            </button>
            <button type="button" class="chip ${!d.passable.bike ? 'on' : ''}" data-g="bike" data-v="${d.passable.bike ? '0' : '1'}">
              🛵 ${t('vehicle.bike')}${d.passable.bike ? ' ✓' : ' ✗'}
            </button>
            <button type="button" class="chip ${!d.passable.car ? 'on' : ''}" data-g="car" data-v="${d.passable.car ? '0' : '1'}">
              🚗 ${t('vehicle.car')}${d.passable.car ? ' ✓' : ' ✗'}
            </button>
          </div>
        </details>
      `;
    }
  } else {
    // Heat side: Cooling point amenities (tick amenity tiles with icons)
    html += `
      <div class="report-step-title">${t('report.selectAmenities')}</div>
      <div class="report-tiles tiles-3">
        ${['water', 'shade', 'ors', 'clinic', 'toilet', 'cool_room']
          .map(
            (a) => `
          <button type="button" class="report-tile-btn ${d.amenities.includes(a) ? 'selected' : ''}" data-g="amen" data-v="${a}">
            <span class="tile-icon">${AMENITY_ICONS[a] || '💧'}</span>
            <span class="tile-text">${t('amenity.' + a)}</span>
          </button>
        `,
          )
          .join('')}
      </div>
    `;

    // Photo proof tile on heat side as well
    html += renderProofTile(d);
  }

  // One big full-width "Send" button
  html += `
    <button type="button" class="btn btn-primary btn-submit-big" data-act="submit" ${canSubmit() && sending !== d ? '' : 'disabled'}>
      ${t(sending === d ? 'report.sending' : 'report.submit')}
    </button>
  `;

  sheet.innerHTML = html;
}

function renderProofTile(d) {
  if (!d.photo) {
    return `
      <label class="report-proof-tile">
        <span class="proof-icon">📷</span>
        <span class="proof-label"><b>${t('report.proof')}</b> <small class="proof-opt">(${t('report.photo')})</small></span>
        <input type="file" accept="image/*" capture="environment" data-f="photo" hidden>
      </label>
    `;
  }
  return `
    <div class="report-proof-preview">
      <img src="${esc(d.photo)}" alt="Proof" class="proof-thumb" />
      <div class="proof-meta">
        <span class="proof-badge">📷 ${t('report.proofBadge')} ✓</span>
        <label class="btn-retake">
          🔄 ${t('report.retakePhoto')}
          <input type="file" accept="image/*" capture="environment" data-f="photo" hidden>
        </label>
      </div>
    </div>
  `;
}

const canSubmit = () =>
  draft &&
  (draft.type === 'clog' ||
    (draft.type === 'flood' && draft.depth) ||
    (draft.type === 'cooling' && draft.amenities.length > 0));

function onClick(e) {
  const b = e.target.closest('button');
  if (!b) return;
  const { g, v, act } = b.dataset;

  if (g === 'type') {
    draft.type = v;
  }
  if (g === 'depth') {
    draft.depth = v;
  }
  if (g === 'under') {
    draft.inUnderpass = v === '1';
  }
  if (g === 'bike') {
    draft.passable.bike = v === '0';
  }
  if (g === 'car') {
    draft.passable.car = v === '0';
  }
  if (g === 'amen') {
    draft.amenities = draft.amenities.includes(v)
      ? draft.amenities.filter((a) => a !== v)
      : [...draft.amenities, v];
  }

  if (act === 'cancel') return closeReport();
  if (act === 'submit') return submit();
  render();
}

async function readPhoto(file) {
  // Merged: stale-read guard (bug-hunt) + size cap that shrinks until <= MAX_PHOTO_BYTES (security).
  const target = draft;
  if (!file || !target) return;
  const read = ++photoRead;
  let img;
  try {
    img = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    let scale = Math.min(1, 900 / Math.max(img.width, img.height));
    let photo;
    do {
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      photo = canvas.toDataURL('image/jpeg', 0.6);
      scale *= 0.75;
    } while (photo.length > MAX_PHOTO_BYTES);
    if (draft !== target || read !== photoRead) return;
    target.photo = photo;
    render();
  } catch {
    if (draft === target && read === photoRead) toast(t('report.photoError'));
  } finally {
    img?.close();
  }
}

/** @param {{prefill?: {type?, depth?, inUnderpass?, place?: {name,lat,lng}, transcript?: string}}} [opts] — from voice */
export async function openReport(opts = {}) {
  const requestedHazard = hazard;
  // Heat side (cooling points) needs no login screen: silent anonymous session. Rain side keeps the sign-in gate.
  if (!currentUser() && requestedHazard === 'heat') {
    const user = await ensureAnonUser();
    if (hazard !== requestedHazard) return;
    if (!user) return toast(t('report.heatUnavailable'));
  }
  if (!currentUser() || (hazard === 'flood' && currentUser().anonymous)) return openSignIn(() => openReport(opts), { kind: 'report', hazard, opts }); // flood reports need a real login
  ensureSheet();
  const fix = getFix() ?? (await requestLocation({ timeoutMs: 8000 })); // asks permission the first time
  if (hazard !== requestedHazard) return;
  const pre = hazard === 'flood' ? opts.prefill ?? {} : {};
  draft = {
    type: TYPES[hazard].includes(pre.type) ? pre.type : TYPES[hazard][0],
    depth: pre.depth ?? null,
    inUnderpass: !!pre.inUnderpass,
    passable: { bike: true, car: true },
    amenities: [],
    photo: null,
    transcript: pre.transcript ?? null,
    placeName: pre.place?.name ?? null,
  };
  // GPS wins (reports must be near the reporter); a spoken place only moves the map when there is no fix.
  if (!fix && pre.place) map.easeTo({ center: [pre.place.lng, pre.place.lat], zoom: 16 });
  else if (fix) map.easeTo({ center: [fix.lng, fix.lat], zoom: Math.max(map.getZoom(), 16) });
  else map.easeTo({ zoom: Math.max(map.getZoom(), 15) });
  crosshair.hidden = false;
  sheet.hidden = false;
  render();
}

function closeReport() {
  if (sheet) sheet.hidden = true;
  if (crosshair) crosshair.hidden = true;
  draft = null;
}

async function submit() {
  if (!canSubmit() || sending === draft) return;
  const submitted = draft;
  const c = map.getCenter();
  const at = { lat: c.lat, lng: c.lng };
  const fix = getFix();

  if (fix && distM(at, fix) > CONFIG.REPORT_MAX_DISTANCE_M) {
    return toast(t('report.tooFar', { n: CONFIG.REPORT_MAX_DISTANCE_M }));
  }
  if (!fix && CONFIG.REQUIRE_GPS) {
    return toast(t('report.needGps'));
  }

  const pin = makePin({
    ...draft,
    ...at,
    source: { kind: 'citizen', name: 'Citizen report' },
    ...(draft.type === 'cooling' ? { amenities: draft.amenities } : {}),
  });

  sending = submitted;
  render();
  try {
    const saved = await submitReport(pin);
    addLocalPin(saved);
    refreshLive();
    if (draft === submitted) closeReport();
    toast(t('report.sent'));
  } catch (err) {
    toast(err.code === 'rate_limited' ? t('report.rateLimited') : t('auth.error', { msg: err.message }));
  } finally {
    if (sending === submitted) sending = null;
    if (draft === submitted) render();
  }
}

/** Vote handler for pin popups (login-gated). */
export async function onVote(pin, value) {
  if (!currentUser() || currentUser().anonymous) return openSignIn(() => onVote(pin, value), { kind: 'vote', id: pin.id, value });
  try {
    await vote(pin.id, value);
    refreshLive();
    toast(t('report.thanks'));
  } catch (err) {
    toast(err.message === 'cannot_vote_own_report' ? t('report.cannotVoteOwn') : t('auth.error', { msg: err.message }));
  }
}

export function setReportHazard(h) {
  if (hazard === h) return;
  hazard = h;
  closeReport();
}

/** Mount the floating Report button. */
export function initReport(m) {
  map = m;
  document.addEventListener('sajag:toast', (e) => toast(e.detail));
  const fab = document.getElementById('report-fab');
  if (fab) {
    onLang(() => {
      fab.textContent = '＋ ' + t('action.report');
      render();
    });
    fab.addEventListener('click', () => (sheet && !sheet.hidden ? closeReport() : openReport()));
  }
  const intent = takeIntent();
  if (intent) {
    // Resume the original action once the session has loaded after Google redirects back.
    let off = null;
    off = onAuth((u) => {
      if (!u || u.anonymous) return;
      queueMicrotask(() => off?.());
      if (intent.kind === 'report') {
        if (intent.hazard && intent.hazard !== hazard) {
          window.dispatchEvent(new CustomEvent('sajag:set-hazard', { detail: { hazard: intent.hazard } }));
        }
        openReport(intent.opts);
      }
      if (intent.kind === 'vote' && ['still', 'cleared'].includes(intent.value)) {
        onVote({ id: intent.id }, intent.value);
      }
    });
  }
}

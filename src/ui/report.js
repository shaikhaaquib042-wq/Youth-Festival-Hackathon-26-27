// Report flow (PRD §6.3, §22.3, §22.4): < 10 s, one hand. Login required (sheet opens if signed out).
// Position = map centre under a crosshair, starting at the GPS fix; must stay within REPORT_MAX_DISTANCE_M of the fix.
import { t, onLang } from '../i18n/index.js';
import { CONFIG } from '../../config.js';
import { makePin } from '../engine/pin.js';
import { distM } from '../engine/geo.js';
import { currentUser, onAuth } from '../backend/auth.js';
import { submitReport, vote } from '../backend/reports.js';
import { addLocalPin, refreshLive } from '../store.js';
import { openSignIn, takeIntent } from './signin.js';
import { getFix, requestLocation } from '../location.js';

let map, hazard = 'flood', sheet, crosshair, draft = null;

export function toast(msg, ms = 3500) {
  const b = document.getElementById('toast');
  b.textContent = msg; b.hidden = false;
  clearTimeout(toast.tm); toast.tm = setTimeout(() => { b.hidden = true; }, ms);
}


const TYPES = { flood: ['flood', 'clog'], heat: ['cooling'] };
const TYPE_LABEL = { flood: 'action.reportFlood', clog: 'action.reportClog', cooling: 'action.reportCooling' };

function ensureSheet() {
  if (sheet) return;
  crosshair = document.createElement('div');
  crosshair.className = 'crosshair'; crosshair.hidden = true; crosshair.textContent = '📍';
  document.getElementById('app').append(crosshair);

  sheet = document.createElement('div');
  sheet.className = 'report-sheet'; sheet.hidden = true;
  document.getElementById('app').append(sheet);
  sheet.addEventListener('click', onClick);
  sheet.addEventListener('change', (e) => { if (e.target.matches('[data-f=photo]')) readPhoto(e.target.files?.[0]); });
}

function render() {
  if (!sheet || sheet.hidden) return;
  const d = draft;
  const chip = (group, val, label, on) => `<button class="chip ${on ? 'on' : ''}" data-g="${group}" data-v="${val}">${label}</button>`;
  let html = `<div class="rs-hint">${t('report.placeHint')}</div>
    <div class="rs-row">${TYPES[hazard].map((ty) => chip('type', ty, t(TYPE_LABEL[ty]), d.type === ty)).join('')}</div>`;
  if (d.type === 'flood') {
    html += `<div class="rs-row">${['ankle', 'knee', 'above_knee'].map((v) => chip('depth', v, t('depth.' + v), d.depth === v)).join('')}</div>
      <div class="rs-row">${chip('under', d.inUnderpass ? '0' : '1', '⛔ ' + t('pin.underpass'), d.inUnderpass)}
      ${chip('bike', d.passable.bike ? '0' : '1', '🛵 ' + t('vehicle.bike') + (d.passable.bike ? ' ✓' : ' ✗'), !d.passable.bike)}
      ${chip('car', d.passable.car ? '0' : '1', '🚗 ' + t('vehicle.car') + (d.passable.car ? ' ✓' : ' ✗'), !d.passable.car)}</div>`;
  }
  if (d.type === 'cooling') {
    html += `<div class="rs-row">${['water', 'shade', 'ors', 'clinic', 'toilet', 'cool_room']
      .map((a) => chip('amen', a, t('amenity.' + a), d.amenities.includes(a))).join('')}</div>`;
  }
  html += `<div class="rs-row"><label class="chip">📷 ${t('report.photo')}<input type="file" accept="image/*" capture="environment" data-f="photo" hidden></label>
      ${d.photo ? '<span class="muted">✓</span>' : ''}</div>
    <div class="rs-row rs-actions"><button class="btn btn-ghost" data-act="cancel">${t('report.cancel')}</button>
      <button class="btn btn-primary" data-act="submit" ${canSubmit() ? '' : 'disabled'}>${t('report.submit')}</button></div>`;
  sheet.innerHTML = html;
}

const canSubmit = () => draft && (draft.type !== 'flood' || draft.depth) && (draft.type !== 'cooling' || draft.amenities.length);

function onClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  const { g, v, act } = b.dataset;
  if (g === 'type') draft.type = v;
  if (g === 'depth') draft.depth = v;
  if (g === 'under') draft.inUnderpass = v === '1';
  if (g === 'bike') draft.passable.bike = v === '0';
  if (g === 'car') draft.passable.car = v === '0';
  if (g === 'amen') draft.amenities = draft.amenities.includes(v) ? draft.amenities.filter((a) => a !== v) : [...draft.amenities, v];
  if (act === 'cancel') return closeReport();
  if (act === 'submit') return submit();
  render();
}

async function readPhoto(file) {
  if (!file) return;
  const img = await createImageBitmap(file);
  const s = Math.min(1, 900 / Math.max(img.width, img.height));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * s), height: Math.round(img.height * s) });
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  draft.photo = c.toDataURL('image/jpeg', 0.6); // ~60–150 KB, under the DB's 400 KB cap
  render();
}

export async function openReport() {
  if (!currentUser()) return openSignIn(() => openReport());
  ensureSheet();
  const fix = getFix() ?? await requestLocation({ timeoutMs: 8000 }); // asks permission the first time
  draft = { type: TYPES[hazard][0], depth: null, inUnderpass: false, passable: { bike: true, car: true }, amenities: [], photo: null };
  if (fix) map.easeTo({ center: [fix.lng, fix.lat], zoom: Math.max(map.getZoom(), 16) });
  else map.easeTo({ zoom: Math.max(map.getZoom(), 15) });
  crosshair.hidden = false; sheet.hidden = false;
  render();
}

function closeReport() { if (sheet) sheet.hidden = true; if (crosshair) crosshair.hidden = true; draft = null; }

async function submit() {
  const c = map.getCenter(), at = { lat: c.lat, lng: c.lng }, fix = getFix();
  if (fix && distM(at, fix) > CONFIG.REPORT_MAX_DISTANCE_M) return toast(t('report.tooFar', { n: CONFIG.REPORT_MAX_DISTANCE_M }));
  if (!fix && CONFIG.REQUIRE_GPS) return toast(t('report.needGps'));
  const pin = makePin({ ...draft, ...at, source: { kind: 'citizen', name: 'Citizen report' },
    ...(draft.type === 'cooling' ? { amenities: draft.amenities } : {}) });
  try {
    const saved = await submitReport(pin);
    addLocalPin(saved); refreshLive();
    closeReport(); toast(t('report.sent'));
  } catch (err) {
    toast(err.code === 'rate_limited' ? t('report.rateLimited') : t('auth.error', { msg: err.message }));
  }
}

/** Vote handler for pin popups (login-gated). */
export async function onVote(pin, value) {
  if (!currentUser()) return openSignIn(() => onVote(pin, value));
  try { await vote(pin.id, value); refreshLive(); toast(t('report.thanks')); }
  catch (err) { toast(t('auth.error', { msg: err.message })); }
}

export function setReportHazard(h) { hazard = h; if (draft) { draft.type = TYPES[h][0]; render(); } }

/** Mount the floating Report button. */
export function initReport(m) {
  map = m;
  document.addEventListener('sajag:toast', (e) => toast(e.detail));
  const fab = document.getElementById('report-fab');
  onLang(() => { fab.textContent = '＋ ' + t('action.report'); render(); });
  fab.addEventListener('click', () => (sheet && !sheet.hidden ? closeReport() : openReport()));
  if (takeIntent()) { // resume the report after the Google redirect, once the session has loaded
    let off = null;
    off = onAuth((u) => { if (u) { openReport(); queueMicrotask(() => off?.()); } });
  }
}

// Device location (GPS) — one source of truth for the whole app.
// Asks permission only on a user action (📍 button, opening Report, starting a shift); if the browser already
// granted it earlier, tracking starts silently on load. Draws a blue "you are here" dot with an accuracy ring.
import maplibregl from 'maplibre-gl';
import { t } from './i18n/index.js';

let fix = null;        // { lat, lng, acc, at }
let watchId = null;
let state = 'idle';    // idle | asking | on | denied | unavailable
let map = null;
const subs = new Set();

export const getFix = () => fix;
export const locationState = () => state;
/** Subscribe to position / state changes. Calls fn immediately. Returns unsubscribe. */
export function onFix(fn) { subs.add(fn); fn(fix, state); return () => subs.delete(fn); }
const notify = () => { subs.forEach((fn) => fn(fix, state)); draw(); };

/** Start tracking (triggers the browser permission prompt the first time). Resolves with the first fix or null. */
export function requestLocation({ timeoutMs = 12000 } = {}) {
  if (!('geolocation' in navigator)) { state = 'unavailable'; notify(); return Promise.resolve(null); }
  if (fix && state === 'on') return Promise.resolve(fix);
  return new Promise((resolve) => {
    const finish = (v) => {
      clearTimeout(timer);
      subs.delete(listener);
      resolve(v);
    };
    const listener = (f, s) => {
      if (f || s === 'denied' || s === 'unavailable') finish(f);
    };
    const timer = setTimeout(() => finish(fix), timeoutMs);
    subs.add(listener);
    if (watchId == null) {
      state = 'asking'; notify();
      watchId = navigator.geolocation.watchPosition(
        (p) => { fix = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy), at: new Date(p.timestamp) }; state = 'on'; notify(); },
        (err) => {
          state = err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable';
          if (state === 'denied') { navigator.geolocation.clearWatch(watchId); watchId = null; }
          notify();
        },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
    }
  });
}

export function stopLocation() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null; fix = null; state = 'idle'; notify();
}

// ── Map: "you are here" dot + 📍 control ────────────────────────────────────
function circle(lng, lat, r) {
  const pts = [], k = 1 / (111320 * Math.cos((lat * Math.PI) / 180)), m = 1 / 110540;
  for (let i = 0; i <= 48; i++) { const a = (i / 48) * 2 * Math.PI; pts.push([lng + Math.cos(a) * r * k, lat + Math.sin(a) * r * m]); }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [pts] }, properties: {} };
}
function draw() {
  if (!map?.getSource('sj-me')) return;
  const feats = fix ? [circle(fix.lng, fix.lat, Math.max(fix.acc, 10)), { type: 'Feature', geometry: { type: 'Point', coordinates: [fix.lng, fix.lat] }, properties: {} }] : [];
  map.getSource('sj-me').setData({ type: 'FeatureCollection', features: feats });
  const btn = document.querySelector('.sj-locate');
  if (btn) { btn.dataset.state = state; btn.title = t(state === 'denied' ? 'loc.denied' : state === 'unavailable' ? 'loc.unavailable' : 'loc.use'); }
}

class LocateControl {
  onAdd() {
    const el = document.createElement('div');
    el.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    el.innerHTML = '<button class="sj-locate" type="button" aria-label="📍">📍</button>';
    el.firstChild.addEventListener('click', async () => {
      const f = await requestLocation();
      if (f) map.easeTo({ center: [f.lng, f.lat], zoom: Math.max(map.getZoom(), 15) });
      else if (state === 'denied' || state === 'unavailable') document.dispatchEvent(new CustomEvent('sajag:toast', { detail: t(state === 'denied' ? 'loc.denied' : 'loc.unavailable') }));
    });
    return el;
  }
  onRemove() {}
}

/** Add the dot layers + 📍 button; auto-start if permission was granted before. */
export function initLocation(m) {
  map = m;
  map.addControl(new LocateControl(), 'top-right');
  const setup = () => {
    map.addSource('sj-me', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'sj-me-acc', type: 'fill', source: 'sj-me', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#1c7ed6', 'fill-opacity': 0.12 } });
    map.addLayer({ id: 'sj-me-dot', type: 'circle', source: 'sj-me', filter: ['==', ['geometry-type'], 'Point'], paint: {
      'circle-radius': 7, 'circle-color': '#1c7ed6', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2.5 } });
    draw();
  };
  if (map.isStyleLoaded()) setup(); else map.once('load', setup);
  navigator.permissions?.query({ name: 'geolocation' }).then((p) => { if (p.state === 'granted') requestLocation(); }).catch(() => {});
}

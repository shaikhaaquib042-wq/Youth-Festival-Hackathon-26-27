// Route check (PRD §6.2 hero flow, §10, §19.3 share). Saved routes; live re-check whenever pins change.
import maplibregl from 'maplibre-gl';
import { LANGS, t, tIn, onLang } from '../i18n/index.js';
import { CONFIG } from '../../config.js';
import { planRoute } from '../engine/route.js';
import { hasHeavyRain } from '../engine/advisory.js';
import { getPins, subscribe, now, gazetteer } from '../store.js';
import { getGrid, nearestCell, onGrid } from '../feeds/openmeteo.js';
import { getFix, requestLocation } from '../location.js';
import { SEV_COLOR } from '../map/pins.js';
import { toast } from './report.js';

const SAVED_KEY = 'sajag.routes';
const DEMO_ROUTES = { pune: [{ name: 'Sinhagad Rd → Shivajinagar', from: 'Vitthalwadi', to: 'Shivajinagar' }] };

let map, panel, btn, mode = 'commuter', active = null, result = null, pickTarget = null;
let checkId = 0, request = null, checking = false, signature = null;
let fields = { from: '', to: '' };
let editing = true; // false after a check → compact panel (route summary + verdict) so the map shows the route

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY));
    if (!Array.isArray(saved)) return [];
    return saved.filter((route) => route && ['name', 'from', 'to']
      .every((field) => typeof route[field] === 'string')).slice(0, 5);
  } catch {
    return [];
  }
}
const storeSaved = (list) => { try { localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, 5))); } catch { /* ignore */ } };

const isMyLocation = (value) => Object.keys(LANGS).some((lang) => value === tIn(lang, 'route.myLoc'));
const fieldLabel = (value) => isMyLocation(value) ? t('route.myLoc') : value;
const hasSimulatedWeather = () => !!getGrid()[0]?.simulated;

/** Resolve a field value → {lat,lng,label}: "My location", a gazetteer name, or "lat,lng". */
async function resolve(val) {
  const v = (val || '').trim();
  if (!v) return null;
  if (isMyLocation(v)) { const f = getFix() ?? await requestLocation({ timeoutMs: 8000 }); return f ? { ...f, label: t('route.myLoc') } : null; }
  const m = v.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (m) return { lat: +m[1], lng: +m[2], label: v };
  const lc = v.toLowerCase();
  const g = gazetteer.find((p) => p.name.toLowerCase() === lc || p.aliases?.some((a) => a.toLowerCase() === lc))
    ?? gazetteer.find((p) => p.name.toLowerCase().includes(lc));
  return g ? { lat: g.lat, lng: g.lng, label: g.name } : null;
}

function ensureLayers() {
  if (map.getSource('sj-route')) return;
  map.addSource('sj-route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  const before = map.getLayer('sj-hotspots') ? 'sj-hotspots' : undefined;
  map.addLayer({ id: 'sj-route-casing', type: 'line', source: 'sj-route', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#fff', 'line-width': 9 } }, before);
  map.addLayer({ id: 'sj-route-line', type: 'line', source: 'sj-route', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': 5, 'line-dasharray': ['case', ['get', 'blocked'], ['literal', [1, 1.5]], ['literal', [1, 0]]] } }, before);
}

function drawRoutes(r) {
  const source = map?.getSource('sj-route');
  if (!source) return;
  const feats = [];
  if (r) {
    const blocked = r.verdict === 'avoid';
    feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: r.primary.route.coords },
      properties: { color: SEV_COLOR[r.level === 'green' ? 'green' : r.level] ?? SEV_COLOR.green, blocked } });
    if (blocked && r.chosen) feats.unshift({ type: 'Feature', geometry: { type: 'LineString', coordinates: r.chosen.route.coords },
      properties: { color: SEV_COLOR[r.chosen.score.level], blocked: false } });
  }
  source.setData({ type: 'FeatureCollection', features: feats });
}

function reasonText(hit) {
  if (!hit) return '';
  const p = hit.pin, age = Math.max(0, Math.round((now() - Date.parse(p.createdAt)) / 60000));
  const what = p.type === 'clog' ? t('action.reportClog') : `${t('depth.' + p.depth)}${p.inUnderpass ? ' · ' + t('pin.underpass') : ''}`;
  const where = p.name ?? p.near ?? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
  return t('route.reason', { what, where, evidence: t('report.evidence', { n: p.confirmations + 1, age }) })
    + (p.simulated ? ` · ${t('tag.simulated')}` : '') + ` · ${t('pin.source', { name: p.source.name })}`;
}

function alternateText(r) {
  if (r.noSafe) return t('route.noSafe');
  const km = (r.chosen.route.distanceM / 1000).toFixed(1);
  const min = Math.round(r.chosen.route.durationS / 60);
  const lvl = r.chosen.score.level;
  if (lvl === 'yellow' || lvl === 'orange') {
    // "Safer, not safe": name what is still on the safer route (e.g. a blocked drain at Dandekar Bridge).
    const h = r.chosen.score.blocker ?? r.chosen.score.hits?.[0];
    const what = h ? (h.pin.type === 'clog' ? t('action.reportClog') : t('depth.' + h.pin.depth)) : '';
    const where = h ? (h.pin.name ?? h.pin.near ?? '') : '';
    return t('route.altCaution', { km, min }) + (what ? ` — ${what}${where ? ' · ' + where : ''}` : '');
  }
  return t('route.altShown', { km, min });
}

function shareText(r) {
  const head = t('verdict.' + r.verdict);
  const sim = hasSimulatedWeather() ? ` · ${t('tag.simulated')}` : '';
  const details = [reasonText(r.decidingHit), r.verdict === 'avoid' ? alternateText(r) : ''].filter(Boolean);
  return `${t('app.name')}${sim} · ${fieldLabel(active.from.label)} → ${fieldLabel(active.to.label)}: ${[head, ...details].join('. ')}\n${t('disclaimer')}\n${location.origin}`;
}

function render() {
  if (!panel) return;
  if (pickTarget) {
    panel.innerHTML = `<div class="rp-head"><b>${esc(t('route.tapMap'))}</b>
      <button class="btn btn-ghost" data-act="cancelPick">${esc(t('report.cancel'))}</button></div>`;
    return;
  }
  const saved = loadSaved(), demo = DEMO_ROUTES[CONFIG.CITY] ?? [];
  const chips = [...demo, ...saved].map((s, i) => `<button class="chip" data-saved="${i}">${esc(s.name)}</button>`).join('');
  let res = '';
  if (result) {
    const r = result;
    const color = r.verdict === 'avoid' ? SEV_COLOR.red : r.verdict === 'caution' ? SEV_COLOR.yellow : SEV_COLOR.green;
    const head = r.verdict === 'avoid' ? `⛔ ${t('verdict.avoid')}` : r.verdict === 'caution' ? `⚠️ ${t('verdict.caution')}` : `✅ ${t('verdict.safe')}`;
    const km = (x) => (x.route.distanceM / 1000).toFixed(1), min = (x) => Math.round(x.route.durationS / 60);
    res = `<div class="route-verdict" style="border-color:${color}">
      <div class="rv-head" style="color:${color}">${esc(head)}${hasSimulatedWeather() ? ` <span class="tag-sim">${esc(t('tag.simulated'))}</span>` : ''}</div>
      ${r.verdict === 'avoid' ? `<div>${esc(t('red.doNotEnter'))}</div>` : ''}
      ${r.decidingHit ? `<div class="rv-reason">${esc(reasonText(r.decidingHit))}</div>` : `<div class="rv-reason">${esc(t('route.clear'))}</div>`}
      ${r.verdict === 'avoid' ? `<div class="rv-alt">${esc(alternateText(r))}</div>` : `<div class="muted">${km(r.primary)} km · ${min(r.primary)} min</div>`}
      <div class="rs-row"><button class="btn" data-act="share">🟢 ${esc(t('action.share'))}</button><button class="btn btn-ghost" data-act="save">☆ ${esc(t('route.save'))}</button></div>
    </div>`;
  }
  if (!editing) {
    const title = active ? `${fieldLabel(active.from.label)} → ${fieldLabel(active.to.label)}` : t('route.title');
    panel.innerHTML = `<div class="rp-head"><b>${esc(title)}</b>
      <span><button class="btn btn-ghost" data-act="edit" aria-label="${esc(t('route.title'))}">✎</button><button class="btn btn-ghost" data-act="close">✕</button></span></div>
      <div class="rp-result" aria-busy="${checking}">${checking ? esc(t('route.checking')) : res}</div>`;
    return;
  }
  panel.innerHTML = `<div class="rp-head"><b>${esc(t('route.title'))}</b><button class="btn btn-ghost" data-act="close">✕</button></div>
    <div class="rs-row">${chips}</div>
    <label class="field"><span>${esc(t('route.from'))}</span><div class="rp-in"><input list="sj-places" data-f="from" value="${esc(fieldLabel(fields.from))}">
      <button class="chip" data-act="me" data-t="from">📍</button><button class="chip" data-act="pick" data-t="from">🗺</button></div></label>
    <label class="field"><span>${esc(t('route.to'))}</span><div class="rp-in"><input list="sj-places" data-f="to" value="${esc(fieldLabel(fields.to))}">
      <button class="chip" data-act="pick" data-t="to">🗺</button></div></label>
    <datalist id="sj-places"><option value="${esc(t('route.myLoc'))}">${gazetteer.map((g) => `<option value="${esc(g.name)}">`).join('')}</datalist>
    <div class="rs-row rs-actions"><button class="btn btn-primary" data-act="check">${esc(t('route.check'))}</button></div>`;
}

async function check(fromText, toText) {
  fields = { from: fromText, to: toText };
  pickTarget = null;
  const id = ++checkId;
  cancelPlan();
  active = result = null;
  drawRoutes(null);
  editing = false;
  checking = true;
  render();
  const [from, to] = await Promise.all([resolve(fromText), resolve(toText)]);
  if (id !== checkId) return;
  if (!from || !to) {
    checking = false;
    editing = true;
    render();
    return toast(t('route.notFound'));
  }
  active = { from, to, fromText, toText };
  signature = null;
  render();
  await recheck();
}

function fitRoute(r) {
  const b = new maplibregl.LngLatBounds();
  (r.chosen ?? r.primary).route.coords.forEach((c) => b.extend(c));
  r.primary.route.coords.forEach((c) => b.extend(c));
  // Fit into the visible map between panels, or beside the desktop column.
  const wide = innerWidth >= 760;
  const padding = wide
    ? { top: 80, bottom: 40, left: 480, right: 70 }
    : { top: 190, bottom: Math.min(panel.offsetHeight + 110, innerHeight * 0.6), left: 30, right: 60 };
  if (!b.isEmpty()) map.fitBounds(b, { padding, maxZoom: 15 });
}

function cancelPlan() {
  request?.abort();
  request = null;
  checking = false;
}

function pinSignature(pins, rainClogs) {
  return JSON.stringify([mode, ...pins.map((p) => [
    p.id, p.lat, p.lng, p.status, p.depth, p.inUnderpass, p.confirmations, rainClogs.has(p.id),
  ])]);
}

async function recheck() {
  if (!active) return;
  const pins = getPins({ includeCooling: false }).filter((p) => p.type === 'flood' || p.type === 'clog');
  const rainClogs = new Set(pins.filter((p) => p.type === 'clog' && hasHeavyRain(nearestCell(p))).map((p) => p.id));
  const sig = pinSignature(pins, rainClogs);
  if (sig === signature) return;
  signature = sig;
  const prev = result?.verdict;
  cancelPlan();
  const controller = new AbortController();
  request = controller;
  checking = true;
  drawRoutes(null);
  if (!editing) render();
  try {
    const next = await planRoute(active.from, active.to, pins,
      { osrmUrl: CONFIG.OSRM_URL, mode, bufferM: CONFIG.ROUTE_BUFFER_M, detourM: CONFIG.DETOUR_OFFSET_M,
        alternatives: CONFIG.OSRM_ALTERNATIVES, signal: controller.signal, heavyRainAt: (p) => rainClogs.has(p.id) });
    if (request !== controller) return;
    checking = false;
    result = next;
    drawRoutes(result);
    if (!editing) {
      render();
      if (!prev) fitRoute(result);
    }
    if (prev && prev !== result.verdict) toast(`${t('route.changed')}: ${t('verdict.' + result.verdict)}`);
  } catch (e) {
    if (request !== controller) return;
    checking = false;
    active = result = null;
    editing = true;
    render();
    toast(t('auth.error', { msg: e.message }));
  }
}

function onClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.saved != null) {
    const s = [...(DEMO_ROUTES[CONFIG.CITY] ?? []), ...loadSaved()][+b.dataset.saved];
    if (s) return check(s.from, s.to);
    return;
  }
  const act = b.dataset.act;
  if (act === 'close') return toggle(false);
  if (act === 'edit') {
    if (checking) {
      checkId++;
      cancelPlan();
      active = result = null;
    }
    editing = true;
    render();
    return;
  }
  if (act === 'check') return check(fields.from, fields.to);
  if (act === 'me') {
    pickTarget = null;
    panel.querySelector('[data-f=from]').value = fields.from = t('route.myLoc');
    return;
  }
  if (act === 'pick') { pickTarget = b.dataset.t; render(); return; }
  if (act === 'cancelPick') { pickTarget = null; render(); return; }
  if (act === 'share' && result) return window.open(`https://wa.me/?text=${encodeURIComponent(shareText(result))}`, '_blank', 'noopener');
  if (act === 'save' && active) {
    storeSaved([{ name: `${active.from.label} → ${active.to.label}`, from: active.fromText, to: active.toText }, ...loadSaved()]);
    render(); toast(t('route.savedOk'));
  }
}

function toggle(open) {
  panel.hidden = !open;
  window.dispatchEvent(new CustomEvent('sajag:route', { detail: { active: open } })); // pins show flood spots while checking
  if (!open) {
    checkId++;
    cancelPlan();
    active = result = pickTarget = null;
    fields = { from: '', to: '' };
    editing = true;
    drawRoutes(null);
  }
  render();
}

export function setRouteMode(m) { mode = m; if (active) recheck(); }

/** Mount the route button + panel (Flood side). */
export function initRoute(m) {
  map = m;
  btn = document.getElementById('route-btn');
  panel = document.createElement('div');
  panel.className = 'route-panel'; panel.hidden = true;
  document.getElementById('app').append(panel);
  panel.addEventListener('click', onClick);
  panel.addEventListener('input', ({ target }) => {
    if (target.dataset.f) fields[target.dataset.f] = target.value;
  });
  btn.addEventListener('click', () => toggle(panel.hidden));
  map.on('click', (e) => {
    if (!pickTarget || panel.hidden || !editing) return;
    fields[pickTarget] = `${e.lngLat.lat.toFixed(5)}, ${e.lngLat.lng.toFixed(5)}`;
    pickTarget = null;
    render();
  });
  onLang(() => { btn.innerHTML = `<span class="ico">🛣</span><span>${esc(t('bar.route'))}</span>`; render(); });
  // Live: when reports change (new report, confirmation, expiry, scenario tick) re-plan the active route.
  subscribe(recheck);
  let simulated = hasSimulatedWeather();
  onGrid(() => {
    recheck();
    const next = hasSimulatedWeather();
    if (next !== simulated && !editing) render();
    simulated = next;
  });
  window.addEventListener('sajag:mode', (e) => setRouteMode(e.detail.mode));
  try { mode = localStorage.getItem('sajag.userMode') || 'commuter'; } catch { /* ignore */ }
  window.addEventListener('sajag:hazard', (e) => { btn.hidden = e.detail.hazard !== 'flood'; if (btn.hidden) toggle(false); });
  const mountLayers = () => {
    ensureLayers();
    drawRoutes(checking ? null : result);
  };
  if (map.isStyleLoaded()) mountLayers(); else map.once('load', mountLayers);
}

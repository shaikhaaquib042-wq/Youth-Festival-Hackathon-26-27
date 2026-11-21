// Route check (PRD §6.2 hero flow, §10, §19.3 share). Saved routes; live re-check whenever pins change.
import maplibregl from 'maplibre-gl';
import { t, onLang } from '../i18n/index.js';
import { CONFIG } from '../../config.js';
import { planRoute } from '../engine/route.js';
import { getPins, subscribe, now, gazetteer } from '../store.js';
import { getFix, requestLocation } from '../location.js';
import { SEV_COLOR } from '../map/pins.js';
import { toast } from './report.js';

const SAVED_KEY = 'sajag.routes';
const DEMO_ROUTES = { pune: [{ name: 'Sinhagad Rd → Shivajinagar', from: 'Vitthalwadi', to: 'Shivajinagar' }] };

let map, panel, btn, mode = 'commuter', active = null, result = null, pickTarget = null, timer = null;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const loadSaved = () => { try { return JSON.parse(localStorage.getItem(SAVED_KEY)) ?? []; } catch { return []; } };
const storeSaved = (list) => { try { localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, 5))); } catch { /* ignore */ } };

/** Resolve a field value → {lat,lng,label}: "My location", a gazetteer name, or "lat,lng". */
async function resolve(val) {
  const v = (val || '').trim();
  if (!v) return null;
  if (v === t('route.myLoc')) { const f = getFix() ?? await requestLocation({ timeoutMs: 8000 }); return f ? { ...f, label: t('route.myLoc') } : null; }
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
  ensureLayers();
  const feats = [];
  if (r) {
    const blocked = r.verdict === 'avoid';
    feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: r.primary.route.coords },
      properties: { color: SEV_COLOR[r.level === 'green' ? 'green' : r.level] ?? SEV_COLOR.green, blocked } });
    if (blocked && r.chosen) feats.unshift({ type: 'Feature', geometry: { type: 'LineString', coordinates: r.chosen.route.coords },
      properties: { color: SEV_COLOR.green, blocked: false } });
  }
  map.getSource('sj-route').setData({ type: 'FeatureCollection', features: feats });
}

function reasonText(hit) {
  if (!hit) return '';
  const p = hit.pin, age = Math.max(0, Math.round((now() - Date.parse(p.createdAt)) / 60000));
  const what = p.type === 'clog' ? t('action.reportClog') : `${t('depth.' + p.depth)}${p.inUnderpass ? ' · ' + t('pin.underpass') : ''}`;
  const where = p.name ?? p.near ?? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
  return t('route.reason', { what, where, evidence: t('report.evidence', { n: p.confirmations + 1, age }) })
    + (p.simulated ? ` · ${t('tag.simulated')}` : '') + ` · ${t('pin.source', { name: p.source.name })}`;
}

function shareText(r) {
  const head = r.verdict === 'avoid' ? (r.noSafe ? t('route.noSafe') : t('verdict.avoid')) : t('verdict.' + r.verdict);
  return `${t('app.name')} · ${active.from.label} → ${active.to.label}: ${head}. ${reasonText(r.decidingHit)}\n${t('disclaimer')}\n${location.origin}`;
}

function render() {
  if (!panel) return;
  const saved = loadSaved(), demo = DEMO_ROUTES[CONFIG.CITY] ?? [];
  const chips = [...demo, ...saved].map((s, i) => `<button class="chip" data-saved="${i}">${esc(s.name)}</button>`).join('');
  let res = '';
  if (result) {
    const r = result;
    const color = r.verdict === 'avoid' ? SEV_COLOR.red : r.verdict === 'caution' ? SEV_COLOR.yellow : SEV_COLOR.green;
    const head = r.verdict === 'avoid' ? `⛔ ${t('verdict.avoid')}` : r.verdict === 'caution' ? `⚠️ ${t('verdict.caution')}` : `✅ ${t('verdict.safe')}`;
    const km = (x) => (x.route.distanceM / 1000).toFixed(1), min = (x) => Math.round(x.route.durationS / 60);
    res = `<div class="route-verdict" style="border-color:${color}">
      <div class="rv-head" style="color:${color}">${esc(head)}</div>
      ${r.verdict === 'avoid' ? `<div>${esc(t('red.doNotEnter'))}</div>` : ''}
      ${r.decidingHit ? `<div class="rv-reason">${esc(reasonText(r.decidingHit))}</div>` : `<div class="rv-reason">${esc(t('route.clear'))}</div>`}
      ${r.verdict === 'avoid' ? `<div class="rv-alt">${esc(r.noSafe ? t('route.noSafe') : t('route.altShown', { km: km(r.chosen), min: min(r.chosen) }))}</div>` : `<div class="muted">${km(r.primary)} km · ${min(r.primary)} min</div>`}
      <div class="rs-row"><button class="btn" data-act="share">🟢 ${esc(t('action.share'))}</button><button class="btn btn-ghost" data-act="save">☆ ${esc(t('route.save'))}</button></div>
    </div>`;
  }
  panel.innerHTML = `<div class="rp-head"><b>${esc(t('route.title'))}</b><button class="btn btn-ghost" data-act="close">✕</button></div>
    <div class="rs-row">${chips}</div>
    <label class="field"><span>${esc(t('route.from'))}</span><div class="rp-in"><input list="sj-places" data-f="from" value="${esc(active?.fromText ?? '')}">
      <button class="chip" data-act="me" data-t="from">📍</button><button class="chip" data-act="pick" data-t="from">🗺</button></div></label>
    <label class="field"><span>${esc(t('route.to'))}</span><div class="rp-in"><input list="sj-places" data-f="to" value="${esc(active?.toText ?? '')}">
      <button class="chip" data-act="pick" data-t="to">🗺</button></div></label>
    <datalist id="sj-places"><option value="${esc(t('route.myLoc'))}">${gazetteer.map((g) => `<option value="${esc(g.name)}">`).join('')}</datalist>
    <div class="rs-row rs-actions"><button class="btn btn-primary" data-act="check">${esc(t('route.check'))}</button></div>
    <div class="rp-result">${res}</div>`;
}

async function check(fromText, toText) {
  const [from, to] = await Promise.all([resolve(fromText), resolve(toText)]);
  if (!from || !to) return toast(t('route.notFound'));
  active = { from, to, fromText, toText };
  await recheck(true);
  const b = new maplibregl.LngLatBounds();
  (result?.chosen ?? result?.primary)?.route.coords.forEach((c) => b.extend(c));
  result?.primary.route.coords.forEach((c) => b.extend(c));
  if (!b.isEmpty()) map.fitBounds(b, { padding: { top: 120, bottom: 260, left: 40, right: 40 }, maxZoom: 15 });
}

async function recheck(announce = false) {
  if (!active) return;
  try {
    const prev = result?.verdict;
    result = await planRoute(active.from, active.to, getPins({ includeCooling: false }),
      { osrmUrl: CONFIG.OSRM_URL, mode, bufferM: CONFIG.ROUTE_BUFFER_M, detourM: CONFIG.DETOUR_OFFSET_M, alternatives: CONFIG.OSRM_ALTERNATIVES });
    drawRoutes(result); render();
    if (!announce && prev && prev !== result.verdict) toast(`${t('route.changed')}: ${t('verdict.' + result.verdict)}`);
  } catch (e) { toast(t('auth.error', { msg: e.message })); }
}

function onClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  const val = (f) => panel.querySelector(`[data-f=${f}]`).value;
  if (b.dataset.saved != null) {
    const s = [...(DEMO_ROUTES[CONFIG.CITY] ?? []), ...loadSaved()][+b.dataset.saved];
    return check(s.from, s.to);
  }
  const act = b.dataset.act;
  if (act === 'close') return toggle(false);
  if (act === 'check') return check(val('from'), val('to'));
  if (act === 'me') { panel.querySelector('[data-f=from]').value = t('route.myLoc'); return; }
  if (act === 'pick') { pickTarget = b.dataset.t; toast(t('route.tapMap')); return; }
  if (act === 'share' && result) return window.open(`https://wa.me/?text=${encodeURIComponent(shareText(result))}`, '_blank', 'noopener');
  if (act === 'save' && active) {
    storeSaved([{ name: `${active.from.label} → ${active.to.label}`, from: active.fromText, to: active.toText }, ...loadSaved()]);
    render(); toast(t('route.savedOk'));
  }
}

function toggle(open) {
  panel.hidden = !open;
  if (!open) { active = null; result = null; drawRoutes(null); }
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
  btn.addEventListener('click', () => toggle(panel.hidden));
  map.on('click', (e) => {
    if (!pickTarget || panel.hidden) return;
    panel.querySelector(`[data-f=${pickTarget}]`).value = `${e.lngLat.lat.toFixed(5)}, ${e.lngLat.lng.toFixed(5)}`;
    pickTarget = null;
  });
  onLang(() => { btn.textContent = '🛣 ' + t('action.checkRoute'); render(); });
  // Live: when reports change (new report, confirmation, expiry, scenario tick) re-plan the active route.
  let sig = '';
  subscribe(() => {
    if (!active) return;
    const s = getPins({ includeCooling: false }).filter((p) => p.type === 'flood' || p.type === 'clog')
      .map((p) => `${p.id}:${p.status}:${p.depth}:${p.inUnderpass}`).join('|') + mode;
    if (s === sig) return; sig = s;
    clearTimeout(timer); timer = setTimeout(() => recheck(), 400);
  });
  window.addEventListener('sajag:hazard', (e) => { btn.hidden = e.detail.hazard !== 'flood'; if (btn.hidden) toggle(false); });
  if (map.isStyleLoaded()) ensureLayers(); else map.once('load', ensureLayers);
}

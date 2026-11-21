// Scenario player (PRD §6.6, §16, §19.2, §21.7) — the demo backbone. NEVER CUT.
// Replays a scripted, timestamped event file on an accelerated clock. Everything it injects is SIMULATED and tagged.
// The engine is untouched: only the inputs change (clock, pins, alerts, heat conditions, rain cells).
import { t, onLang } from '../i18n/index.js';
import { makePin } from '../engine/pin.js';
import { setClock, setScenarioPins, setClockFormat, gazetteer } from '../store.js';
import { setScenarioAlerts } from '../ui/alerts.js';
import { setHeatProvider } from '../heat/ui/shift.js';
import { setScenarioGrid, gridPoints } from '../feeds/openmeteo.js';
import { cityPack } from '../../config.js';
import flood2019 from './pune-2019-09-25.json';
import heatAfternoon from './pune-heat-afternoon.json';

export const SCENARIOS = [flood2019, heatAfternoon];

const PHOTO = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="100%" height="100%" fill="#5b6b7a"/><text x="50%" y="45%" fill="#fff" font-family="sans-serif" font-size="20" text-anchor="middle">📷 SIMULATED PHOTO</text><text x="50%" y="65%" fill="#dfe6ee" font-family="sans-serif" font-size="13" text-anchor="middle">scenario replay — not a real report</text></svg>')}`;

let sc = null, startReal = 0, offset = 0, playing = false, speed = 60, timer = null, lastReal = 0;
let bar, chip, lastGridKey = '';
const gridHooks = new Set();

/** Weather module (step 4) subscribes here to draw SIMULATED rain/heat cells. fn(state|null) */
export function onScenarioWeather(fn) { gridHooks.add(fn); return () => gridHooks.delete(fn); }

const at = (min) => new Date(startReal + min * 60000);
const clockNow = () => at(offset);
const hhmm = (min) => {
  const [h, m] = sc.clockStart.split(':').map(Number);
  const total = h * 60 + m + Math.floor(min);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** Interpolate the heat condition at the current offset. */
function heatAt(min) {
  const pts = sc.events.filter((e) => e.kind === 'heat').sort((a, b) => a.t - b.t);
  if (!pts.length) return null;
  let a = pts[0], b = pts[pts.length - 1];
  for (let i = 0; i < pts.length - 1; i++) if (pts[i].t <= min && pts[i + 1].t >= min) { a = pts[i]; b = pts[i + 1]; break; }
  if (min <= pts[0].t) b = a = pts[0];
  const f = b.t === a.t ? 0 : (min - a.t) / (b.t - a.t);
  const lerp = (x, y) => x + (y - x) * f;
  return { t: lerp(a.t2m, b.t2m), tw: lerp(a.tw, b.tw), sr: lerp(a.sr, b.sr), simulated: true };
}

/** Turn the scenario's rain bands / heat condition into SIMULATED grid cells (same shape as the Open-Meteo feed). */
function buildGrid(rain, heat) {
  const pts = gridPoints(cityPack());
  const lats = [...new Set(pts.map((p) => p.lat))].sort((a, b) => a - b);
  const band = (lat) => (lat === lats[0] ? 'south' : lat === lats[lats.length - 1] ? 'north' : 'central');
  const heatPts = sc.events.filter((e) => e.kind === 'heat').sort((a, b) => a.t - b.t);
  return pts.map((p, i) => {
    const wobble = ((i * 37) % 7) / 10 - 0.3; // small cell-to-cell variation so the grid doesn't look flat
    const mmhr = rain ? rain[band(p.lat)] ?? 0 : 0;
    const cur = heat
      ? { temperature_2m: +(heat.t + wobble).toFixed(1), wet_bulb_temperature_2m: +(heat.tw + wobble / 2).toFixed(1), shortwave_radiation: Math.round(heat.sr), precipitation: 0 }
      : { temperature_2m: 24 + wobble, wet_bulb_temperature_2m: 22.5, shortwave_radiation: 20, precipitation: mmhr };
    const hourly = heat
      ? { time: heatPts.map((e) => at(e.t).toISOString()), temperature_2m: heatPts.map((e) => e.t2m + wobble),
          wet_bulb_temperature_2m: heatPts.map((e) => e.tw), shortwave_radiation: heatPts.map((e) => e.sr),
          precipitation: heatPts.map(() => 0), precipitation_probability: heatPts.map(() => 0) }
      : { time: [0, 60, 120, 180].map((m) => at(offset + m).toISOString()), temperature_2m: [24, 24, 23, 23],
          wet_bulb_temperature_2m: [22.5, 22.5, 22, 22], shortwave_radiation: [0, 0, 0, 0],
          precipitation: [mmhr, mmhr * 0.8, mmhr * 0.4, 0], precipitation_probability: [mmhr ? 95 : 10, mmhr ? 85 : 10, 50, 20] };
    return { lat: p.lat, lng: p.lng, current: { apparent_temperature: cur.temperature_2m, relative_humidity_2m: heat ? 20 : 95, wind_gusts_10m: mmhr > 30 ? 45 : 15, ...cur }, hourly };
  });
}

function apply() {
  const evs = sc.events.filter((e) => e.t <= offset);
  const count = (kind, id) => evs.filter((e) => e.kind === kind && e.id === id).length;
  const pins = [];
  for (const e of evs) {
    if (e.kind === 'report') {
      pins.push(makePin({ id: e.id, type: e.type, lat: e.lat, lng: e.lng, depth: e.depth, inUnderpass: !!e.underpass,
        photo: e.photo ? PHOTO : null, source: { kind: 'citizen', name: e.note ?? 'Citizen report' },
        createdAt: at(e.t).toISOString(), confirmations: count('confirm', e.id), clearedVotes: count('clear', e.id), simulated: true }));
    }
    if (e.kind === 'post') {
      for (const pl of e.places) {
        const g = gazetteer.find((x) => x.name === pl.name);
        if (!g) continue;
        pins.push(makePin({ id: `${sc.id}-${e.t}-${pl.name}`, type: pl.type, lat: g.lat, lng: g.lng, name: g.name,
          depth: pl.type === 'flood' ? (pl.closed ? 'above_knee' : pl.depth ?? 'knee') : 'none',
          cause: pl.type === 'clog' ? 'clogged_drain' : 'rain', source: { kind: 'official', name: e.source, url: null },
          createdAt: at(e.t).toISOString(), simulated: true }));
      }
    }
    if (e.kind === 'cooling') {
      pins.push(makePin({ id: e.id, type: 'cooling', lat: e.lat, lng: e.lng, name: e.name, amenities: e.amenities,
        source: { kind: 'citizen', name: 'Citizen (simulated)' }, createdAt: at(e.t).toISOString(), simulated: true }));
    }
  }
  setScenarioPins(pins);
  setScenarioAlerts(evs.filter((e) => e.kind === 'alert').reverse()
    .map((e) => ({ title: e.title, author: `(${e.source})`, publishedAt: at(e.t).toISOString(), simulated: true })));
  const rain = [...evs].reverse().find((e) => e.kind === 'rain')?.cells ?? null;
  const heat = heatAt(offset);
  const gkey = JSON.stringify(rain) + (heat ? `${heat.t.toFixed(1)}/${heat.tw.toFixed(1)}/${Math.round(heat.sr / 10)}` : '');
  if (gkey !== lastGridKey) { lastGridKey = gkey; setScenarioGrid(buildGrid(rain, heat)); } // only when values change
  gridHooks.forEach((fn) => fn({ rain, heat, simulated: true }));
  updateLive();
}

let dragging = false;
/** Cheap per-tick update: clock text, slider position, play label — never rebuilds the bar (keeps drag + clicks working). */
function updateLive() {
  renderChip();
  if (bar.hidden || !sc) return;
  const clock = bar.querySelector('.sb-clock'); if (clock) clock.textContent = `${hhmm(offset)} · T+${Math.floor(offset)}′`;
  const sl = bar.querySelector('[data-f=scrub]'); if (sl && !dragging) sl.value = String(Math.floor(offset));
  const pb = bar.querySelector('[data-act=play]'); if (pb) pb.textContent = playing ? '⏸' : '▶';
}

function tick() {
  const n = performance.now();
  if (playing) {
    offset = Math.min(sc.durationMin, offset + ((n - lastReal) / 1000) * (speed / 60));
    if (offset >= sc.durationMin) { playing = false; }
  }
  lastReal = n;
  setClock(clockNow); // notifies the store → pins, route verdict, cards re-derive with the scenario clock
  apply();
}

export function loadScenario(id) {
  sc = SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
  startReal = Date.now(); offset = 0; lastGridKey = ''; speed = sc.speed ?? 60; playing = false;
  setHeatProvider(sc.hazard === 'heat' ? async () => heatAt(offset) : null);
  setClockFormat((d) => hhmm((d.getTime() - startReal) / 60000));
  window.dispatchEvent(new CustomEvent('sajag:set-hazard', { detail: { hazard: sc.hazard } }));
  clearInterval(timer); timer = setInterval(tick, 250); lastReal = performance.now();
  chip.classList.add('scenario');
  bar.hidden = false; renderBar();
  tick();
}

export function exitScenario() {
  clearInterval(timer); timer = null; sc = null; playing = false;
  setClock(null); setClockFormat(null); setScenarioPins([]); setScenarioAlerts(null); setHeatProvider(null); setScenarioGrid(null);
  gridHooks.forEach((fn) => fn(null));
  chip.classList.remove('scenario');
  bar.hidden = true; renderChip();
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderChip() { chip.textContent = sc ? `${t('mode.scenario')} · ${hhmm(offset)}` : t('mode.live'); }

function renderBar() {
  renderChip();
  if (bar.hidden) return;
  if (!sc) {
    bar.innerHTML = `<div class="sb-row"><b>🎬 ${esc(t('scenario.pick'))}</b><button class="btn btn-ghost" data-act="close">✕</button></div>
      <div class="sb-row">${SCENARIOS.map((s) => `<button class="chip" data-load="${s.id}">${s.hazard === 'heat' ? '☀️' : '🌧'} ${esc(s.title)}</button>`).join('')}</div>
      <p class="muted">${esc(t('scenario.note'))}</p>`;
    return;
  }
  bar.innerHTML = `<div class="sb-row"><span class="tag-sim">${esc(t('tag.simulated'))}</span> <b>${esc(sc.title)}</b></div>
    <div class="sb-row sb-controls">
      <button class="btn" data-act="play">${playing ? '⏸' : '▶'}</button>
      <button class="btn" data-act="reset">⟲</button>
      <select data-f="speed" aria-label="${esc(t('scenario.speed'))}">${[30, 60, 120, 300].map((v) => `<option value="${v}" ${v === speed ? 'selected' : ''}>${v}×</option>`).join('')}</select>
      <input type="range" min="0" max="${sc.durationMin}" step="1" value="${Math.floor(offset)}" data-f="scrub" aria-label="time">
      <span class="sb-clock">${esc(hhmm(offset))} · T+${Math.floor(offset)}′</span>
      <button class="btn btn-ghost" data-act="live">${esc(t('scenario.back'))}</button>
    </div>
    <p class="muted sb-sub">${esc(sc.subtitle)}</p>`;
}

export function initScenario() {
  chip = document.getElementById('mode-chip');
  chip.setAttribute('role', 'button'); chip.tabIndex = 0;
  bar = document.createElement('div');
  bar.id = 'scenario-bar'; bar.hidden = true;
  document.getElementById('app').append(bar);
  chip.addEventListener('click', () => { bar.hidden = !bar.hidden; renderBar(); });
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.load) return loadScenario(b.dataset.load);
    const act = b.dataset.act;
    if (act === 'close') { bar.hidden = true; return; }
    if (act === 'play') { if (offset >= sc.durationMin) offset = 0; playing = !playing; lastReal = performance.now(); updateLive(); }
    if (act === 'reset') { offset = 0; playing = false; tick(); }
    if (act === 'live') exitScenario();
  });
  bar.addEventListener('input', (e) => {
    if (e.target.dataset.f === 'scrub') { dragging = true; offset = Number(e.target.value); tick(); }
  });
  bar.addEventListener('pointerup', () => { dragging = false; });
  bar.addEventListener('change', (e) => { if (e.target.dataset.f === 'scrub') dragging = false; });
  bar.addEventListener('change', (e) => { if (e.target.dataset.f === 'speed') { speed = Number(e.target.value); } });
  onLang(() => renderBar());
  const q = new URLSearchParams(location.search).get('scenario');
  if (q) loadScenario(q);
}

export const scenarioActive = () => !!sc;

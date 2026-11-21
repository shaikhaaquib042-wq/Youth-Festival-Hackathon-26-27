// Shift mode — continuous in-shift heat check (PRD §21.3, §23 MH SOP).
// Every SHIFT_CHECK_MIN: re-assess heat stress at the worker's position; announce level changes;
// water reminder every HYDRATION_MIN; work/rest cycle with break start/end; crew share; screen wake lock.
// Uses the store clock `now()` so Scenario mode compresses the whole shift.
import { t, onLang } from '../../i18n/index.js';
import { speak } from '../../i18n/speak.js';
import { CONFIG, cityPack } from '../../../config.js';
import { now } from '../../store.js';
import { getFix, requestLocation } from '../../location.js';
import { estimateWBGT, assessWork } from '../index.js';
import { SEV_COLOR } from '../../map/pins.js';
import { openUnwell } from './unwell.js';

export const PREFS_KEY = 'sajag.heatPrefs'; // { workType, newToHeat } — shared with the heat status card
const LEVEL_TO_SEV = { green: 'green', yellow: 'yellow', orange: 'orange', red: 'red' };

let el, btn, shift = null, tickTimer = null, wakeLock = null;
let provider = null; // async ({lat,lng}) => { t, tw, sr, simulated? } — set by the weather module after step 4 merge

export const loadPrefs = () => { try { return { workType: 'moderate', newToHeat: false, ...JSON.parse(localStorage.getItem(PREFS_KEY)) }; } catch { return { workType: 'moderate', newToHeat: false }; } };
const savePrefs = (p) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignore */ } };
const hhmm = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
const addMin = (d, m) => new Date(d.getTime() + m * 60000);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Let the weather feed supply conditions (Scenario-aware). */
export function setHeatProvider(fn) { provider = fn; if (shift) assess(true); }

// Fallback provider: live Open-Meteo for the exact point (until the grid feed is wired in).
async function defaultProvider(at) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${at.lat.toFixed(3)}&longitude=${at.lng.toFixed(3)}&current=temperature_2m,wet_bulb_temperature_2m,shortwave_radiation&timezone=Asia%2FKolkata`;
  const j = await (await fetch(u)).json();
  return { t: j.current.temperature_2m, tw: j.current.wet_bulb_temperature_2m, sr: j.current.shortwave_radiation };
}

const mhSop = () => ['pune', 'mumbai'].includes(cityPack().id);

async function assess(announce) {
  const at = getFix() ?? { lat: cityPack().center[1], lng: cityPack().center[0] };
  try {
    const c = await (provider ?? defaultProvider)(at);
    const wbgt = estimateWBGT({ t: c.t, tw: c.tw, sr: c.sr }, CONFIG.HEAT);
    const a = assessWork({ wbgt: wbgt.sun, workType: shift.workType, newToHeat: shift.newToHeat }, CONFIG.HEAT);
    const changed = shift.level && shift.level !== a.level;
    Object.assign(shift, { level: a.level, assessment: a, cond: c, wbgt: wbgt.sun, checkedAt: now(), nextCheck: addMin(now(), CONFIG.HEAT.SHIFT_CHECK_MIN) });
    // Restart the work/rest cycle on a level change.
    if (changed || !shift.phaseEnd) startPhase('work');
    if (announce || changed) speak(a.i18nKey, a.vars);
  } catch (e) { console.warn('[shift] assess failed', e.message); shift.nextCheck = addMin(now(), 5); }
  render();
}

function startPhase(phase) {
  const a = shift.assessment;
  shift.phase = phase;
  const mins = phase === 'work' ? (a.work || 60) : a.rest;
  shift.phaseEnd = addMin(now(), mins);
  if (phase === 'rest') speak('heat.breakStart', { n: a.rest });
}

function tick() {
  if (!shift) return;
  const n = now();
  if (n >= shift.nextWater) { speak('heat.water'); shift.nextWater = addMin(n, CONFIG.HEAT.HYDRATION_MIN); flash(t('heat.water')); }
  if (shift.phaseEnd && n >= shift.phaseEnd && shift.assessment) {
    const a = shift.assessment;
    if (shift.phase === 'work' && a.rest > 0) startPhase('rest');
    else startPhase('work');
  }
  if (n >= shift.nextCheck) assess(false);
  render();
}

function flash(msg) { const b = document.getElementById('toast'); if (b) { b.textContent = msg; b.hidden = false; setTimeout(() => { b.hidden = true; }, 5000); } }

async function start(prefs) {
  savePrefs(prefs);
  await requestLocation({ timeoutMs: 8000 });
  shift = { ...prefs, startedAt: now(), nextWater: addMin(now(), CONFIG.HEAT.HYDRATION_MIN), nextCheck: now(), phase: 'work', phaseEnd: null };
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* not supported / denied */ }
  clearInterval(tickTimer); tickTimer = setInterval(tick, 5000);
  await assess(true);
}

function stop() {
  shift = null; clearInterval(tickTimer); tickTimer = null;
  wakeLock?.release?.(); wakeLock = null;
  render();
}

function crewText() {
  const a = shift.assessment;
  return `${t('app.name')} · ${t('shift.crewHead', { time: hhmm(now()) })}: ${t('severity.' + LEVEL_TO_SEV[a.level])} — ${t(a.i18nKey, a.vars)}. ${t('heat.water')}.\n${t('disclaimer')}\n${location.origin}/?hazard=heat`;
}

function render() {
  if (!el) return;
  btn.textContent = shift ? `⏹ ${t('action.endShift')}` : `▶ ${t('action.startShift')}`;
  if (!shift) {
    const p = loadPrefs();
    el.innerHTML = el.hidden ? '' : `<div class="rp-head"><b>${esc(t('action.startShift'))}</b><button class="btn btn-ghost" data-act="close">✕</button></div>
      <div class="field"><span>${esc(t('shift.workType'))}</span><div class="rs-row">${['light', 'moderate', 'heavy']
        .map((w) => `<button class="chip ${p.workType === w ? 'on' : ''}" data-wt="${w}">${esc(t('work.' + w))}</button>`).join('')}</div></div>
      <div class="rs-row"><button class="chip ${p.newToHeat ? 'on' : ''}" data-act="new">${esc(t('heat.newToHeat'))}</button></div>
      <div class="rs-row rs-actions"><button class="btn btn-primary" data-act="start">▶ ${esc(t('action.startShift'))}</button></div>
      <p class="muted">${esc(t('shift.keepOpen'))}</p>`;
    return;
  }
  el.hidden = false;
  const a = shift.assessment;
  const sev = a ? LEVEL_TO_SEV[a.level] : 'grey';
  const sopLine = mhSop() && a && (a.level === 'orange' || a.level === 'red') ? `<p class="sop">🏛 ${esc(t('shift.mhSop'))}</p>` : '';
  el.innerHTML = `<div class="rp-head"><b>☀️ ${esc(t('work.' + shift.workType))}${shift.newToHeat ? ' · ' + esc(t('shift.new')) : ''}</b>
      <button class="btn btn-ghost" data-act="min">▾</button></div>
    <div class="shift-status" style="border-color:${SEV_COLOR[sev]}">
      <div class="rv-head" style="color:${SEV_COLOR[sev]}">${a ? esc(t('severity.' + sev)) : '…'}${shift.cond?.simulated ? ` <span class="tag-sim">${esc(t('tag.simulated'))}</span>` : ''}</div>
      ${a ? `<div class="shift-advice">${esc(t(a.i18nKey, a.vars))}</div>` : ''}
      ${shift.cond ? `<div class="muted">${esc(t('shift.reading', { t: Math.round(shift.cond.t), wbgt: shift.wbgt?.toFixed(1) }))}</div>` : ''}
      ${shift.phaseEnd && a?.rest ? `<div>${esc(shift.phase === 'rest' ? t('shift.onBreak', { time: hhmm(shift.phaseEnd) }) : t('shift.nextBreak', { time: hhmm(shift.phaseEnd) }))}</div>` : ''}
      <div>💧 ${esc(t('shift.nextWater', { time: hhmm(shift.nextWater) }))}</div>
      ${a?.level === 'orange' || a?.level === 'red' ? `<p class="muted">${esc(t('heat.ndmaAdvisory'))}</p>` : ''}
      ${sopLine}
    </div>
    <div class="rs-row"><button class="btn" data-act="speak">🔊</button><button class="btn" data-act="share">🟢 ${esc(t('shift.crew'))}</button>
      <button class="btn btn-danger" data-act="unwell">🆘 ${esc(t('action.unwell'))}</button><button class="btn btn-ghost" data-act="stop">⏹ ${esc(t('action.endShift'))}</button></div>`;
}

export function initShift() {
  btn = document.getElementById('shift-btn');
  el = document.createElement('div');
  el.className = 'route-panel shift-panel'; el.hidden = true;
  document.getElementById('app').append(el);
  btn.addEventListener('click', () => { if (shift) { el.hidden = !el.hidden; render(); } else { el.hidden = !el.hidden; render(); } });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const p = loadPrefs();
    if (b.dataset.wt) { savePrefs({ ...p, workType: b.dataset.wt }); return render(); }
    const act = b.dataset.act;
    if (act === 'new') { savePrefs({ ...p, newToHeat: !p.newToHeat }); return render(); }
    if (act === 'start') return start(loadPrefs());
    if (act === 'stop') { stop(); el.hidden = true; return; }
    if (act === 'close' || act === 'min') { el.hidden = true; return; }
    if (act === 'speak' && shift?.assessment) return speak(shift.assessment.i18nKey, shift.assessment.vars);
    if (act === 'share' && shift?.assessment) return window.open(`https://wa.me/?text=${encodeURIComponent(crewText())}`, '_blank', 'noopener');
    if (act === 'unwell') return openUnwell();
  });
  document.addEventListener('visibilitychange', async () => { if (shift && document.visibilityState === 'visible') { try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* ignore */ } } });
  window.addEventListener('sajag:hazard', (e) => { const heat = e.detail.hazard === 'heat'; btn.hidden = !heat; document.getElementById('unwell-btn').hidden = !heat; if (!heat) el.hidden = true; });
  onLang(render);
}

export const shiftState = () => shift;

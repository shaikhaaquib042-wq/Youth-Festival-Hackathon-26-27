// "I feel unwell" (PRD §21.4): tap-only symptom check → Call 108 / rest advice + nearest help. Never diagnoses.
import { t } from '../../i18n/index.js';
import { speak } from '../../i18n/speak.js';
import { RED_FLAGS, WARNING_SIGNS, triage } from '../illness.js';
import { getPins } from '../../store.js';
import { getFix } from '../../location.js';
import { distM } from '../../engine/geo.js';
import { cityPack } from '../../../config.js';

let el, selected = new Set(), coworker = false;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function nearestHelp(kinds) {
  const at = getFix(); if (!at) return null;
  let best = null;
  for (const p of getPins()) {
    if (p.type !== 'cooling' || !p.amenities?.some((a) => kinds.includes(a))) continue;
    const d = distM(at, p);
    if (!best || d < best.d) best = { p, d };
  }
  return best ? t('unwell.nearest', { name: best.p.name, m: Math.round(best.d) }) : null;
}

function helplines() {
  const nums = (cityPack().helplines ?? []).filter((h) => h.number === '108' || h.number === '112')
    .sort((a, b) => (a.number === '108' ? -1 : b.number === '108' ? 1 : 0)); // ambulance first
  return nums.map((h) => `<a class="btn ${h.number === '108' ? 'btn-danger' : ''}" href="tel:${h.number}">📞 ${esc(h.number === '108' ? t('action.call108') : t('unwell.call112'))}</a>`).join('');
}

function render(step = 'ask') {
  const signs = (list, cls) => list.map((s) => `<button class="chip ${selected.has(s.id) ? 'on' : ''} ${cls}" data-sign="${s.id}">${esc(t(s.i18nKey))}</button>`).join('');
  if (step === 'ask') {
    el.innerHTML = `<div class="sheet"><h2>${esc(t('unwell.title'))}</h2>
      <div class="rs-row"><button class="chip ${coworker ? 'on' : ''}" data-act="cow">👥 ${esc(t('unwell.coworker'))}</button></div>
      <p class="muted"><b>${esc(t('unwell.redFlags'))}</b></p><div class="rs-row">${signs(RED_FLAGS, 'chip-red')}</div>
      <p class="muted">${esc(t('unwell.warningTitle'))}</p><div class="rs-row">${signs(WARNING_SIGNS, '')}</div>
      <div class="rs-row rs-actions"><button class="btn btn-ghost" data-act="close">${esc(t('report.cancel'))}</button>
        <button class="btn" data-act="none">${esc(t('unwell.none'))}</button>
        <button class="btn btn-primary" data-act="go" ${selected.size ? '' : 'disabled'}>➜</button></div>
      <div class="rs-row">${helplines()}</div></div>`;
    return;
  }
  const result = step === 'none' ? 'ok' : triage([...selected]);
  if (result === 'emergency') {
    speak('unwell.emergency');
    el.innerHTML = `<div class="sheet sheet-emergency"><h2>🚨 ${esc(t('unwell.emergency'))}</h2>
      <div class="rs-row big-call">${helplines()}</div>
      <p>${esc(t('unwell.firstAid'))}</p>
      <p class="muted">${esc(t('unwell.doubt'))}</p>
      <div class="rs-row rs-actions"><button class="btn btn-ghost" data-act="close">✕</button></div></div>`;
    return;
  }
  const near = nearestHelp(result === 'exhaustion' ? ['clinic', 'water', 'ors'] : ['water', 'shade']);
  if (result === 'exhaustion') speak('unwell.exhaustion');
  el.innerHTML = `<div class="sheet"><h2>${esc(result === 'exhaustion' ? '⚠️ ' + t('unwell.exhaustionTitle') : '✅ ' + t('unwell.okTitle'))}</h2>
    <p>${esc(result === 'exhaustion' ? t('unwell.exhaustion') : t('unwell.ok'))}</p>
    ${near ? `<p><b>${esc(near)}</b></p>` : ''}
    <p class="muted">${esc(t('unwell.doubt'))}</p>
    <div class="rs-row">${helplines()}</div>
    <div class="rs-row rs-actions"><button class="btn btn-ghost" data-act="back">←</button><button class="btn" data-act="close">✕</button></div></div>`;
}

export function openUnwell() {
  selected = new Set();
  el.hidden = false;
  render('ask');
}

export function initUnwell() {
  el = document.createElement('div');
  el.className = 'sheet-backdrop'; el.hidden = true;
  document.body.append(el);
  el.addEventListener('click', (e) => {
    if (e.target === el) { el.hidden = true; return; }
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.sign) { selected.has(b.dataset.sign) ? selected.delete(b.dataset.sign) : selected.add(b.dataset.sign); return render('ask'); }
    const act = b.dataset.act;
    if (act === 'close') el.hidden = true;
    if (act === 'cow') { coworker = !coworker; render('ask'); }
    if (act === 'go') render('result');
    if (act === 'none') render('none');
    if (act === 'back') render('ask');
  });
  for (const id of ['unwell-btn']) document.getElementById(id)?.addEventListener('click', openUnwell);
}

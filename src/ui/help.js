// Help sheet (Rain side 🆘): big tap-to-call buttons, ambulance first. Heat side 🆘 opens the "I feel unwell" check instead.
import { t } from '../i18n/index.js';
import { cityPack } from '../../config.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let el;

export function openHelp() {
  if (!el) {
    el = document.createElement('div');
    el.className = 'sheet-backdrop';
    document.body.append(el);
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-act=close]')) el.hidden = true; });
  }
  const order = { 108: 0, 112: 1, 1077: 2 };
  const lines = [...(cityPack().helplines ?? [])].sort((a, b) => (order[a.number] ?? 9) - (order[b.number] ?? 9));
  el.innerHTML = `<div class="sheet"><h2>🆘 ${esc(t('help.title'))}</h2>
    ${lines.map((h, i) => `<a class="btn ${i === 0 ? 'btn-danger' : ''} btn-xl call" href="tel:${esc(h.number.replace(/[^0-9]/g, ''))}">📞 ${esc(h.number)} · ${esc(h.number === '108' ? t('help.ambulance') : h.number === '112' ? t('help.emergency') : h.label)}</a>`).join('')}
    <button class="btn btn-ghost" data-act="close">✕</button></div>`;
  el.hidden = false;
}

export function initHelp() {
  document.getElementById('help-btn')?.addEventListener('click', openHelp);
}

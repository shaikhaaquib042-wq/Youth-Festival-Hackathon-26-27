// Help sheet (Rain side 🆘): big tap-to-call buttons, ambulance first. Heat side 🆘 opens the "I feel unwell" check instead.
// Also opened by voice when a cry for help is heard (ui/voice.js): shows what was heard and, on the Rain side,
// a "Not an emergency — continue my report" escape so a false match never blocks a report.
import { t, onLang } from '../i18n/index.js';
import { cityPack } from '../../config.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let el, options;

/** @param {{heard?: string, onContinue?: (()=>void)|null}} [opts] */
export function openHelp(opts = {}) {
  if (!el) {
    el = document.createElement('div');
    el.className = 'sheet-backdrop';
    el.hidden = true;
    document.body.append(el);
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-act=continue]')) { el.hidden = true; options.onContinue?.(); return; }
      if (e.target === el || e.target.closest('[data-act=close]')) el.hidden = true;
    });
    onLang(() => { if (!el.hidden) render(); });
  }
  options = opts;
  el.hidden = false;
  render();
}

function render() {
  const { heard, onContinue } = options;
  const order = { 108: 0, 112: 1, 1077: 2 };
  const lines = [...(cityPack().helplines ?? [])].sort((a, b) => (order[a.number] ?? 9) - (order[b.number] ?? 9));
  el.innerHTML = `<div class="sheet"><h2>🆘 ${esc(t('help.title'))}</h2>
    ${heard ? `<p class="help-heard">🎤 ${esc(t('voice.heard', { text: heard }))}</p>` : ''}
    ${lines.map((h, i) => `<a class="btn ${i === 0 ? 'btn-danger' : ''} btn-xl call" href="tel:${esc(h.number.replace(/[^0-9]/g, ''))}">📞 ${esc(h.number)} · ${esc(h.number === '108' ? t('help.ambulance') : h.number === '112' ? t('help.emergency') : h.label)}</a>`).join('')}
    ${onContinue ? `<button class="btn btn-ghost" data-act="continue">${esc(t('help.continueReport'))}</button>` : ''}
    <p class="muted">${esc(t('disclaimer'))}</p>
    <button class="btn btn-ghost" data-act="close">✕</button></div>`;
}

export function initHelp() {
  document.getElementById('help-btn')?.addEventListener('click', () => openHelp());
}

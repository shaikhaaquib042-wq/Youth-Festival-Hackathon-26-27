// 💧 Water / shade view: category chips (public spots first, clinics opt-in) + "Add free water spot".
import { t, onLang } from '../i18n/index.js';

const CATS = [['water', '💧'], ['shade', '🌳'], ['toilet', '🚻'], ['medical', '🏥']];
let el, on = new Set(['water', 'shade', 'toilet']), visible = false;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function render() {
  el.hidden = !visible;
  if (!visible) return;
  el.innerHTML = `<button class="chip cool-add" data-act="add">＋ ${esc(t('cool.addWater'))}</button>`
    + CATS.map(([c, i]) => `<button class="chip ${on.has(c) ? 'on' : ''}" data-cat="${c}">${i} ${esc(t('cool.' + c))}</button>`).join('');
}

export function initCoolingBar({ openAddWater }) {
  el = document.createElement('div');
  el.id = 'cool-bar'; el.hidden = true;
  document.getElementById('app')?.append(el) ?? document.body.append(el);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'add') return openAddWater();
    const c = b.dataset.cat; if (on.has(c)) on.delete(c); else on.add(c);
    window.dispatchEvent(new CustomEvent('sajag:cool-filter', { detail: { cats: [...on] } }));
    render();
  });
  window.addEventListener('sajag:show-cooling', (e) => { visible = Boolean(e.detail?.on); render(); });
  window.addEventListener('sajag:hazard', () => { visible = false; render(); });
  onLang(() => render());
}

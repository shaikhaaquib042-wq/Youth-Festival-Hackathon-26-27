import { themePref, setTheme } from '../theme.js';
// "⋯ More" — everything that isn't the one answer + three buttons lives here, as big rows.
import { t, setLang, LANGS, pickerLangs, getLang, onLang } from '../i18n/index.js';
import { cityPack, CITY_PACKS } from '../../config.js';
import { switchCity } from './citySwitch.js';
import { WHO, applyWho, currentWho } from './profile.js';
import { currentUser, signOut, onAuth } from '../backend/auth.js';
import { backendReady } from '../backend/client.js';
import { openSignIn } from './signin.js';
import { openHelp } from './help.js';
import { openPaste } from './paste.js';
import { startOnboarding } from './onboarding.js';
import * as weather from '../map/weather.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let el, map, open = false;

function render() {
  if (!open) { el.hidden = true; return; }
  el.hidden = false;
  const u = currentUser()?.anonymous ? null : currentUser(); // silent heat-side session ≠ signed in
  const radarOn = weather.isRadarVisible?.() ?? false;
  const heat = document.body.dataset.hazard === 'heat';
  el.innerHTML = `<div class="sheet more-sheet" role="dialog" aria-modal="true">
    <div class="rp-head"><h2>${esc(t('more.title'))}</h2><button class="btn btn-ghost" data-act="close">✕</button></div>
    <div class="more-sec"><div class="more-h">🗣 ${esc(t('more.language'))}</div>
      <div class="rs-row">${pickerLangs(cityPack()).map((l) => `<button class="chip ${getLang() === l ? 'on' : ''}" data-lang="${l}">${esc(LANGS[l].name)}</button>`).join('')}</div></div>
    <div class="more-sec"><div class="more-h">🙋 ${esc(t('more.who'))}</div>
      <div class="rs-row">${WHO.map((w) => `<button class="chip ${currentWho() === w.id ? 'on' : ''}" data-who="${w.id}">${w.icon} ${esc(t(w.key))}</button>`).join('')}</div></div>
    <div class="more-sec"><div class="more-h">🏙 ${esc(t('more.city'))}</div>
      <div class="rs-row">${Object.values(CITY_PACKS).map((c) => `<button class="chip ${cityPack().id === c.id ? 'on' : ''}" data-city="${c.id}">${esc(c.name)}</button>`).join('')}</div></div>
    <div class="more-sec"><div class="more-h">🌓 ${esc(t('more.theme'))}</div>
      <div class="rs-row">${['auto', 'light', 'dark'].map((m) => `<button class="chip ${themePref() === m ? 'on' : ''}" data-theme-pick="${m}">${esc(t('theme.' + m))}</button>`).join('')}</div></div>
    <button class="more-row" data-act="help">☎️ ${esc(t('more.helplines'))}</button>
    <button class="more-row" data-act="paste">📋 ${esc(t('paste.menu'))}</button>
    ${heat ? `<button class="more-row" data-act="cooling">➕💧 ${esc(t('more.addCooling'))}</button>` : `<button class="more-row" data-act="radar">📡 ${esc(t('more.radar'))}: ${radarOn ? '✅' : '—'}</button>`}
    ${backendReady() ? `<button class="more-row" data-act="account">👤 ${esc(u ? `${t('auth.signOut')} (${u.email ?? u.name ?? ''})` : t('auth.signIn'))}</button>` : ''}
    <button class="more-row" data-act="setup">🔁 ${esc(t('more.setupAgain'))}</button>
    <button class="more-row muted" data-act="demo">🎬 ${esc(t('more.demo'))}</button>
    <p class="muted">${esc(t('disclaimer'))}</p></div>`;
}

export function initMore(m, { openReportCooling } = {}) {
  map = m;
  el = document.createElement('div');
  el.className = 'sheet-backdrop'; el.hidden = true;
  document.body.append(el);
  document.getElementById('more-btn').addEventListener('click', () => { open = true; render(); });
  el.addEventListener('click', (e) => {
    if (e.target === el) { open = false; return render(); }
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.lang) { setLang(b.dataset.lang); return render(); }
    if (b.dataset.themePick) { setTheme(b.dataset.themePick); return render(); }
    if (b.dataset.who) { applyWho(b.dataset.who); return render(); }
    if (b.dataset.city) { if (b.dataset.city !== cityPack().id) switchCity(b.dataset.city); return; }
    const act = b.dataset.act;
    open = act === 'radar'; // every other row closes the menu
    if (act === 'close') return render();
    if (act === 'help') { render(); return openHelp(); }
    if (act === 'paste') { render(); return openPaste(); }
    if (act === 'radar') { weather.setRadarVisible?.(map, !(weather.isRadarVisible?.() ?? false)); open = true; return render(); }
    if (act === 'account') { render(); return currentUser() && !currentUser().anonymous ? signOut() : openSignIn(); }
    if (act === 'setup') { render(); return startOnboarding({ force: true }); }
    if (act === 'cooling') { render(); window.dispatchEvent(new CustomEvent('sajag:set-hazard', { detail: { hazard: 'heat' } })); return openReportCooling?.(); }
    if (act === 'demo') { render(); return document.getElementById('mode-chip').click(); }
    render();
  });
  onLang(() => render());
  onAuth(() => render());
}

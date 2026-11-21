// Suggest the matching city pack after the app's existing location flow reports a fix.
import { CITY_PACKS, CONFIG, cityPack } from '../../config.js';
import { onFix } from '../location.js';
import { cityForFix } from './onboarding.js';
import { onLang, t } from '../i18n/index.js';

const DECLINED_KEY = 'sajag.cityDeclined';
let banner = null;
let target = null;
let unsubscribeLang = null;

function locationWithPack(id) {
  try { localStorage.setItem('sajag.city', id); } catch { /* private mode */ }
  const url = new URL(location.href);
  url.searchParams.delete('city');
  url.searchParams.delete('scenario');
  location.assign(`${url.pathname}${url.search}${url.hash}`);
}

/** Set the active city and reload into its saved pack. Used by the optional More menu. */
export function switchCity(id) {
  if (!CITY_PACKS[id]) return false;
  locationWithPack(id);
  return true;
}

function ensureBanner() {
  if (banner?.isConnected) return;
  const style = document.createElement('style');
  style.textContent = `
    #sajag-city-switch { position:fixed; top:calc(56px + env(safe-area-inset-top)); left:10px; right:10px; z-index:6;
      display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px;
      border:1px solid #c9d9dc; border-radius:12px; background:#fff; color:#17343b;
      box-shadow:0 3px 16px #14353b33; font:600 15px/1.35 system-ui,sans-serif; }
    #sajag-city-switch .sj-city-text { flex:1; }
    #sajag-city-switch .sj-city-actions { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
    #sajag-city-switch button { min-height:48px; padding:8px 14px; border:0; border-radius:9px; font:700 15px system-ui,sans-serif; cursor:pointer; }
    #sajag-city-switch [data-city-act="switch"] { background:#087f5b; color:white; }
    #sajag-city-switch [data-city-act="stay"] { background:#edf2f3; color:#17343b; }
    @media (max-width:560px) { #sajag-city-switch { align-items:stretch; flex-direction:column; } #sajag-city-switch .sj-city-actions { justify-content:stretch; }
      #sajag-city-switch .sj-city-actions button { flex:1; } }
  `;
  document.head.append(style);
  banner = document.createElement('aside');
  banner.id = 'sajag-city-switch';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-live', 'polite');
  banner.addEventListener('click', (event) => {
    const action = event.target.closest('button')?.dataset.cityAct;
    if (!action || !target) return;
    if (action === 'switch') return switchCity(target.id);
    try { localStorage.setItem(DECLINED_KEY, target.id); } catch { /* private mode */ }
    hideBanner();
  });
  document.body.append(banner);
  unsubscribeLang = onLang(renderBanner);
}

function renderBanner() {
  if (!banner || !target) return;
  const current = cityPack();
  banner.innerHTML = `<span class="sj-city-text">${t('city.switchPrompt', { city: target.name })}</span>
    <span class="sj-city-actions"><button type="button" data-city-act="switch">${t('city.switch')}</button>
    <button type="button" data-city-act="stay">${t('city.stay', { city: current.name })}</button></span>`;
}

function hideBanner() {
  target = null;
  banner?.remove();
  banner = null;
  unsubscribeLang?.();
  unsubscribeLang = null;
}

function handleFix(fix) {
  if (!fix) return;
  const candidate = cityForFix(fix);
  if (!candidate || candidate.id === cityPack().id) return hideBanner();
  let declined = null;
  try { declined = localStorage.getItem(DECLINED_KEY); } catch { /* private mode */ }
  if (declined === candidate.id) return hideBanner();
  target = candidate;
  ensureBanner();
  renderBanner();
}

/** Subscribe to fixes from the app's existing location service; never prompts for location. */
export function initCitySwitch() {
  const params = new URLSearchParams(location.search);
  if (params.has('scenario') || params.has('city')) return;
  onFix((fix) => handleFix(fix));
  if (import.meta.env.DEV) window.__simulateFix = (lat, lng) => handleFix({ lat: Number(lat), lng: Number(lng) });
}

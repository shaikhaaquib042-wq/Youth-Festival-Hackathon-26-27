// Theme (light / dark / auto). Auto follows the phone's setting. Sets <html data-theme="light|dark">,
// remembers the choice (sajag.theme) and fires `sajag:theme` {theme} so the map can swap its basemap.
const KEY = 'sajag.theme';
const mq = matchMedia('(prefers-color-scheme: dark)');
let pref = 'auto';
try { pref = localStorage.getItem(KEY) || 'auto'; } catch { /* private mode */ }

export const themePref = () => pref;
export const resolvedTheme = () => (pref === 'auto' ? (mq.matches ? 'dark' : 'light') : pref);

function apply() {
  const th = resolvedTheme();
  document.documentElement.dataset.theme = th;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', th === 'dark' ? '#0f1115' : '#ffffff');
  window.dispatchEvent(new CustomEvent('sajag:theme', { detail: { theme: th } }));
}

export function setTheme(p) {
  pref = ['light', 'dark'].includes(p) ? p : 'auto';
  try { localStorage.setItem(KEY, pref); } catch { /* ignore */ }
  apply();
}

export function initTheme() {
  const q = new URLSearchParams(location.search).get('theme'); // ?theme=dark for demos/screenshots
  if (q) pref = q;
  mq.addEventListener?.('change', () => { if (pref === 'auto') apply(); });
  apply();
}

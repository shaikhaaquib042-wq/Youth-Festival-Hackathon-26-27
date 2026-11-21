// Localisation — ORCHESTRATOR-OWNED. All user-facing text goes through t('key', vars).
// Tables: en (base) · mr · hi · kn · te. Missing key → English → the key itself.
// City pack decides which languages are offered first (`languages.ui`) and which are spoken (`languages.voice`).
import en from './en.js';
import mr from './mr.js';
import hi from './hi.js';
import kn from './kn.js';
import te from './te.js';
import { cityPack } from '../../config.js';

const TABLES = { en, mr, hi, kn, te };

/** BCP-47 tags used for <html lang>, Intl and speech voices. */
export const LANGS = {
  en: { bcp47: 'en-IN', name: en['lang.name'] },
  mr: { bcp47: 'mr-IN', name: mr['lang.name'] },
  hi: { bcp47: 'hi-IN', name: hi['lang.name'] },
  kn: { bcp47: 'kn-IN', name: kn['lang.name'] },
  te: { bcp47: 'te-IN', name: te['lang.name'] },
};

const STORE_KEY = 'mm.lang';
let current = 'en';

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars?.[k] ?? `{${k}}`));

/** Translate in a specific language. */
export const tIn = (lang, key, vars) => fill(TABLES[lang]?.[key] ?? en[key] ?? key, vars);

/** Translate in the current UI language. */
export const t = (key, vars) => tIn(current, key, vars);

export const getLang = () => current;

/**
 * Languages to show in the picker: the city pack's own languages first, then the rest
 * (a Kannada-speaking worker in Pune should still get Kannada).
 */
export function pickerLangs(pack = cityPack()) {
  const own = pack.languages?.ui ?? ['en'];
  return [...own, ...Object.keys(LANGS).filter((l) => !own.includes(l))];
}

export function setLang(lang) {
  if (!TABLES[lang]) return;
  current = lang;
  try { localStorage.setItem(STORE_KEY, lang); } catch { /* private mode */ }
  document.documentElement.lang = LANGS[lang].bcp47;
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

/** Saved choice → browser language (if offered) → city pack default. Call once at startup. */
export function initLang(pack = cityPack()) {
  let saved = null;
  try { saved = localStorage.getItem(STORE_KEY); } catch { /* ignore */ }
  const browser = (navigator.language || 'en').slice(0, 2);
  const choice = TABLES[saved] ? saved : (pack.languages?.ui ?? []).includes(browser) ? browser : (pack.languages?.default ?? 'en');
  setLang(choice);
  return choice;
}

/** Re-render helper: calls fn now and on every language change. Returns an unsubscribe fn. */
export function onLang(fn) {
  fn(current);
  const h = (e) => fn(e.detail.lang);
  window.addEventListener('langchange', h);
  return () => window.removeEventListener('langchange', h);
}

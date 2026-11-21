// 👤 My reports (profile): your current + previous reports, and how many people your reports helped.
// "Helped" = distinct other people who confirmed one of your reports ("Still there"). Honest, countable.
import { t, onLang } from '../i18n/index.js';
import { CONFIG } from '../../config.js';
import { currentUser, onAuth } from '../backend/auth.js';
import { fetchMyReports, deleteMyReport } from '../backend/reports.js';
import { deriveStatus } from '../engine/lifecycle.js';
import { nearestPlace } from '../engine/geo.js';
import { gazetteer, now, refreshLive } from '../store.js';
import { openSignIn } from './signin.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICON = { flood: '🌊', clog: '🚧', cooling: '💧' };
let el, btn, map, state = { owner: null, loading: false, data: null, error: null };
let requestNumber = 0;

const realUser = () => { const u = currentUser(); return u && !u.anonymous ? u : null; };

function ageText(iso) {
  const m = Math.max(0, Math.round((now() - Date.parse(iso)) / 60000));
  if (m < 60) return t('pin.ageMin', { n: m });
  if (m < 48 * 60) return t('profile.hoursAgo', { n: Math.round(m / 60) });
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function render() {
  if (!el || el.hidden) return;
  const u = realUser();
  let body;
  if (!u) {
    body = `<p>${esc(t('profile.signedOut'))}</p><button class="btn btn-primary btn-xl" data-act="signin">${esc(t('auth.signIn'))}</button>`;
  } else if (state.loading && !state.data) {
    body = `<p class="muted">…</p>`;
  } else if (state.error) {
    body = `<p>${esc(t('auth.error', { msg: state.error }))}</p>`;
  } else {
    const d = state.data ?? { pins: [], helped: 0, confirmations: 0, clears: 0 };
    const tNow = now();
    const withStatus = d.pins.map((p) => ({ ...p, status: deriveStatus(p, d.pins, tNow, CONFIG) }));
    const active = withStatus.filter((p) => p.status === 'unverified' || p.status === 'confirmed');
    const past = withStatus.filter((p) => !active.includes(p));
    const row = (p, canRemove) => {
      const near = p.name ?? nearestPlace(p, gazetteer, CONFIG.LANDMARK_RADIUS_M)?.name;
      const what = p.type === 'cooling' ? (p.amenities ?? []).map((a) => t('amenity.' + a)).join(' · ') : p.type === 'clog' ? t('action.reportClog') : t('depth.' + p.depth);
      return `<li class="mr-item">
        <span class="mr-ico" aria-hidden="true">${ICON[p.type] ?? '📍'}</span>
        <span class="mr-main"><b>${esc(what)}</b>${near ? ` · ${esc(near)}` : ''}<br>
          <small>${esc(ageText(p.createdAt))} · ${esc(t('status.' + p.status))}${p.confirmations ? ` · ✅ ${p.confirmations}` : ''}</small></span>
        <span class="mr-acts"><button class="btn btn-ghost" data-act="show" data-id="${esc(p.id)}" aria-label="${esc(t('profile.show'))}">🗺</button>
        ${canRemove ? `<button class="btn btn-ghost" data-act="remove" data-id="${esc(p.id)}" aria-label="${esc(t('profile.remove'))}">🗑</button>` : ''}</span></li>`;
    };
    body = `<div class="mr-stats">
        <div><b>${esc(d.helped)}</b><small>${esc(t('profile.helped'))}</small></div>
        <div><b>${d.pins.length}</b><small>${esc(t('profile.reports'))}</small></div>
        <div><b>${active.length}</b><small>${esc(t('profile.activeNow'))}</small></div>
      </div>
      ${d.helped ? `<p class="mr-thanks">🙏 ${esc(t('profile.thanks', { n: d.helped }))}</p>` : ''}
      <h3>${esc(t('profile.current'))}</h3>
      ${active.length ? `<ul class="mr-list">${active.map((p) => row(p, true)).join('')}</ul>` : `<p class="muted">${esc(t('profile.noneActive'))}</p>`}
      <h3>${esc(t('profile.previous'))}</h3>
      ${past.length ? `<ul class="mr-list">${past.map((p) => row(p, false)).join('')}</ul>` : `<p class="muted">${esc(t('profile.nonePast'))}</p>`}`;
  }
  el.innerHTML = `<div class="sheet mr-sheet" role="dialog" aria-modal="true" aria-label="${esc(t('profile.title'))}">
    <div class="rp-head"><h2>👤 ${esc(t('profile.title'))}</h2><button class="btn btn-ghost" data-act="close" aria-label="✕">✕</button></div>
    ${u ? `<p class="muted mr-who">${esc(u.name ?? u.email ?? '')}</p>` : ''}${body}</div>`;
}

async function load() {
  const owner = realUser()?.id ?? null;
  const request = ++requestNumber;
  if (state.owner !== owner) state = { owner, loading: false, data: null, error: null };
  if (!owner) return render();
  state = { ...state, loading: true, error: null };
  render();
  try {
    const data = await fetchMyReports(owner);
    if (request !== requestNumber || realUser()?.id !== owner) return;
    state = { owner, loading: false, data, error: null };
  } catch (e) {
    if (request !== requestNumber || realUser()?.id !== owner) return;
    state = { ...state, loading: false, error: e.message };
  }
  render();
}

export function openMyReports() { el.hidden = false; load(); }

export function initMyReports(m) {
  map = m;
  el = document.createElement('div');
  el.className = 'sheet-backdrop'; el.hidden = true;
  document.body.append(el);
  btn = document.createElement('button');
  btn.id = 'profile-btn'; btn.type = 'button'; btn.textContent = '👤';
  document.getElementById('more-btn')?.before(btn);
  btn.addEventListener('click', openMyReports);
  onLang(() => { btn.setAttribute('aria-label', t('profile.title')); btn.title = t('profile.title'); render(); });
  onAuth(() => {
    const owner = realUser()?.id ?? null;
    if (state.owner !== owner) {
      requestNumber++;
      state = { owner, loading: false, data: null, error: null };
    }
    btn.classList.toggle('on', !!owner);
    if (!el.hidden) load();
  });
  el.addEventListener('click', async (e) => {
    if (e.target === el) { el.hidden = true; return; }
    const b = e.target.closest('button'); if (!b) return;
    const { act, id } = b.dataset;
    if (act === 'close') { el.hidden = true; return; }
    if (act === 'signin') { el.hidden = true; return openSignIn(() => openMyReports()); }
    const p = state.data?.pins.find((x) => x.id === id);
    if (act === 'show' && p) { el.hidden = true; map.easeTo({ center: [p.lng, p.lat], zoom: 16 }); return; }
    if (act === 'remove' && p) {
      try { await deleteMyReport(id); refreshLive(); load(); document.dispatchEvent(new CustomEvent('sajag:toast', { detail: t('profile.removed') })); }
      catch (err) { document.dispatchEvent(new CustomEvent('sajag:toast', { detail: t('auth.error', { msg: err.message }) })); }
    }
  });
}

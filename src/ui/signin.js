// Sign-in sheet (PRD §22.4): shown only when someone tries to report or vote. Google + email code.
import { t } from '../i18n/index.js';
import { signInWithGoogle, sendEmailCode, verifyEmailCode, onAuth, currentUser, signOut } from '../backend/auth.js';
import { backendReady } from '../backend/client.js';

let sheet, afterLogin = null;

function ensure() {
  if (sheet) return sheet;
  sheet = document.createElement('div');
  sheet.className = 'sheet-backdrop';
  sheet.hidden = true;
  sheet.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="si-title">
      <h2 id="si-title"></h2>
      <p class="muted" data-k="auth.why"></p>
      <button class="btn btn-google" data-act="google"></button>
      <div class="or" data-k="auth.or"></div>
      <label class="field"><span data-k="auth.email"></span><input type="email" inputmode="email" autocomplete="email" data-f="email"></label>
      <button class="btn" data-act="send"></button>
      <div data-step="code" hidden>
        <label class="field"><span data-k="auth.enterCode"></span><input inputmode="numeric" autocomplete="one-time-code" maxlength="8" data-f="code"></label>
        <button class="btn btn-primary" data-act="verify"></button>
      </div>
      <p class="msg" role="status"></p>
      <button class="btn btn-ghost" data-act="close"></button>
    </div>`;
  document.body.append(sheet);
  const $ = (s) => sheet.querySelector(s);
  const msg = (s, bad) => { const m = $('.msg'); m.textContent = s; m.classList.toggle('bad', !!bad); };
  sheet.addEventListener('click', async (e) => {
    const act = e.target.dataset.act;
    if (e.target === sheet || act === 'close') return close();
    try {
      if (act === 'google') { saveIntent(); await signInWithGoogle(); }
      if (act === 'send') {
        const email = $('[data-f=email]').value.trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) return msg(t('auth.badEmail'), true);
        await sendEmailCode(email);
        $('[data-step=code]').hidden = false; msg(t('auth.codeSent', { email }));
      }
      if (act === 'verify') {
        await verifyEmailCode($('[data-f=email]').value.trim(), $('[data-f=code]').value);
      }
    } catch (err) { msg(t('auth.error', { msg: err.message }), true); }
  });
  return sheet;
}

function render() {
  const s = ensure();
  s.querySelector('#si-title').textContent = t('auth.signInToReport');
  s.querySelectorAll('[data-k]').forEach((el) => { el.textContent = t(el.dataset.k); });
  s.querySelector('[data-act=google]').textContent = t('auth.google');
  s.querySelector('[data-act=send]').textContent = t('auth.sendCode');
  s.querySelector('[data-act=verify]').textContent = t('auth.verify');
  s.querySelector('[data-act=close]').textContent = t('report.cancel');
}

// Google sign-in leaves the page: remember what the user was doing so it resumes after the redirect.
const INTENT = 'sajag.afterLogin';
function saveIntent() { try { sessionStorage.setItem(INTENT, '1'); } catch { /* ignore */ } }
export function takeIntent() { try { const v = sessionStorage.getItem(INTENT); sessionStorage.removeItem(INTENT); return !!v; } catch { return false; } }

/** Open the sheet; `then` runs once the user is signed in. */
export function openSignIn(then) {
  if (!backendReady()) { alertOffline(); return; }
  afterLogin = then ?? null;
  render();
  ensure().hidden = false;
  ensure().querySelector('.msg').textContent = '';
}
function close() { if (sheet) sheet.hidden = true; afterLogin = null; }
function alertOffline() { const b = document.getElementById('toast'); if (b) { b.textContent = t('report.offline'); b.hidden = false; setTimeout(() => { b.hidden = true; }, 4000); } }

onAuth((u) => {
  if (u && sheet && !sheet.hidden) { const fn = afterLogin; close(); fn?.(u); }
});

/** Small account chip for the top bar. */
export function mountAccountChip(el) {
  const draw = (u) => {
    if (u?.anonymous) u = null; // silent heat-side session ≠ signed in
    el.hidden = !backendReady();
    el.textContent = u ? (u.name?.split(' ')[0] ?? u.email ?? '✓') : t('auth.signIn');
    el.title = u ? `${t('auth.signedInAs', { who: u.email ?? u.name })} — ${t('auth.signOut')}` : '';
  };
  onAuth(draw);
  window.addEventListener('langchange', () => draw(currentUser()));
  el.addEventListener('click', () => (currentUser() && !currentUser().anonymous ? signOut() : openSignIn()));
}

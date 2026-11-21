// Auth (PRD §22.4): login is required to REPORT / VOTE only — never to view.
// Providers: Google OAuth + email one-time code. Phone OTP = roadmap.
import { supabase } from './client.js';

let session = null;
const listeners = new Set();

if (supabase) {
  supabase.auth.getSession().then(({ data }) => { session = data.session; emit(); });
  supabase.auth.onAuthStateChange((_event, s) => { session = s; emit(); });
}
function emit() { listeners.forEach((fn) => fn(currentUser())); }

/** @returns {{id:string, email:string|null, name:string|null}|null} */
export function currentUser() {
  const u = session?.user;
  return u ? { id: u.id, email: u.email ?? null, name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? null, anonymous: !!u.is_anonymous } : null;
}

/** Subscribe to sign-in/out. Calls fn immediately. Returns unsubscribe. */
export function onAuth(fn) { listeners.add(fn); fn(currentUser()); return () => listeners.delete(fn); }

export async function signInWithGoogle() {
  if (!supabase) throw new Error('backend_unavailable');
  // Comes back to the same page; any report draft should be saved to sessionStorage before calling this.
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href } });
  if (error) throw error;
}

/** Step 1 of email login: sends a 6-digit code (email template must include {{ .Token }}). */
export async function sendEmailCode(email) {
  if (!supabase) throw new Error('backend_unavailable');
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}

/** Step 2 of email login. */
export async function verifyEmailCode(email, token) {
  if (!supabase) throw new Error('backend_unavailable');
  const { error } = await supabase.auth.verifyOtp({ email, token: token.trim(), type: 'email' });
  if (error) throw error;
}

/**
 * Heat side (cooling points): no login screen. Creates a silent anonymous Supabase session
 * (needs Auth → "Allow anonymous sign-ins" ON in the Supabase dashboard). The session gets the
 * normal `authenticated` role, so RLS + the 5-per-30-min DB rate limit still apply per device.
 * Returns the user, or null if anonymous sign-in is disabled / offline.
 */
export async function ensureAnonUser() {
  if (currentUser()) return currentUser();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) { console.warn('anonymous sign-in failed:', error.message); return null; }
  session = data.session; emit();
  return currentUser();
}

export async function signOut() { await supabase?.auth.signOut(); }

/**
 * Gate for any write action. Resolves with the user if signed in; otherwise calls `promptSignIn()`
 * (the UI's sign-in sheet) and resolves null so the caller can keep the draft and retry after login.
 */
export async function requireUser(promptSignIn) {
  const u = currentUser();
  if (u) return u;
  promptSignIn?.();
  return null;
}

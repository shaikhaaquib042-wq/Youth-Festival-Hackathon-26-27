// Supabase client — ORCHESTRATOR-OWNED. Keys come from .env.local (never commit them):
//   VITE_SUPABASE_URL=https://<ref>.supabase.co
//   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   (publishable/anon key only — NEVER the secret/service_role key)
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** null when keys are missing → the app still runs read-only with local data (no login, no shared reports). */
export const supabase = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } })
  : null;

export const backendReady = () => !!supabase;
if (!supabase) console.warn('[sajag] Supabase keys missing — running without login/shared reports. See .env.example');

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy-project.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummyKeyForDevMode";

// Client-side Supabase instance (anon key — RLS enforced)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Edge function base URL
export const EDGE_FN_URL = `${supabaseUrl}/functions/v1`;

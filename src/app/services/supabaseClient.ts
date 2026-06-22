// ============================================================
// Fit Tracker PRO — Supabase Client
// Single shared client instance used by every data service.
// Reads credentials from Vite env vars (see .env.example).
// ============================================================
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly in dev rather than silently breaking every data call
  console.error(
    'Missing Supabase environment variables. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file. ' +
    'See .env.example for instructions.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/** True once env vars are present — used to short-circuit calls during misconfiguration */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

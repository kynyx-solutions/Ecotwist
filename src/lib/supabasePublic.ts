import { createClient } from '@supabase/supabase-js';

/* ============================
   Read-only Supabase client for the public website (blog).
   Uses the anon key: row-level security only lets it read published posts.
============================ */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// False until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set (.env.local / Vercel)
export const isBlogConfigured = !!url && !!anonKey;

export const supabasePublic = createClient(url ?? 'http://localhost', anonKey ?? 'missing', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'ecotwist-public' },
});

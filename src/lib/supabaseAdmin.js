import { createClient } from '@supabase/supabase-js';

const env = import.meta.env;

const supabaseUrl = env.VITE_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey =
  env.VITE_SUPABASE_SERVICE_KEY || env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY;

export const isServiceKeyConfigured = Boolean(supabaseUrl && serviceKey);

// School project only: VITE_ vars are inlined into the public client bundle, so
// this key is readable by anyone and bypasses RLS. Move user creation to an
// Edge Function before any real deployment.
export const supabaseAdmin = isServiceKeyConfigured
  ? createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

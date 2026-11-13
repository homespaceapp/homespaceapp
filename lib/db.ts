import { createClient } from '@supabase/supabase-js';
import { getSupabaseServer } from './supabase-server';
import { getSupabasePublicConfig } from './supabase-config';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabasePublicConfig();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ANON client — DEPRECATED dla danych usera. Zostawiam dla kompatybilności.
// Po włączeniu RLS nie widzi żadnych wierszy (ale nadal da się używać do auth flows).
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ADMIN client — omija RLS. Używać TYLKO w webhookach/cronach bez usera.
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : supabase; // fallback jeśli service key nie ustawiony

// AUTHENTICATED client — automatycznie filtruje po RLS (user's household).
// Używać we wszystkich server actions i page.tsx gdzie user jest zalogowany.
export async function getDb() {
  return await getSupabaseServer();
}

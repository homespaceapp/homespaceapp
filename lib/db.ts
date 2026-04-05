import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://qlqnrsxpmoeoukfgovmy.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_H4esPhmhBIIUJSb78_JLOw_kE1VOmty';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Stary interfejs dla kompatybilności (tymczasowo)
export const getDb = () => {
  throw new Error('SQLite nie jest obsługiwany online. Użyj exportu "supabase" z lib/db.ts');
};

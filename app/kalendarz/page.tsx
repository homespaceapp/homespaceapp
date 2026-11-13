import KalendarzLoader from './KalendarzLoader';

export const dynamic = 'force-static';

export default function KalendarzPage() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Brak publicznej konfiguracji Supabase dla kalendarza.');
  }

  return <KalendarzLoader supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} />;
}

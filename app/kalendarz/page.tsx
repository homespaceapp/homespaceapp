import KalendarzLoader from './KalendarzLoader';
import { getSupabasePublicConfig } from '@/lib/supabase-config';

export const dynamic = 'force-static';

export default function KalendarzPage() {
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabasePublicConfig();

  return <KalendarzLoader supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} />;
}

import { Suspense } from 'react';
import LoginForm from './LoginForm';
import { getSupabasePublicConfig } from '@/lib/supabase-config';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabasePublicConfig();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-pink-50 to-purple-50">
      <Suspense fallback={<div>Ładowanie...</div>}>
        <LoginForm supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} />
      </Suspense>
    </div>
  );
}

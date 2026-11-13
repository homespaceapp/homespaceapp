import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Brak publicznej konfiguracji Supabase dla logowania.');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-pink-50 to-purple-50">
      <Suspense fallback={<div>Ładowanie...</div>}>
        <LoginForm supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} />
      </Suspense>
    </div>
  );
}

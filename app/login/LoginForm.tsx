'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function LoginForm({
  supabaseUrl,
  supabaseAnonKey,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const searchParams = useSearchParams();
  const invite = searchParams.get('invite');
  const redirect = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
    const callbackParams = new URLSearchParams();
    if (invite) callbackParams.set('invite', invite);
    if (redirect) callbackParams.set('redirect', redirect);
    const callbackQs = callbackParams.toString();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback${callbackQs ? '?' + callbackQs : ''}`,
      },
    });

    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
      <h1 className="text-3xl font-bold text-center mb-2">🏠 Loszki</h1>
      <p className="text-center text-gray-600 mb-8">Zaloguj się linkiem z maila</p>

      {sent ? (
        <div className="text-center">
          <div className="text-5xl mb-4">📬</div>
          <p className="text-lg font-semibold mb-2">Wysłane!</p>
          <p className="text-gray-600">Sprawdź skrzynkę <strong>{email}</strong> i kliknij link.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="twoj@email.pl"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 hover:bg-pink-700"
          >
            {loading ? 'Wysyłam...' : 'Wyślij link logowania'}
          </button>
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        </form>
      )}
    </div>
  );
}

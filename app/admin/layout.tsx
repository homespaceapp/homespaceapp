import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import { getCurrentUser } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=/admin');
  if (!(await isAdmin())) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white p-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold mb-2">Brak dostępu</h1>
          <p className="text-zinc-400 mb-4">
            Zalogowany jako <b>{user.email}</b> — to konto nie jest adminem.
          </p>
          <p className="text-xs text-zinc-500 mb-6">
            Admini są zdefiniowani w zmiennej <code>ADMIN_EMAILS</code>.
          </p>
          <form action="/auth/signout" method="post">
            <button className="bg-white text-zinc-900 px-4 py-2 rounded font-semibold">Wyloguj się</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🛡️</div>
            <div>
              <h1 className="font-bold text-lg">HomeSpace · Admin Panel</h1>
              <p className="text-xs text-zinc-400">Zalogowany jako {user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-zinc-400 hover:text-white">← do aplikacji</Link>
            <form action="/auth/signout" method="post">
              <button className="text-sm bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded">Wyloguj</button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}

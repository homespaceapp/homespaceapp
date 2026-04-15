import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/db';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/');

  const [{ data: households }, { data: members }, { data: invites }, usersRes] = await Promise.all([
    supabaseAdmin.from('households').select('id, name, created_at').order('created_at', { ascending: false }),
    supabaseAdmin.from('household_members').select('household_id, user_id, role, joined_at'),
    supabaseAdmin.from('invite_tokens')
      .select('id, household_id, token, used_at, used_by, expires_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin.auth.admin.listUsers({ perPage: 200 }),
  ]);

  const users = usersRes.data?.users ?? [];
  const userMap = new Map(users.map(u => [u.id, u.email ?? '']));

  // Stats: row counts per household per table
  const tables = ['pantry', 'weekly_plan', 'expenses', 'bills', 'shopping_lists', 'calendar_events', 'notes', 'tasks', 'messages', 'contacts'];
  const statsPerHousehold: Record<string, Record<string, number>> = {};
  for (const h of households ?? []) {
    statsPerHousehold[h.id] = {};
    for (const t of tables) {
      const { count } = await supabaseAdmin.from(t).select('*', { count: 'exact', head: true }).eq('household_id', h.id);
      statsPerHousehold[h.id][t] = count ?? 0;
    }
  }

  const householdsWithMembers = (households ?? []).map(h => ({
    ...h,
    members: (members ?? [])
      .filter(m => m.household_id === h.id)
      .map(m => ({ user_id: m.user_id, email: userMap.get(m.user_id) ?? '(nieznany)', role: m.role, joined_at: m.joined_at })),
    stats: statsPerHousehold[h.id] ?? {},
  }));

  const invitesEnriched = (invites ?? []).map(i => ({
    ...i,
    household_name: households?.find(h => h.id === i.household_id)?.name ?? '(usunięty)',
    used_by_email: i.used_by ? userMap.get(i.used_by) ?? '' : '',
  }));

  const usersEnriched = users.map(u => {
    const userHouseholds = (members ?? [])
      .filter(m => m.user_id === u.id)
      .map(m => households?.find(h => h.id === m.household_id)?.name ?? '?');
    return {
      id: u.id,
      email: u.email ?? '(brak)',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      banned_until: (u as any).banned_until,
      households: userHouseholds,
    };
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">🛡️ Admin Dashboard</h1>
        <div className="text-sm text-gray-500">
          👥 {users.length} userów · 🏠 {households?.length ?? 0} domów
        </div>
      </div>
      <AdminClient
        households={householdsWithMembers}
        invites={invitesEnriched}
        users={usersEnriched}
      />
    </div>
  );
}

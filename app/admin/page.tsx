import { supabaseAdmin } from '@/lib/db';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
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
    <>
      <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-zinc-400 text-sm">Zarządzaj użytkownikami, domami i zaproszeniami</p>
        </div>
        <div className="flex gap-6 text-sm">
          <div><span className="text-zinc-500">Userów:</span> <b className="text-white">{users.length}</b></div>
          <div><span className="text-zinc-500">Domów:</span> <b className="text-white">{households?.length ?? 0}</b></div>
          <div><span className="text-zinc-500">Invites:</span> <b className="text-white">{invites?.length ?? 0}</b></div>
        </div>
      </div>
      <AdminClient
        households={householdsWithMembers}
        invites={invitesEnriched}
        users={usersEnriched}
      />
    </>
  );
}

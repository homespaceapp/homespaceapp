'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Member = { user_id: string; email: string; role: string; joined_at: string };
type Household = { id: string; name: string; created_at: string; members: Member[]; stats: Record<string, number> };
type Invite = { id: string; household_id: string; token: string; household_name: string; used_at: string | null; used_by_email: string; expires_at: string; created_at: string };
type User = { id: string; email: string; created_at: string; last_sign_in_at?: string; banned_until?: string; households: string[] };

type Tab = 'users' | 'households' | 'invites' | 'stats';

export default function AdminClient({ households, invites, users }: { households: Household[]; invites: Invite[]; users: User[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('users');

  async function api(url: string, init?: RequestInit) {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(url, init);
      const data = await res.json();
      if (data.error) setMsg('❌ ' + data.error);
      else setMsg('✓ OK');
      router.refresh();
      return data;
    } finally { setBusy(false); }
  }

  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserHousehold, setNewUserHousehold] = useState('');

  const fmt = (s?: string) => s ? new Date(s).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const TabBtn = ({ id, label, count }: { id: Tab; label: string; count?: number }) => (
    <button onClick={() => setTab(id)}
      className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${tab === id ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
      {label}{count !== undefined ? ` (${count})` : ''}
    </button>
  );

  return (
    <>
      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded mb-4 text-sm">{msg}</div>}

      <div className="flex flex-wrap gap-2 mb-6">
        <TabBtn id="users" label="👥 Użytkownicy" count={users.length} />
        <TabBtn id="households" label="🏠 Domy" count={households.length} />
        <TabBtn id="invites" label="✉️ Zaproszenia" count={invites.length} />
        <TabBtn id="stats" label="📊 Statystyki" />
      </div>

      {tab === 'users' && (
        <>
          <section className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-bold mb-3">Zaproś nowego użytkownika</h2>
            <p className="text-xs text-gray-500 mb-3">Omija zwykły rate-limit Supabase (używa Admin API). User dostaje mail z linkiem.</p>
            <div className="flex flex-wrap gap-2">
              <input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="email@example.com" type="email"
                className="flex-1 min-w-[200px] px-3 py-2 border rounded" />
              <select value={newUserHousehold} onChange={e => setNewUserHousehold(e.target.value)}
                className="px-3 py-2 border rounded">
                <option value="">— nowy household —</option>
                {households.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <button
                onClick={async () => {
                  await api('/api/admin/user', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ email: newUserEmail, household_id: newUserHousehold || undefined }),
                  });
                  setNewUserEmail('');
                }}
                disabled={busy || !newUserEmail}
                className="bg-emerald-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-50">
                Zaproś
              </button>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Email</th>
                  <th className="p-3">Domy</th>
                  <th className="p-3">Utworzony</th>
                  <th className="p-3">Ostatni login</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const banned = u.banned_until && new Date(u.banned_until) > new Date();
                  return (
                    <tr key={u.id} className="border-t">
                      <td className="p-3 font-medium">{u.email}</td>
                      <td className="p-3 text-gray-600">{u.households.join(', ') || '—'}</td>
                      <td className="p-3 text-gray-600">{fmt(u.created_at)}</td>
                      <td className="p-3 text-gray-600">{fmt(u.last_sign_in_at)}</td>
                      <td className="p-3">
                        {banned ? <span className="text-red-600 font-semibold">🚫 zablokowany</span> : <span className="text-green-600">● aktywny</span>}
                      </td>
                      <td className="p-3 flex flex-wrap gap-1">
                        <button
                          onClick={() => api('/api/admin/user', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: u.id, banned: !banned }) })}
                          disabled={busy}
                          className="text-xs bg-yellow-500 text-white px-2 py-1 rounded disabled:opacity-50">
                          {banned ? 'Odblokuj' : 'Zablokuj'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Usunąć ${u.email} z całym kontem?`))
                              api(`/api/admin/user?id=${u.id}`, { method: 'DELETE' });
                          }}
                          disabled={busy}
                          className="text-xs bg-red-600 text-white px-2 py-1 rounded disabled:opacity-50">
                          Usuń
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-gray-400">Brak użytkowników</td></tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}

      {tab === 'households' && (
        <>
          <section className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-bold mb-3">Stwórz nowy dom</h2>
            <div className="flex gap-2">
              <input value={newHouseholdName} onChange={e => setNewHouseholdName(e.target.value)} placeholder="Nazwa"
                className="flex-1 px-3 py-2 border rounded" />
              <button
                onClick={async () => {
                  await api('/api/admin/household', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: newHouseholdName }) });
                  setNewHouseholdName('');
                }}
                disabled={busy || !newHouseholdName}
                className="bg-emerald-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-50">
                Stwórz
              </button>
            </div>
          </section>

          <div className="space-y-4">
            {households.map(h => (
              <div key={h.id} className="bg-white rounded-xl shadow p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{h.name}</h3>
                    <p className="text-xs text-gray-400">{h.id} · {fmt(h.created_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const r = await api('/api/admin/invite', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ household_id: h.id }) });
                        if (r?.url) { await navigator.clipboard.writeText(r.url); setMsg('✓ Link skopiowany: ' + r.url); }
                      }}
                      disabled={busy}
                      className="text-sm bg-pink-600 text-white px-3 py-1 rounded disabled:opacity-50">
                      + Invite link
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Usunąć dom "${h.name}" i WSZYSTKIE jego dane?`))
                          api(`/api/admin/household?id=${h.id}`, { method: 'DELETE' });
                      }}
                      disabled={busy}
                      className="text-sm bg-red-600 text-white px-3 py-1 rounded disabled:opacity-50">
                      Usuń dom
                    </button>
                  </div>
                </div>
                <div className="text-sm mb-2 text-gray-600">Członkowie:</div>
                <ul className="space-y-1">
                  {h.members.map((m, i) => (
                    <li key={i} className="flex justify-between items-center bg-gray-50 px-3 py-1.5 rounded">
                      <span>👤 {m.email} <span className="text-gray-400 text-xs">({m.role})</span></span>
                      <button
                        onClick={() => { if (confirm(`Usunąć ${m.email}?`)) api(`/api/admin/member?household_id=${h.id}&email=${encodeURIComponent(m.email)}`, { method: 'DELETE' }); }}
                        disabled={busy}
                        className="text-xs text-red-600 hover:underline">usuń</button>
                    </li>
                  ))}
                  {h.members.length === 0 && <li className="text-gray-400 italic text-sm">brak członków</li>}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'invites' && (
        <section className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left"><tr>
              <th className="p-3">Dom</th>
              <th className="p-3">Token</th>
              <th className="p-3">Status</th>
              <th className="p-3">Wygasa</th>
            </tr></thead>
            <tbody>
              {invites.map(i => {
                const expired = new Date(i.expires_at) < new Date();
                const status = i.used_at ? `✓ użyte przez ${i.used_by_email}` : expired ? '⏱ wygasło' : '● aktywne';
                const url = typeof window !== 'undefined' ? `${window.location.origin}/invite/${i.token}` : '';
                return (
                  <tr key={i.id} className="border-t">
                    <td className="p-3 font-medium">{i.household_name}</td>
                    <td className="p-3">
                      {!i.used_at && !expired ? (
                        <button onClick={() => { navigator.clipboard.writeText(url); setMsg('✓ Skopiowano'); }}
                          className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-mono">kopiuj link</button>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="p-3 text-gray-600">{status}</td>
                    <td className="p-3 text-gray-600">{fmt(i.expires_at)}</td>
                  </tr>
                );
              })}
              {invites.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-gray-400">Brak zaproszeń</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'stats' && (
        <div className="space-y-4">
          {households.map(h => {
            const total = Object.values(h.stats).reduce((a, b) => a + b, 0);
            return (
              <div key={h.id} className="bg-white rounded-xl shadow p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">{h.name}</h3>
                  <span className="text-sm text-gray-500">Łącznie: <b>{total}</b> rekordów</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                  {Object.entries(h.stats).map(([k, v]) => (
                    <div key={k} className="bg-gray-50 rounded p-2">
                      <div className="text-xs text-gray-500">{k}</div>
                      <div className="font-bold text-lg">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {households.length === 0 && <p className="text-gray-400 italic">Brak domów</p>}
        </div>
      )}
    </>
  );
}

import { getDb } from '@/lib/db';
import KalendarzClient from './KalendarzClient';

type CycleData = { len: number; plen: number; starts: string[]; ends: string[] };

export default async function KalendarzPage() {
  const supabase = await getDb();
  const [{ data: events }, { data: reminders }] = await Promise.all([
    supabase.from('calendar_events').select('*').order('date', { ascending: true }),
    supabase.from('calendar_reminders').select('*'),
  ]);

  const all = events ?? [];
  // Ukryty wiersz konfiguracji cyklu (title='__cykl__') - nie pokazujemy go jako wydarzenia.
  const cycleRow = all.find((e: { title: string }) => e.title === '__cykl__');
  const realEvents = all.filter((e: { title: string }) => e.title !== '__cykl__');
  let cycle: CycleData | null = null;
  if (cycleRow?.notes) {
    try {
      const p = JSON.parse(cycleRow.notes);
      cycle = {
        len: Number(p.len) || 28,
        plen: Number(p.plen) || 5,
        starts: Array.isArray(p.starts) ? p.starts : [],
        ends: Array.isArray(p.ends) ? p.ends : [],
      };
    } catch { cycle = null; }
  }

  return <KalendarzClient events={realEvents} reminders={reminders ?? []} cycle={cycle} />;
}

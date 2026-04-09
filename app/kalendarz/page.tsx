import { supabase } from '@/lib/db';
import KalendarzClient from './KalendarzClient';

export default async function KalendarzPage() {
  const [{ data: events }, { data: reminders }] = await Promise.all([
    supabase.from('calendar_events').select('*').order('date', { ascending: true }),
    supabase.from('calendar_reminders').select('*'),
  ]);

  return <KalendarzClient events={events ?? []} reminders={reminders ?? []} />;
}

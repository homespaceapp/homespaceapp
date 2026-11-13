'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useCallback, useEffect, useMemo, useState } from 'react';
import KalendarzClient from './KalendarzClient';
import CalendarLoading from './loading';

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  owner: 'adrian' | 'kasia' | 'oboje';
  notes: string | null;
  is_done: boolean | null;
};

type CalendarReminder = {
  id: string;
  event_id: string;
  offset_minutes: number;
};

type CycleData = { len: number; plen: number; starts: string[]; ends: string[] };

type CalendarData = {
  events: CalendarEvent[];
  reminders: CalendarReminder[];
  cycle: CycleData | null;
};

function parseCycle(notes: string | null): CycleData | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    return {
      len: Number(parsed.len) || 28,
      plen: Number(parsed.plen) || 5,
      starts: Array.isArray(parsed.starts) ? parsed.starts : [],
      ends: Array.isArray(parsed.ends) ? parsed.ends : [],
    };
  } catch {
    return null;
  }
}

export default function KalendarzLoader({
  supabaseUrl,
  supabaseAnonKey,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const supabase = useMemo(
    () => createBrowserClient(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey],
  );
  const [data, setData] = useState<CalendarData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    const [eventsResult, remindersResult] = await Promise.all([
      supabase
        .from('calendar_events')
        .select('id,title,date,time,owner,notes,is_done')
        .order('date', { ascending: true }),
      supabase
        .from('calendar_reminders')
        .select('id,event_id,offset_minutes'),
    ]);

    if (eventsResult.error) throw eventsResult.error;
    if (remindersResult.error) throw remindersResult.error;

    const allEvents = (eventsResult.data ?? []) as CalendarEvent[];
    const cycleRow = allEvents.find((event) => event.title === '__cykl__');
    setData({
      events: allEvents.filter((event) => event.title !== '__cykl__'),
      reminders: (remindersResult.data ?? []) as CalendarReminder[],
      cycle: parseCycle(cycleRow?.notes ?? null),
    });
  }, [supabase]);

  useEffect(() => {
    loadData().catch(() => setError('Nie udało się pobrać kalendarza.'));
  }, [loadData]);

  if (error) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="font-semibold text-red-800">{error}</p>
          <button
            type="button"
            onClick={() => loadData().catch(() => setError('Nie udało się pobrać kalendarza.'))}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <CalendarLoading />;

  return (
    <KalendarzClient
      events={data.events}
      reminders={data.reminders}
      cycle={data.cycle}
      onDataChanged={loadData}
    />
  );
}

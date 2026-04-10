'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toggleEventDone } from './kalendarz/actions';

type CalendarEvent = {
  id: string;
  title: string;
  time: string | null;
  owner: 'adrian' | 'kasia' | 'oboje';
  notes: string | null;
  is_done: boolean | null;
};

const OWNER_STYLES: Record<string, string> = {
  adrian: 'bg-blue-100 text-blue-700',
  kasia: 'bg-pink-100 text-pink-700',
  oboje: 'bg-yellow-100 text-yellow-700',
};
const OWNER_LABELS: Record<string, string> = { adrian: 'Adrian', kasia: 'Kasia', oboje: 'Oboje' };

export default function CalendarWidget({ initialEvents }: { initialEvents: CalendarEvent[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [, startTransition] = useTransition();

  function handleToggle(ev: CalendarEvent, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEvents(prev => prev.map(item =>
      item.id === ev.id ? { ...item, is_done: !item.is_done } : item
    ));
    startTransition(async () => {
      await toggleEventDone(ev.id, !!ev.is_done);
    });
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">📅 Dziś w kalendarzu</p>
        <Link href="/kalendarz" className="text-xs text-emerald-500 hover:underline">→ Kalendarz</Link>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-zinc-400">Nic zaplanowanego na dziś</p>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map(ev => (
            <div key={ev.id} className={`flex items-start gap-2.5 ${ev.is_done ? 'opacity-50' : ''}`}>
              <button
                onClick={e => handleToggle(ev, e)}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  ev.is_done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-zinc-300 hover:border-emerald-400'
                }`}
                title={ev.is_done ? 'Cofnij' : 'Oznacz jako zrobione'}
              >
                {ev.is_done && <span className="text-[10px]">✓</span>}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${ev.is_done ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                  {ev.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${OWNER_STYLES[ev.owner] || 'bg-zinc-100 text-zinc-600'}`}>
                    {OWNER_LABELS[ev.owner] || ev.owner}
                  </span>
                  {ev.time && <span className="text-xs text-zinc-400">{ev.time}</span>}
                  {ev.notes && <span className="text-xs text-zinc-400 truncate max-w-[120px]">{ev.notes}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

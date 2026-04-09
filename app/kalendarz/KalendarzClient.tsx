'use client';

import { useState, useEffect } from 'react';
import { addEvent, deleteEvent } from './actions';

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  owner: 'adrian' | 'kasia' | 'oboje';
  notes: string | null;
};

const OWNER_STYLES = {
  adrian: 'bg-blue-100 text-blue-700 border-blue-200',
  kasia: 'bg-pink-100 text-pink-700 border-pink-200',
  oboje: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const OWNER_LABELS = { adrian: 'Adrian', kasia: 'Kasia', oboje: 'Oboje' };

// Predefiniowane opcje przypomnień (offset_minutes)
const REMINDER_PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 godz', minutes: 60 },
  { label: '2 godz', minutes: 120 },
  { label: '3 godz', minutes: 180 },
  { label: '1 dzień', minutes: 1440 },
  { label: '2 dni', minutes: 2880 },
  { label: '3 dni', minutes: 4320 },
  { label: '7 dni', minutes: 10080 },
];

const VAPID_PUBLIC_KEY = 'BFZyVSFybBhRNKxBlQ_spt_M5tz_POXyhtIsau3stXyGMhBLJ9lfHggZhztavY2Hf1fDaC0-npXxBdvnCrb9aHg';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function getWeekDays(referenceDate: Date) {
  const day = referenceDate.getDay();
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function KalendarzClient({ events }: { events: CalendarEvent[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', time: '', owner: 'adrian', notes: '' });
  const [selectedReminders, setSelectedReminders] = useState<number[]>([]);
  const [customReminder, setCustomReminder] = useState({ value: '', unit: '60' }); // unit = minuty mnożnik
  const [saving, setSaving] = useState(false);
  const [pushOwner, setPushOwner] = useState<'adrian' | 'kasia' | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true);
    }
  }, []);

  async function subscribePush(owner: 'adrian' | 'kasia') {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Twoja przeglądarka nie obsługuje powiadomień push.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), owner }),
    });

    setPushEnabled(true);
    setPushOwner(null);
    alert(`Powiadomienia włączone dla ${OWNER_LABELS[owner]}!`);
  }

  function toggleReminder(minutes: number) {
    setSelectedReminders(prev =>
      prev.includes(minutes) ? prev.filter(m => m !== minutes) : [...prev, minutes]
    );
  }

  function addCustomReminder() {
    const val = parseInt(customReminder.value);
    if (!val || val <= 0) return;
    const minutes = val * parseInt(customReminder.unit);
    if (!selectedReminders.includes(minutes)) {
      setSelectedReminders(prev => [...prev, minutes]);
    }
    setCustomReminder(c => ({ ...c, value: '' }));
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);

  const monthLabel = new Date(year, month, 1).toLocaleDateString('pl-PL', {
    month: 'long', year: 'numeric',
  });

  function eventsForDate(dateStr: string) {
    return events.filter(e => e.date === dateStr);
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function openModal(dateStr: string) {
    setSelectedDate(dateStr);
    setForm({ title: '', time: '', owner: 'adrian', notes: '' });
    setSelectedReminders([]);
    setCustomReminder({ value: '', unit: '60' });
    setModal(true);
  }

  async function handleAdd() {
    if (!form.title.trim() || !selectedDate) return;
    setSaving(true);
    await addEvent({
      title: form.title,
      date: selectedDate,
      time: form.time,
      owner: form.owner,
      notes: form.notes,
      reminders: selectedReminders,
    });
    setSaving(false);
    setModal(false);
  }

  function formatOffsetLabel(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) {
      const h = Math.round(minutes / 60);
      return `${h}h`;
    }
    const d = Math.round(minutes / 1440);
    return `${d}d`;
  }

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weekDays = getWeekDays(today);
  const weekEvents = weekDays.map(d => ({
    date: d,
    dateStr: toDateStr(d.getFullYear(), d.getMonth(), d.getDate()),
    events: eventsForDate(toDateStr(d.getFullYear(), d.getMonth(), d.getDate())),
  })).filter(d => d.events.length > 0);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-600 text-lg">‹</button>
        <h2 className="text-lg font-bold text-zinc-900 capitalize">{monthLabel}</h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-600 text-lg">›</button>
      </div>

      {/* Legenda + push */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 text-xs">
          {(['adrian', 'kasia', 'oboje'] as const).map(o => (
            <span key={o} className={`px-2 py-0.5 rounded-full border font-medium ${OWNER_STYLES[o]}`}>
              {OWNER_LABELS[o]}
            </span>
          ))}
        </div>
        {!pushEnabled ? (
          <button onClick={() => setPushOwner('adrian')} className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 font-medium">
            🔔 Włącz powiadomienia
          </button>
        ) : (
          <span className="text-xs text-emerald-500 font-medium">🔔 Aktywne</span>
        )}
      </div>

      {/* Nagłówki */}
      <div className="grid grid-cols-7 mb-1">
        {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-zinc-400 py-1">{d}</div>
        ))}
      </div>

      {/* Siatka */}
      <div className="grid grid-cols-7 gap-px bg-zinc-200 rounded-xl overflow-hidden border border-zinc-200">
        {cells.map((day, i) => {
          const dateStr = day ? toDateStr(year, month, day) : null;
          const dayEvents = dateStr ? eventsForDate(dateStr) : [];
          const isToday = dateStr === todayStr;
          return (
            <div
              key={i}
              onClick={() => day && openModal(toDateStr(year, month, day))}
              className={`bg-white min-h-[72px] p-1.5 flex flex-col cursor-pointer hover:bg-zinc-50 transition-colors ${!day ? 'opacity-0 pointer-events-none' : ''}`}
            >
              {day && (
                <>
                  <span className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-emerald-500 text-white' : 'text-zinc-700'}`}>
                    {day}
                  </span>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {dayEvents.map(ev => (
                      <div
                        key={ev.id}
                        onClick={e => { e.stopPropagation(); if (confirm(`Usunąć "${ev.title}"?`)) deleteEvent(ev.id); }}
                        className={`text-[10px] leading-tight px-1 py-0.5 rounded border truncate cursor-pointer hover:opacity-70 ${OWNER_STYLES[ev.owner]}`}
                        title={`${ev.title}${ev.time ? ' ' + ev.time : ''}`}
                      >
                        {ev.time && <span className="opacity-60">{ev.time} </span>}
                        {ev.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Widok tygodnia */}
      <div className="mt-6">
        <h3 className="text-sm font-bold text-zinc-700 mb-3">Ten tydzień</h3>
        {weekEvents.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-4">Brak wydarzeń w tym tygodniu</p>
        ) : (
          <div className="flex flex-col gap-2">
            {weekEvents.map(({ date, dateStr, events: dayEvs }) => (
              <div key={dateStr} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <div className={`px-3 py-2 text-xs font-bold ${dateStr === todayStr ? 'bg-emerald-500 text-white' : 'bg-zinc-50 text-zinc-600 border-b border-zinc-100'}`}>
                  {date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div className="divide-y divide-zinc-100">
                  {dayEvs.map(ev => (
                    <div key={ev.id} className="flex items-start gap-3 px-3 py-2.5">
                      <span className={`mt-0.5 text-xs px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${OWNER_STYLES[ev.owner]}`}>
                        {OWNER_LABELS[ev.owner]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900">{ev.title}</p>
                        {(ev.time || ev.notes) && (
                          <p className="text-xs text-zinc-400 mt-0.5">{ev.time}{ev.time && ev.notes ? ' · ' : ''}{ev.notes}</p>
                        )}
                      </div>
                      <button onClick={() => { if (confirm(`Usunąć "${ev.title}"?`)) deleteEvent(ev.id); }} className="text-zinc-300 hover:text-red-400 text-lg leading-none shrink-0">×</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal push owner */}
      {pushOwner && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">
            <h3 className="font-bold text-zinc-900 mb-2">Kto otrzyma powiadomienia?</h3>
            <p className="text-sm text-zinc-500 mb-4">Wybierz profil dla tego urządzenia.</p>
            <div className="flex gap-2">
              {(['adrian', 'kasia'] as const).map(o => (
                <button key={o} onClick={() => subscribePush(o)} className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm ${OWNER_STYLES[o]}`}>
                  {OWNER_LABELS[o]}
                </button>
              ))}
            </div>
            <button onClick={() => setPushOwner(null)} className="w-full mt-3 py-2 text-sm text-zinc-400 hover:text-zinc-600">Anuluj</button>
          </div>
        </div>
      )}

      {/* Modal dodawania */}
      {modal && selectedDate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl my-4">
            <h3 className="font-bold text-zinc-900 mb-4">
              Nowe wydarzenie —{' '}
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}
            </h3>

            <div className="flex flex-col gap-3">
              <input
                autoFocus
                placeholder="Tytuł *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <input
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <div className="flex gap-2">
                {(['adrian', 'kasia', 'oboje'] as const).map(o => (
                  <button
                    key={o}
                    onClick={() => setForm(f => ({ ...f, owner: o }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${form.owner === o ? OWNER_STYLES[o] : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}
                  >
                    {OWNER_LABELS[o]}
                  </button>
                ))}
              </div>

              {/* Przypomnienia */}
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-2">🔔 Przypomnienia (wybierz ile chcesz)</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {REMINDER_PRESETS.map(p => (
                    <button
                      key={p.minutes}
                      onClick={() => toggleReminder(p.minutes)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                        selectedReminders.includes(p.minutes)
                          ? 'bg-amber-400 text-white border-amber-400'
                          : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {/* Własne przypomnienie */}
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="1"
                    placeholder="np. 5"
                    value={customReminder.value}
                    onChange={e => setCustomReminder(c => ({ ...c, value: e.target.value }))}
                    className="w-20 border border-zinc-200 rounded-lg px-2 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <select
                    value={customReminder.unit}
                    onChange={e => setCustomReminder(c => ({ ...c, unit: e.target.value }))}
                    className="flex-1 border border-zinc-200 rounded-lg px-2 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="1">minut</option>
                    <option value="60">godzin</option>
                    <option value="1440">dni</option>
                  </select>
                  <button
                    onClick={addCustomReminder}
                    disabled={!customReminder.value}
                    className="px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-lg text-sm font-medium hover:bg-zinc-200 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                {/* Wybrane przypomnienia */}
                {selectedReminders.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[...selectedReminders].sort((a, b) => b - a).map(m => (
                      <span
                        key={m}
                        onClick={() => toggleReminder(m)}
                        className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200 cursor-pointer hover:bg-red-100 hover:text-red-600"
                        title="Kliknij aby usunąć"
                      >
                        {formatOffsetLabel(m)} ×
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                placeholder="Notatka (opcjonalnie)"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-lg border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50">
                Anuluj
              </button>
              <button
                onClick={handleAdd}
                disabled={!form.title.trim() || saving}
                className="flex-1 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40 hover:bg-emerald-600 transition-colors"
              >
                {saving ? 'Zapisuję...' : 'Dodaj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use server';

import { getDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { sendPushToAll, OWNER_LABELS } from '@/lib/push';

export async function addEvent(form: {
  title: string;
  date: string;
  time?: string;
  owner: string;
  notes?: string;
  reminders?: number[]; // offset_minutes
}) {
  const supabase = await getDb();
  const { data: event } = await supabase
    .from('calendar_events')
    .insert({ title: form.title, date: form.date, time: form.time || null, owner: form.owner, notes: form.notes || null })
    .select('id')
    .single();

  if (event && form.reminders?.length) {
    await supabase.from('calendar_reminders').insert(
      form.reminders.map(offset_minutes => ({ event_id: event.id, offset_minutes }))
    );
  }

  const actor = OWNER_LABELS[form.owner] || 'Ktoś';
  const dateLabel = new Date(form.date + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  await sendPushToAll({ title: '📅 Nowe wydarzenie', body: `${actor}: ${form.title} — ${dateLabel}${form.time ? ', ' + form.time : ''}`, url: '/kalendarz', tag: 'calendar' });

  revalidatePath('/kalendarz');
}

export async function updateEvent(id: string, form: {
  title: string;
  date: string;
  time?: string;
  owner: string;
  notes?: string;
  reminders?: number[];
}) {
  const supabase = await getDb();
  await supabase.from('calendar_events').update({
    title: form.title,
    date: form.date,
    time: form.time || null,
    owner: form.owner,
    notes: form.notes || null,
  }).eq('id', id);

  // Wymień przypomnienia: usuń stare, wstaw nowe
  await supabase.from('calendar_reminders').delete().eq('event_id', id);
  if (form.reminders?.length) {
    await supabase.from('calendar_reminders').insert(
      form.reminders.map(offset_minutes => ({ event_id: id, offset_minutes }))
    );
  }

  revalidatePath('/kalendarz');
}

export async function deleteEvent(id: string) {
  const supabase = await getDb();
  await supabase.from('calendar_events').delete().eq('id', id);
  revalidatePath('/kalendarz');
}

export async function toggleEventDone(id: string, currentDone: boolean) {
  const supabase = await getDb();
  const newDone = !currentDone;
  await supabase.from('calendar_events').update({
    is_done: newDone,
    done_at: newDone ? new Date().toISOString() : null,
  }).eq('id', id);
  revalidatePath('/kalendarz');
}

// ── WYDARZENIA CYKLICZNE ─────────────────────────────────────────────
// Materializacja: seria = konkretne wiersze calendar_events (household_id
// ustawia trigger set_household_id, bo getDb to klient autoryzowany).
type RecFreq = 'day' | 'week' | 'month' | 'year';

function pad2(n: number) { return String(n).padStart(2, '0'); }
function toStr(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

function stepDate(dateStr: string, freq: RecFreq, interval: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (freq === 'day') d.setDate(d.getDate() + interval);
  else if (freq === 'week') d.setDate(d.getDate() + interval * 7);
  else if (freq === 'month') d.setMonth(d.getMonth() + interval);
  else if (freq === 'year') d.setFullYear(d.getFullYear() + interval);
  return toStr(d);
}

function expandDates(start: string, freq: RecFreq, interval: number, until: string): string[] {
  const out: string[] = [];
  let cur = start;
  const CAP = 120;
  for (let i = 0; i < CAP && cur <= until; i++) {
    out.push(cur);
    cur = stepDate(cur, freq, Math.max(1, interval));
  }
  return out;
}

function freqLabel(freq: RecFreq, interval: number): string {
  if (freq === 'day') return interval === 1 ? 'codziennie' : `co ${interval} dni`;
  if (freq === 'week') return interval === 1 ? 'co tydzień' : `co ${interval} tyg.`;
  if (freq === 'month') return interval === 1 ? 'co miesiąc' : `co ${interval} mies.`;
  return interval === 1 ? 'co rok' : `co ${interval} lata`;
}

export async function addRecurringSeries(
  form: { title: string; date: string; time?: string; owner: string; notes?: string; reminders?: number[] },
  rec: { freq: RecFreq; interval: number; until?: string },
) {
  const supabase = await getDb();
  const until = rec.until && /^\d{4}-\d{2}-\d{2}$/.test(rec.until)
    ? rec.until
    : stepDate(form.date, 'month', 12); // domyślnie rok do przodu
  const dates = expandDates(form.date, rec.freq, rec.interval, until);
  if (!dates.length) return;

  const rows = dates.map(d => ({
    title: form.title, date: d, time: form.time || null, owner: form.owner, notes: form.notes || null,
  }));
  const { data: inserted } = await supabase.from('calendar_events').insert(rows).select('id');

  if (inserted?.length && form.reminders?.length) {
    const rem: { event_id: string; offset_minutes: number }[] = [];
    inserted.forEach(ev => form.reminders!.forEach(m => rem.push({ event_id: ev.id, offset_minutes: m })));
    if (rem.length) await supabase.from('calendar_reminders').insert(rem);
  }

  const actor = OWNER_LABELS[form.owner] || 'Ktoś';
  await sendPushToAll({
    title: '📅 Nowa seria wydarzeń',
    body: `${actor}: ${form.title} — ${dates.length}× (${freqLabel(rec.freq, rec.interval)})`,
    url: '/kalendarz', tag: 'calendar',
  });
  revalidatePath('/kalendarz');
}

// Usuń serię = to wydarzenie i wszystkie przyszłe o tej samej nazwie/osobie/godzinie.
export async function deleteSeries(title: string, owner: string, fromDate: string, time: string | null) {
  const supabase = await getDb();
  let qb = supabase.from('calendar_events').delete().eq('title', title).eq('owner', owner).gte('date', fromDate);
  qb = time ? qb.eq('time', time) : qb.is('time', null);
  await qb;
  revalidatePath('/kalendarz');
}

// ── CYKL (okres/owulacja) ────────────────────────────────────────────
// Konfiguracja + realne wpisy okresu trzymane w JEDNYM ukrytym wierszu
// calendar_events (title='__cykl__'), notes = JSON {len,plen,starts[],ends[]}.
// Ukryty z widoku (page.tsx odfiltrowuje). household_id z triggera.
export async function saveCycle(payload: string) {
  const supabase = await getDb();
  const { data: rows } = await supabase
    .from('calendar_events').select('id').eq('title', '__cykl__').limit(1);
  if (rows?.length) {
    await supabase.from('calendar_events').update({ notes: payload, owner: 'kasia' }).eq('id', rows[0].id);
  } else {
    await supabase.from('calendar_events').insert({
      title: '__cykl__', date: new Date().toISOString().slice(0, 10),
      owner: 'kasia', notes: payload, is_done: false,
    });
  }
  revalidatePath('/kalendarz');
}

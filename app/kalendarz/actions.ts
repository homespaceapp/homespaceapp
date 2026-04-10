'use server';

import { supabase } from '@/lib/db';
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
  await supabase.from('calendar_events').delete().eq('id', id);
  revalidatePath('/kalendarz');
}

export async function toggleEventDone(id: string, currentDone: boolean) {
  const newDone = !currentDone;
  await supabase.from('calendar_events').update({
    is_done: newDone,
    done_at: newDone ? new Date().toISOString() : null,
  }).eq('id', id);
  revalidatePath('/kalendarz');
}

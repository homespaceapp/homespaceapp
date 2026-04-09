'use server';

import { supabase } from '@/lib/db';
import { revalidatePath } from 'next/cache';

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

  revalidatePath('/kalendarz');
}

export async function deleteEvent(id: string) {
  await supabase.from('calendar_events').delete().eq('id', id);
  revalidatePath('/kalendarz');
}

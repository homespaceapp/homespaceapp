'use server';

import { supabase } from '@/lib/db';
import { sendPushToAll, OWNER_LABELS } from '@/lib/push';

export async function getNotes() {
  const { data } = await supabase
    .from('notes')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });
  return data || [];
}

export async function addNote(form: { title: string; body?: string; color?: string; owner?: string; priority?: boolean }) {
  const { data } = await supabase
    .from('notes')
    .insert({ title: form.title, body: form.body || null, color: form.color || 'yellow', owner: form.owner || 'oboje', priority: form.priority || false })
    .select()
    .single();
  if (data) {
    const actor = OWNER_LABELS[form.owner || 'oboje'] || 'Ktoś';
    await sendPushToAll({ title: '📝 Nowa notatka', body: `${actor}: ${form.title}`, url: '/notatki', tag: 'notes' });
  }
  return data;
}

export async function updateNote(id: string, form: { title?: string; body?: string; color?: string; pinned?: boolean; owner?: string; priority?: boolean }) {
  const { data } = await supabase
    .from('notes')
    .update(form)
    .eq('id', id)
    .select()
    .single();
  return data;
}

export async function deleteNote(id: string) {
  await supabase.from('notes').delete().eq('id', id);
}

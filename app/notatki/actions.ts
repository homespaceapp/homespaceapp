'use server';

import { supabase } from '@/lib/db';

export async function getNotes() {
  const { data } = await supabase
    .from('notes')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });
  return data || [];
}

export async function addNote(form: { title: string; body?: string; color?: string; owner?: string }) {
  const { data } = await supabase
    .from('notes')
    .insert({ title: form.title, body: form.body || null, color: form.color || 'yellow', owner: form.owner || 'oboje' })
    .select()
    .single();
  return data;
}

export async function updateNote(id: string, form: { title?: string; body?: string; color?: string; pinned?: boolean }) {
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

'use server';

import { supabase } from '@/lib/db';

export async function getContacts() {
  const { data } = await supabase
    .from('contacts')
    .select('*')
    .order('name');
  return data || [];
}

export async function addContact(form: { name: string; role?: string; phone?: string; email?: string; notes?: string }) {
  const { data } = await supabase
    .from('contacts')
    .insert(form)
    .select()
    .single();
  return data;
}

export async function updateContact(id: string, form: { name?: string; role?: string; phone?: string; email?: string; notes?: string }) {
  const { data } = await supabase
    .from('contacts')
    .update(form)
    .eq('id', id)
    .select()
    .single();
  return data;
}

export async function deleteContact(id: string) {
  await supabase.from('contacts').delete().eq('id', id);
}

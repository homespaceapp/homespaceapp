'use server';

import { supabase } from '@/lib/db';

export async function getMessages(since?: string) {
  const query = supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(100);
  if (since) query.gt('created_at', since);
  const { data } = await query;
  return data || [];
}

export async function sendChatMessage(owner: string, text: string) {
  const { data } = await supabase
    .from('messages')
    .insert({ owner, text })
    .select()
    .single();
  return data;
}

'use server';
import { supabase } from '@/lib/db';
import { sendPushToOwner } from '@/lib/push';

export async function getMessages() {
  const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(100);
  return data || [];
}

export async function sendChatMessage(owner: string, text: string) {
  const { data } = await supabase.from('messages').insert({ owner, text }).select().single();

  // Push do drugiej osoby
  const other = owner === 'adrian' ? 'kasia' : 'adrian';
  const ownerLabel = owner === 'adrian' ? 'Adrian' : 'Kasia';
  try {
    await sendPushToOwner(other, {
      title: `💬 ${ownerLabel} napisał(a)`,
      body: text.length > 80 ? text.slice(0, 80) + '…' : text,
      url: '/czat',
    });
  } catch { /* push opcjonalny — nie blokuj */ }

  return data;
}

'use server';
import { supabase } from '@/lib/db';

export async function getWishList() {
  const { data } = await supabase.from('wish_list').select('*').order('bought').order('priority', { ascending: false }).order('created_at', { ascending: false });
  return data || [];
}
export async function addWish(form: { name: string; category?: string; price_estimate?: string; priority?: string; notes?: string; owner?: string }) {
  const { data } = await supabase.from('wish_list').insert({ ...form, price_estimate: form.price_estimate ? parseFloat(form.price_estimate) : null }).select().single();
  return data;
}
export async function updateWish(id: string, form: Partial<{ name: string; category: string; price_estimate: string; priority: string; notes: string; owner: string; bought: boolean }>) {
  const { data } = await supabase.from('wish_list').update({ ...form, price_estimate: form.price_estimate !== undefined ? (form.price_estimate ? parseFloat(form.price_estimate) : null) : undefined }).eq('id', id).select().single();
  return data;
}
export async function deleteWish(id: string) {
  await supabase.from('wish_list').delete().eq('id', id);
}

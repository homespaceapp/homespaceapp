'use server';

import { supabase } from '@/lib/db';
import { revalidatePath } from 'next/cache';

type PantryForm = { name: string; quantity: string; unit: string; category: string; purchase_date: string; expiry_days: string };

export async function addPantryItem(form: PantryForm) {
  const newQty = parseFloat(form.quantity) || 1;

  // Deduplikacja — jeśli produkt o tej samej nazwie już istnieje, sumuj ilość
  const { data: existing } = await supabase
    .from('pantry')
    .select('id, quantity')
    .ilike('name', form.name.trim())
    .maybeSingle();

  if (existing) {
    const { data } = await supabase
      .from('pantry')
      .update({ quantity: existing.quantity + newQty })
      .eq('id', existing.id)
      .select()
      .single();
    revalidatePath('/spizarnia');
    return { item: data };
  }

  const { data } = await supabase
    .from('pantry')
    .insert({
      name: form.name,
      quantity: newQty,
      unit: form.unit,
      category: form.category,
      purchase_date: form.purchase_date || null,
      expiry_days: form.expiry_days ? parseInt(form.expiry_days) : null,
    })
    .select()
    .single();
  revalidatePath('/spizarnia');
  return { item: data };
}

export async function deletePantryItem(id: number) {
  await supabase.from('pantry').delete().eq('id', id);
  revalidatePath('/spizarnia');
}

export async function updatePantryQuantity(id: number, quantity: number) {
  await supabase.from('pantry').update({ quantity }).eq('id', id);
  revalidatePath('/spizarnia');
}

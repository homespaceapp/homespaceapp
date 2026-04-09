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
    return { item: data, wasUpdated: true };
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
  // Pobierz nazwę produktu przed usunięciem
  const { data: pantryItem } = await supabase
    .from('pantry')
    .select('name')
    .eq('id', id)
    .single();

  await supabase.from('pantry').delete().eq('id', id);

  // Odznacz produkt na aktywnej liście zakupów (żeby wiadomo było, że trzeba kupić ponownie)
  if (pantryItem) {
    const { data: activeLists } = await supabase
      .from('shopping_lists')
      .select('id')
      .eq('status', 'active');

    if (activeLists && activeLists.length > 0) {
      const listIds = activeLists.map(l => l.id);
      await supabase
        .from('shopping_items')
        .update({ checked: false })
        .in('list_id', listIds)
        .ilike('name', `%${pantryItem.name}%`);
    }
  }

  revalidatePath('/spizarnia');
}

export async function updatePantryQuantity(id: number, quantity: number) {
  await supabase.from('pantry').update({ quantity }).eq('id', id);
  revalidatePath('/spizarnia');
}

export async function updatePantryItem(id: number, form: Partial<PantryForm>) {
  await supabase.from('pantry').update({
    ...(form.name !== undefined && { name: form.name }),
    ...(form.quantity !== undefined && { quantity: parseFloat(form.quantity) || 0 }),
    ...(form.unit !== undefined && { unit: form.unit }),
    ...(form.category !== undefined && { category: form.category }),
    ...(form.expiry_days !== undefined && { expiry_days: form.expiry_days ? parseInt(form.expiry_days) : null }),
  }).eq('id', id);
  const { data } = await supabase.from('pantry').select().eq('id', id).single();
  revalidatePath('/spizarnia');
  return { item: data };
}

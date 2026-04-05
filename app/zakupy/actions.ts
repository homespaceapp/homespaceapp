'use server';

import { supabase } from '@/lib/db';
import { revalidatePath } from 'next/cache';

const DEFAULT_SHOPPING = [
  { name: 'Kurczak filet', quantity: '1 kg', unit: 'kg', category: 'mięso' },
  { name: 'Mięso mielone', quantity: '500 g', unit: 'g', category: 'mięso' },
  { name: 'Kiełbasa', quantity: '300 g', unit: 'g', category: 'mięso' },
  { name: 'Jajka', quantity: '10 szt.', unit: 'szt', category: 'nabiał' },
  { name: 'Śmietana 18%', quantity: '200 ml', unit: 'ml', category: 'nabiał' },
  { name: 'Ser żółty', quantity: '150 g', unit: 'g', category: 'nabiał' },
  { name: 'Masło', quantity: '200 g', unit: 'g', category: 'nabiał' },
  { name: 'Mleko', quantity: '1 l', unit: 'l', category: 'nabiał' },
  { name: 'Ziemniaki', quantity: '1,5 kg', unit: 'kg', category: 'warzywa' },
  { name: 'Cebula', quantity: '3 szt.', unit: 'szt', category: 'warzywa' },
  { name: 'Czosnek', quantity: '1 główka', unit: 'szt', category: 'warzywa' },
  { name: 'Marchew', quantity: '3 szt.', unit: 'szt', category: 'warzywa' },
  { name: 'Pomidor', quantity: '3 szt.', unit: 'szt', category: 'warzywa' },
  { name: 'Ogórek', quantity: '2 szt.', unit: 'szt', category: 'warzywa' },
  { name: 'Sałata / kapusta', quantity: '1 szt.', unit: 'szt', category: 'warzywa' },
  { name: 'Passata pomidorowa', quantity: '1 puszka (500 g)', unit: 'szt', category: 'suche' },
  { name: 'Makaron', quantity: '400 g', unit: 'g', category: 'suche' },
  { name: 'Ryż', quantity: '1 torebka', unit: 'szt', category: 'suche' },
  { name: 'Kasza gryczana', quantity: '400 g', unit: 'g', category: 'suche' },
  { name: 'Olej / oliwa', quantity: '—', unit: '', category: 'suche' },
  { name: 'Tortille', quantity: '1 opakowanie', unit: 'szt', category: 'pieczywo' },
  { name: 'Chleb', quantity: '1 bochenek', unit: 'szt', category: 'pieczywo' },
];

export const SWEETS_LIST = [
  { name: 'Żelki kablowe', quantity: '1 paczka', unit: 'szt', category: 'słodycze' },
  { name: 'Żelki Frulusie', quantity: '1 paczka', unit: 'szt', category: 'słodycze' },
  { name: 'Żelki mleczne', quantity: '1 paczka', unit: 'szt', category: 'słodycze' },
  { name: 'Rurki waniliowe', quantity: '1 paczka', unit: 'szt', category: 'słodycze' },
  { name: 'Wafle', quantity: '1 paczka', unit: 'szt', category: 'słodycze' },
  { name: 'JELLY BEANS', quantity: '1 paczka', unit: 'szt', category: 'słodycze' },
  { name: 'BIG HIT orzech/czek', quantity: '1 paczka', unit: 'szt', category: 'słodycze' },
];

// Produkty "zawsze sprawdź" — kończą się regularnie
const STAPLES = [
  { name: 'Sól', unit: 'szt', category: 'suche' },
  { name: 'Pieprz', unit: 'szt', category: 'suche' },
  { name: 'Olej / oliwa', unit: 'szt', category: 'suche' },
  { name: 'Cukier', unit: 'szt', category: 'suche' },
  { name: 'Mąka', unit: 'szt', category: 'suche' },
];

function nameMatch(pantryName: string, shoppingName: string): boolean {
  const p = pantryName.toLowerCase().trim();
  const s = shoppingName.toLowerCase().trim();
  const sWords = s.split(/[\s/]+/).filter(w => w.length > 2);
  return sWords.some(w => p.includes(w)) || p.split(/[\s/]+/).filter(w => w.length > 2).some(w => s.includes(w));
}

export async function generateShoppingList(weekNumber: number) {
  // Zwróć istniejącą listę jeśli jest
  const { data: existing } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('week_number', weekNumber)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    const { data: items } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('list_id', existing.id)
      .order('category');
    return { listId: existing.id, items: items || [] };
  }

  // Pobierz spiżarnię z ilościami
  const { data: pantry } = await supabase
    .from('pantry')
    .select('name, quantity');
  const pantryItems = pantry || [];

  // Utwórz nową listę
  const { data: list, error: listError } = await supabase
    .from('shopping_lists')
    .insert({ week_number: weekNumber, created_at: new Date().toISOString(), status: 'active' })
    .select('id')
    .maybeSingle();

  if (listError || !list) {
    return { listId: null, items: [], error: listError?.message || 'Błąd tworzenia listy' };
  }

  const listId = list.id;

  // Filtruj DEFAULT_SHOPPING — pomijaj co jest w spiżarni z ilością > 0
  const mainItems = DEFAULT_SHOPPING
    .filter(item => {
      const inPantry = pantryItems.find(p => nameMatch(p.name, item.name));
      return !inPantry || inPantry.quantity <= 0;
    })
    .map(item => ({ ...item, list_id: listId, checked: false }));

  // Dodaj STAPLES których brakuje lub mają qty <= 0
  const staplesNeeded = STAPLES
    .filter(s => {
      const inPantry = pantryItems.find(p => nameMatch(p.name, s.name));
      return !inPantry || inPantry.quantity <= 0;
    })
    .map(s => ({ ...s, quantity: '—', list_id: listId, checked: false }));

  const toInsert = [...mainItems, ...staplesNeeded];

  if (toInsert.length > 0) {
    await supabase.from('shopping_items').insert(toInsert);
  }

  const { data: items } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('list_id', listId)
    .order('category');

  revalidatePath('/zakupy');
  return { listId, items: items || [] };
}

export async function toggleItem(itemId: number) {
  const { data: item } = await supabase.from('shopping_items').select('checked').eq('id', itemId).single();
  await supabase.from('shopping_items').update({ checked: !item?.checked }).eq('id', itemId);
  revalidatePath('/zakupy');
}

export async function addItem(listId: number, name: string, quantity: string) {
  const { data } = await supabase
    .from('shopping_items')
    .insert({ list_id: listId, name, quantity, unit: '', checked: false, category: 'inne' })
    .select()
    .single();
  revalidatePath('/zakupy');
  return { item: data };
}

export async function addSweetsToList(listId: number) {
  const { data: pantry } = await supabase.from('pantry').select('name').eq('category', 'słodycze');
  const pantryNames = (pantry || []).map((p: { name: string }) => p.name.toLowerCase());
  const toAdd = SWEETS_LIST
    .filter(s => !pantryNames.some(p => p.includes(s.name.toLowerCase().split(' ')[0]) || s.name.toLowerCase().includes(p)))
    .map(item => ({ ...item, list_id: listId, checked: false }));

  await supabase.from('shopping_items').insert(toAdd);
  const { data: items } = await supabase.from('shopping_items').select('*').eq('list_id', listId).order('category');
  revalidatePath('/zakupy');
  return { items: items || [] };
}

export async function deleteList(listId: number) {
  await supabase.from('shopping_items').delete().eq('list_id', listId);
  await supabase.from('shopping_lists').delete().eq('id', listId);
  revalidatePath('/zakupy');
}

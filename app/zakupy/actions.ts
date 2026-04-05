'use server';

import { supabase } from '@/lib/db';
// revalidatePath removed — strona ma force-dynamic, niepotrzebne i crashuje w Next.js 15

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

const SWEETS_LIST = [
  { name: 'Żelki kablowe', quantity: '1 paczka', unit: 'szt', category: 'słodycze' },
  { name: 'Żelki Frulusie', quantity: '1 paczka', unit: 'szt', category: 'słodycze' },
  { name: 'Żelki mleczne', quantity: '1 paczka', unit: 'szt', category: 'słodycze' },
  { name: 'Rurki waniliowe', quantity: '1 paczka', unit: 'szt', category: 'słodycze' },
  { name: 'Wafle', quantity: '1 paczka', unit: 'szt', category: 'słodycze' },
  { name: 'JELLY BEANS', quantity: '1 paczka', unit: 'szt', category: 'słodycze' },
  { name: 'BIG HIT orzech/czek', quantity: '1 paczka', unit: 'szt', category: 'słodycze' },
];


function nameMatch(pantryName: string, shoppingName: string): boolean {
  const p = pantryName.toLowerCase().trim();
  const s = shoppingName.toLowerCase().trim();
  const sWords = s.split(/[\s/]+/).filter(w => w.length > 2);
  return sWords.some(w => p.includes(w)) || p.split(/[\s/]+/).filter(w => w.length > 2).some(w => s.includes(w));
}

export async function generateShoppingList(weekNumber: number) {
  try {
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
    return { listId: existing.id, items: items || [], error: null };
  }

  // Pobierz spiżarnię
  const { data: pantry } = await supabase.from('pantry').select('name, quantity');
  const pantryItems = pantry || [];

  // Pobierz plan tygodnia — pobierz meal_name (meal_id może być null w starszych wpisach)
  const { data: weekPlan } = await supabase
    .from('weekly_plan')
    .select('meal_id, meal_name')
    .eq('week_number', weekNumber);

  const planRows = weekPlan || [];

  // Zbierz wszystkie nazwy dań tygodnia
  const mealNames = planRows.map((wp: { meal_name: string }) => wp.meal_name).filter(Boolean);
  // Zbierz meal_ids gdzie dostępne
  const mealIds = planRows.map((wp: { meal_id: number }) => wp.meal_id).filter(Boolean);

  // Pobierz składniki — po ID (nowe wpisy) lub po nazwie (stare wpisy z meal_id=null)
  let mealsWithIngredients: Array<{ ingredients: string; category: string }> = [];

  if (mealIds.length > 0) {
    const { data } = await supabase.from('meals').select('ingredients, category').in('id', mealIds);
    if (data) mealsWithIngredients = [...mealsWithIngredients, ...data];
  }

  // Dla wpisów bez meal_id — szukaj po nazwie
  const namesWithoutId = planRows
    .filter((wp: { meal_id: number | null }) => !wp.meal_id)
    .map((wp: { meal_name: string }) => wp.meal_name)
    .filter(Boolean);

  if (namesWithoutId.length > 0) {
    const { data } = await supabase
      .from('meals')
      .select('name, ingredients, category')
      .in('name', namesWithoutId);
    if (data) mealsWithIngredients = [...mealsWithIngredients, ...data];
  }

  // Parsuj składniki ze wszystkich dań tygodnia
  const ingredientItems: { name: string; quantity: string; unit: string; category: string }[] = [];
  const seen = new Set<string>();

  for (const meal of mealsWithIngredients) {
    if (!meal.ingredients) continue;
    for (const raw of meal.ingredients.split(',')) {
      const ing = raw.trim();
      if (!ing) continue;
      const key = ing.toLowerCase().split(/[\s(]/)[0];
      if (seen.has(key)) continue;
      seen.add(key);
      const inPantry = pantryItems.find(p => nameMatch(p.name, ing));
      if (inPantry && Number(inPantry.quantity) > 0) continue;
      ingredientItems.push({ name: ing, quantity: '', unit: '', category: meal.category || 'inne' });
    }
  }

  // Fallback na DEFAULT_SHOPPING jeśli brak planu lub dania nie mają składników
  const hasMealPlan = mealNames.length > 0;
  const baseItems = (hasMealPlan && ingredientItems.length > 0)
    ? ingredientItems
    : DEFAULT_SHOPPING
        .filter(item => {
          const inPantry = pantryItems.find(p => nameMatch(p.name, item.name));
          return !inPantry || Number(inPantry.quantity) <= 0;
        })
        .map(item => ({ name: item.name, quantity: item.quantity, unit: item.unit, category: item.category }));

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

  const toInsert = baseItems.map(item => ({
    name: item.name,
    quantity: item.quantity || '',
    unit: item.unit || '',
    category: item.category || 'inne',
    list_id: listId,
    checked: false,
  }));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('shopping_items').insert(toInsert);
    if (insertError) {
      await supabase.from('shopping_lists').delete().eq('id', listId);
      return { listId: null, items: [], error: `Błąd wstawiania pozycji: ${insertError.message}` };
    }
  }

  const { data: items } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('list_id', listId)
    .order('category');

  return { listId, items: items || [], error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { listId: null, items: [], error: `Wyjątek: ${msg}` };
  }
}

export async function toggleItem(itemId: number) {
  const { data: item } = await supabase.from('shopping_items').select('checked').eq('id', itemId).single();
  await supabase.from('shopping_items').update({ checked: !item?.checked }).eq('id', itemId);

}

export async function addItem(listId: number, name: string, quantity: string) {
  const { data } = await supabase
    .from('shopping_items')
    .insert({ list_id: listId, name, quantity, unit: '', checked: false, category: 'inne' })
    .select()
    .single();

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

  return { items: items || [] };
}

export async function deleteList(listId: number) {
  await supabase.from('shopping_items').delete().eq('list_id', listId);
  await supabase.from('shopping_lists').delete().eq('id', listId);

}

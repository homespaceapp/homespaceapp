'use server';

import { supabase } from '@/lib/db';
import { sendPushToAll } from '@/lib/push';
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

// Parsuje "500g pierś kurczaka" → { qty: 500, unit: "g", name: "pierś kurczaka" }
function parseIngredient(raw: string): { qty: number; unit: string; name: string } {
  const s = raw.trim();
  const m = s.match(/^(\d+[.,\/]?\d*)\s*(g|kg|ml|l|szt|łyż\w*|pusz\w*|szklan\w*|główk\w*|ząbk\w*|opakow\w*|plastr\w*|pęcz\w*|miark\w*|łyżecz\w*|saszetk\w*|płat\w*|bochenk\w*)?\s*(.+)$/i);
  if (m) {
    let qty = 0;
    if (m[1].includes('/')) {
      const [a, b] = m[1].split('/');
      qty = parseInt(a) / parseInt(b);
    } else {
      qty = parseFloat(m[1].replace(',', '.'));
    }
    return { qty, unit: (m[2] || 'szt').toLowerCase(), name: m[3].trim() };
  }
  return { qty: 0, unit: '', name: s };
}

// Normalizuje nazwę do klucza grupowania: "pierś kurczaka" i "piersi kurczaka" → "pierś kurczaka"
function ingredientKey(name: string): string {
  return name.toLowerCase()
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1)
    .slice(0, 2)
    .join(' ');
}

// Kategoria na podstawie nazwy składnika
function detectShoppingCategory(name: string): string {
  const n = name.toLowerCase();
  if (/kurcz|pierś|udka|mięs|mielon|karkówk|boczek|kiełbas|szynk|salami|wieprzow|wołow/.test(n)) return 'mięso';
  if (/mleko|śmietan|jogurt|ser |masło|jaj|parmezan|feta/.test(n)) return 'nabiał';
  if (/cebul|czosn|marchew|pomidor|ogórek|papryk|sałat|kapust|ziemniak|jabłk|truskaw|awokado|limonk|imbir|groszek|kukurydz|fasol|pieczark|grzby/.test(n)) return 'warzywa';
  if (/tortill|chleb|bułk/.test(n)) return 'pieczywo';
  if (/makaron|ryż|kasza|mąka|passata|pesto|sos soj|mleczko kokos|drożdż|proszk|bułka tart|panierk/.test(n)) return 'suche';
  if (/sól|pieprz|olej|oliw|cukier|cynamon|oregano|papryka .*mielon|kumin|majeran|gałka|ziele|liść|koperek|natka|kolendra/.test(n)) return 'przyprawy';
  return 'inne';
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

  // Parsuj i SUMUJ składniki ze wszystkich dań tygodnia
  // np. mleko 500ml + mleko 250ml → mleko 750ml
  const merged = new Map<string, { displayName: string; qty: number; unit: string; category: string }>();

  for (const meal of mealsWithIngredients) {
    if (!meal.ingredients) continue;
    for (const raw of meal.ingredients.split(',')) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const parsed = parseIngredient(trimmed);
      const key = ingredientKey(parsed.name);
      if (!key) continue;
      const existing = merged.get(key);
      if (existing) {
        existing.qty += parsed.qty;
        if (parsed.name.length > existing.displayName.length) existing.displayName = parsed.name;
      } else {
        merged.set(key, {
          displayName: parsed.name,
          qty: parsed.qty,
          unit: parsed.unit,
          category: detectShoppingCategory(parsed.name),
        });
      }
    }
  }

  // Filtruj po spiżarni i konwertuj na listę
  const ingredientItems: { name: string; quantity: string; unit: string; category: string }[] = [];
  for (const [, val] of merged) {
    const inPantry = pantryItems.find(p => nameMatch(p.name, val.displayName));
    if (inPantry && Number(inPantry.quantity) > 0) continue;
    const qtyStr = val.qty > 0 ? `${Math.round(val.qty * 10) / 10} ${val.unit}`.trim() : '';
    ingredientItems.push({ name: val.displayName, quantity: qtyStr, unit: val.unit, category: val.category });
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
  const { data: item } = await supabase
    .from('shopping_items')
    .select('checked, name, quantity, category')
    .eq('id', itemId)
    .single();
  if (!item) return;

  const newChecked = !item.checked;
  await supabase.from('shopping_items').update({ checked: newChecked }).eq('id', itemId);

  // Zaznaczenie = kupione → dodaj do spiżarni z poprawną ilością
  if (newChecked) {
    // Parsuj ilość z pola quantity (np. "400 g", "4 szt", "750 ml")
    const qtyMatch = (item.quantity || '').match(/^(\d+[.,]?\d*)\s*(\w*)/);
    const qty = qtyMatch ? parseFloat(qtyMatch[1].replace(',', '.')) : 1;
    const unit = qtyMatch && qtyMatch[2] ? qtyMatch[2].toLowerCase() : 'szt';
    const { data: existing } = await supabase
      .from('pantry')
      .select('id, quantity')
      .ilike('name', `%${ingredientKey(item.name)}%`)
      .maybeSingle();

    if (existing) {
      await supabase.from('pantry').update({ quantity: existing.quantity + qty }).eq('id', existing.id);
    } else {
      await supabase.from('pantry').insert({
        name: item.name,
        quantity: qty,
        unit: unit,
        category: detectShoppingCategory(item.name),
        purchase_date: new Date().toISOString().slice(0, 10),
      });
    }
  }
}

export async function addItem(listId: number, name: string, quantity: string) {
  const { data } = await supabase
    .from('shopping_items')
    .insert({ list_id: listId, name, quantity, unit: '', checked: false, category: 'inne' })
    .select()
    .single();

  if (data) {
    await sendPushToAll({ title: '🛒 Lista zakupów', body: `Dodano: ${name}${quantity ? ' (' + quantity + ')' : ''}`, url: '/zakupy', tag: 'shopping' });
  }
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

export async function createEmptyList(weekNumber: number) {
  // Sprawdź czy już istnieje
  const { data: existing } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('week_number', weekNumber)
    .eq('status', 'active')
    .maybeSingle();
  if (existing) {
    const { data: items } = await supabase.from('shopping_items').select('*').eq('list_id', existing.id).order('category');
    return { listId: existing.id, items: items || [] };
  }
  const { data: list } = await supabase
    .from('shopping_lists')
    .insert({ week_number: weekNumber, created_at: new Date().toISOString(), status: 'active' })
    .select('id')
    .maybeSingle();
  return { listId: list?.id ?? null, items: [] };
}

export async function deleteList(listId: number) {
  await supabase.from('shopping_items').delete().eq('list_id', listId);
  await supabase.from('shopping_lists').delete().eq('id', listId);

}

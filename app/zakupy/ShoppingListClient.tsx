'use client';

import { useState, useTransition } from 'react';
import { generateShoppingList, toggleItem, addItem, deleteList, addSweetsToList } from './actions';
import Link from 'next/link';

type Item = { id: number; name: string; quantity: string; unit: string; checked: number; category: string };

const categoryOrder = ['mięso', 'nabiał', 'warzywa', 'suche', 'pieczywo', 'słodycze', 'inne'];
const categoryLabels: Record<string, string> = {
  mięso: '🥩 Mięso i ryby',
  nabiał: '🥛 Nabiał i jajka',
  warzywa: '🥦 Warzywa i owoce',
  suche: '🌾 Suche produkty',
  pieczywo: '🥖 Pieczywo',
  słodycze: '🍬 Słodycze',
  inne: '🛒 Inne',
};

export default function ShoppingListClient({
  selectedWeek,
  currentWeek,
  listId: initialListId,
  initialItems,
}: {
  selectedWeek: number;
  currentWeek: number;
  listId: number | null;
  initialItems: Item[];
}) {
  const [listId, setListId] = useState(initialListId);
  const [items, setItems] = useState(initialItems);
  const [newItem, setNewItem] = useState('');
  const [newQty, setNewQty] = useState('');
  const [genError, setGenError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [, startTransition] = useTransition();

  const checked = items.filter(i => i.checked).length;
  const total = items.length;

  const grouped = categoryOrder.reduce((acc, cat) => {
    const catItems = items.filter(i => (i.category || 'inne') === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, Item[]>);

  const uncategorized = items.filter(i => !categoryOrder.includes(i.category || 'inne'));
  if (uncategorized.length > 0) grouped['inne'] = [...(grouped['inne'] || []), ...uncategorized];

  async function handleGenerate() {
    setGenError('');
    setIsPending(true);
    try {
      const result = await generateShoppingList(selectedWeek);
      if (result.error) {
        setGenError(result.error);
      } else if (result.listId) {
        setListId(result.listId);
        setItems(result.items as Item[]);
      }
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Nieznany błąd');
    } finally {
      setIsPending(false);
    }
  }

  function handleToggle(itemId: number) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, checked: i.checked ? 0 : 1 } : i));
    startTransition(async () => {
      await toggleItem(itemId);
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim() || !listId) return;
    startTransition(async () => {
      const result = await addItem(listId!, newItem.trim(), newQty.trim());
      if (result.item) {
        setItems(prev => [...prev, result.item as Item]);
        setNewItem('');
        setNewQty('');
      }
    });
  }

  function handleAddSweets() {
    if (!listId) return;
    startTransition(async () => {
      const result = await addSweetsToList(listId!);
      if (result.items) setItems(result.items);
    });
  }

  function handleDelete() {
    if (!listId || !confirm('Usuń tę listę zakupów?')) return;
    startTransition(async () => {
      await deleteList(listId!);
      setListId(null);
      setItems([]);
    });
  }

  function copyToClipboard() {
    const text = Object.entries(grouped)
      .map(([cat, catItems]) =>
        `${categoryLabels[cat] || cat}\n` +
        catItems.map(i => `${i.checked ? '✓' : '□'} ${i.name}${i.quantity ? ` — ${i.quantity}` : ''}`).join('\n')
      )
      .join('\n\n');
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Lista zakupów</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Tydzień {selectedWeek}
            {selectedWeek === currentWeek && <span className="ml-1 text-emerald-600">(obecny)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/zakupy?week=${selectedWeek - 1}`}
            className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600"
          >
            ←
          </Link>
          <Link
            href={`/zakupy?week=${selectedWeek + 1}`}
            className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600"
          >
            →
          </Link>
        </div>
      </div>

      {!listId ? (
        <div className="bg-white rounded-xl p-8 border border-zinc-200 text-center">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-zinc-600 font-medium mb-1">Brak listy na tydzień {selectedWeek}</p>
          <p className="text-sm text-zinc-400 mb-5">Wygeneruję listę na podstawie planu obiadów tego tygodnia</p>
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending ? 'Generuję…' : '✨ Generuj listę zakupów'}
          </button>
          {genError && (
            <p className="text-xs text-red-500 mt-2 bg-red-50 px-3 py-2 rounded-lg">
              Błąd: {genError}
            </p>
          )}
          <p className="text-xs text-zinc-400 mt-3">
            Lista uwzględni stany spiżarni (co już masz)
          </p>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="bg-white rounded-xl p-4 border border-zinc-200 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-700">
                {checked} / {total} produktów odklikanych
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddSweets}
                  disabled={isPending}
                  className="text-xs px-2 py-1 rounded border border-pink-200 hover:bg-pink-50 text-pink-600 disabled:opacity-50"
                >
                  🍬 Słodycze
                </button>
                <button
                  onClick={copyToClipboard}
                  className="text-xs px-2 py-1 rounded border border-zinc-200 hover:bg-zinc-50 text-zinc-500"
                >
                  📋 Kopiuj
                </button>
                <button
                  onClick={handleDelete}
                  className="text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50 text-red-500"
                >
                  🗑️ Usuń
                </button>
              </div>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: total > 0 ? `${(checked / total) * 100}%` : '0%' }}
              />
            </div>
            {checked === total && total > 0 && (
              <p className="text-sm text-emerald-600 font-medium mt-2">✓ Wszystko kupione!</p>
            )}
          </div>

          {/* Lista produktów */}
          <div className="flex flex-col gap-4 mb-4">
            {Object.entries(grouped).map(([cat, catItems]) => (
              <div key={cat} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                  <p className="text-sm font-semibold text-zinc-600">{categoryLabels[cat] || cat}</p>
                </div>
                <div className="divide-y divide-zinc-100">
                  {catItems.map(item => (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 transition-colors ${
                        item.checked ? 'opacity-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!item.checked}
                        onChange={() => handleToggle(item.id)}
                        className="w-4 h-4 rounded accent-emerald-600"
                      />
                      <span className={`flex-1 text-sm ${item.checked ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                        {item.name}
                      </span>
                      {item.quantity && (
                        <span className="text-xs text-zinc-400 shrink-0">{item.quantity}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Dodaj produkt */}
          <form onSubmit={handleAdd} className="bg-white rounded-xl p-4 border border-zinc-200">
            <p className="text-sm font-medium text-zinc-600 mb-3">Dodaj produkt ręcznie</p>
            <div className="flex gap-2">
              <input
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                placeholder="Nazwa produktu..."
                className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                value={newQty}
                onChange={e => setNewQty(e.target.value)}
                placeholder="Ilość (np. 500 g)"
                className="w-32 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isPending || !newItem.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                Dodaj
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

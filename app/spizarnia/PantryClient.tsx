'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { addPantryItem, deletePantryItem, updatePantryItem } from './actions';

const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false });

type Item = { id: number; name: string; quantity: number; unit: string; category: string; purchase_date: string; expiry_days: number; notes: string; protein_per_100g?: number | null; fat_per_100g?: number | null; carbs_per_100g?: number | null; kcal_per_100g?: number | null };

const EXPIRY_DEFAULTS: Record<string, number> = {
  'kurczak': 2, 'mięso mielone': 1, 'karkówka': 2, 'wieprzowina': 2,
  'kiełbasa': 6, 'boczek': 6, 'jajka': 21, 'mleko': 5,
  'śmietana': 7, 'ser': 14, 'masło': 21, 'warzywa liściaste': 3,
  'pomidor': 4, 'papryka': 4, 'ogórek': 4, 'ziemniaki': 20,
};

const categoryLabels: Record<string, string> = {
  zamrażarka: '🧊 Zamrażarka',
  mięso: '🥩 Mięso',
  przyprawy: '🧂 Przyprawy',
  gotowe: '🍳 Dania gotowe',
  nabiał: '🥛 Nabiał',
  warzywa: '🥦 Warzywa',
  suche: '🌾 Suche / Zapas',
  napoje: '🥤 Napoje / Woda',
  słodycze: '🍬 Słodycze',
  chemia: '🧴 Chemia domowa',
  higiena: '🪥 Higiena',
  apteczka: '💊 Apteczka',
  karma: '🐾 Karma',
  inne: '📦 Inne',
};

function getDaysLeft(item: Item): number | null {
  if (!item.purchase_date || !item.expiry_days) return null;
  const purchase = new Date(item.purchase_date);
  const expiry = new Date(purchase.getTime() + item.expiry_days * 86400000);
  const today = new Date();
  return Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function ExpiryBadge({ item }: { item: Item }) {
  const daysLeft = getDaysLeft(item);
  if (daysLeft === null) return null;
  if (daysLeft <= 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">PRZETERMINOWANE</span>;
  if (daysLeft <= 1) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Zostało {daysLeft}d ⚠️</span>;
  if (daysLeft <= 2) return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Zostało {daysLeft}d</span>;
  if (daysLeft <= 4) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Zostało {daysLeft}d</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">Zostało {daysLeft}d</span>;
}

export default function PantryClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const firstMatchRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [showScanner, setShowScanner] = useState(false);
  const [form, setForm] = useState<{ name: string; quantity: string; unit: string; category: string; purchase_date: string; expiry_days: string; protein_per_100g: number | null; fat_per_100g: number | null; carbs_per_100g: number | null; kcal_per_100g: number | null }>({ name: '', quantity: '', unit: 'szt', category: 'inne', purchase_date: '', expiry_days: '', protein_per_100g: null, fat_per_100g: null, carbs_per_100g: null, kcal_per_100g: null });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', quantity: '', unit: 'szt', category: 'inne', expiry_days: '' });
  const [isPending, startTransition] = useTransition();

  const filtered = search.trim()
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const grouped = filtered.reduce((acc, item) => {
    const cat = item.category || 'inne';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, Item[]>);

  useEffect(() => {
    if (search.trim() && firstMatchRef.current) {
      firstMatchRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [search]);

  const expiring = items.filter(i => {
    const d = getDaysLeft(i);
    return d !== null && d <= 3;
  }).sort((a, b) => (getDaysLeft(a) ?? 999) - (getDaysLeft(b) ?? 999));

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    startTransition(async () => {
      const result = await addPantryItem(form);
      if (result.item) {
        if (result.wasUpdated) {
          setItems(prev => prev.map(i => i.id === (result.item as Item).id ? result.item as Item : i));
        } else {
          setItems(prev => [...prev, result.item as Item]);
        }
        setForm({ name: '', quantity: '', unit: 'szt', category: 'inne', purchase_date: '', expiry_days: '', protein_per_100g: null, fat_per_100g: null, carbs_per_100g: null, kcal_per_100g: null });
        setShowForm(false);
      }
    });
  }

  function handleEditOpen(item: Item, scroll = false) {
    setEditId(item.id);
    setEditForm({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
      category: item.category,
      expiry_days: item.expiry_days ? String(item.expiry_days) : '',
    });
    if (scroll) {
      setTimeout(() => {
        itemRefs.current[item.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    startTransition(async () => {
      const result = await updatePantryItem(editId, editForm);
      if (result.item) {
        setItems(prev => prev.map(i => i.id === editId ? result.item as Item : i));
        setEditId(null);
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deletePantryItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
    });
  }

  function handleNameChange(name: string) {
    const lower = name.toLowerCase();
    const match = Object.entries(EXPIRY_DEFAULTS).find(([k]) => lower.includes(k));
    setForm(prev => ({
      ...prev,
      name,
      expiry_days: match ? String(match[1]) : prev.expiry_days,
    }));
  }

  function handleScanned({ name, category, protein_per_100g, fat_per_100g, carbs_per_100g, kcal_per_100g }: { name: string; category: string; protein_per_100g?: number | null; fat_per_100g?: number | null; carbs_per_100g?: number | null; kcal_per_100g?: number | null }) {
    setShowScanner(false);
    setForm(prev => ({
      ...prev,
      name,
      category,
      purchase_date: new Date().toISOString().split('T')[0],
      expiry_days: (() => {
        const lower = name.toLowerCase();
        const match = Object.entries(EXPIRY_DEFAULTS).find(([k]) => lower.includes(k));
        return match ? String(match[1]) : prev.expiry_days;
      })(),
      protein_per_100g: protein_per_100g ?? null,
      fat_per_100g: fat_per_100g ?? null,
      carbs_per_100g: carbs_per_100g ?? null,
      kcal_per_100g: kcal_per_100g ?? null,
    }));
    setShowForm(true);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {showScanner && (
        <BarcodeScanner onScan={handleScanned} onClose={() => setShowScanner(false)} />
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Spiżarnia</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{items.length} produktów w domu</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="px-3 py-2 bg-zinc-800 text-white rounded-lg text-sm font-medium hover:bg-zinc-700"
            title="Skanuj kod kreskowy"
          >
            📷 Skanuj
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            + Dodaj
          </button>
        </div>
      </div>

      <div className="relative mb-5">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Szukaj w spiżarni... (np. papryka)"
          className="w-full pl-9 pr-9 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white text-zinc-800"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Alerty */}
      {expiring.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-orange-800 mb-3">⚠️ Użyj wkrótce — kliknij żeby edytować</p>
          <div className="flex flex-wrap gap-2">
            {expiring.map(item => (
              <button
                key={item.id}
                onClick={() => handleEditOpen(item, true)}
                className="flex flex-col items-start gap-1 bg-white border border-orange-200 rounded-xl px-3 py-2.5 shadow-sm hover:border-orange-400 hover:shadow-md transition-all text-left active:scale-[0.98]"
              >
                <span className="text-sm font-semibold text-zinc-800">{item.name}</span>
                <div className="flex items-center gap-1.5">
                  <ExpiryBadge item={item} />
                  <span className="text-xs text-zinc-400">{item.quantity} {item.unit}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formularz */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl p-5 border border-zinc-200 mb-5">
          <p className="text-sm font-semibold text-zinc-700 mb-4">Nowy produkt</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1">
              <input
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Nazwa (np. Kurczak filet)"
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <input
                value={form.quantity}
                onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                placeholder="Ilość"
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <select
                value={form.unit}
                onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                className="px-2 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
              >
                {['szt', 'g', 'kg', 'ml', 'l', 'op'].map(u => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
            <select
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
            >
              {Object.entries(categoryLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input
              type="date"
              value={form.purchase_date}
              onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))}
              className="px-3 py-2 text-sm border border-zinc-200 rounded-lg"
            />
            <div className="flex gap-2 items-center">
              <input
                value={form.expiry_days}
                onChange={e => setForm(p => ({ ...p, expiry_days: e.target.value }))}
                placeholder="Wytrzyma (dni)"
                type="number"
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          {/* Nutrition preview (filled from barcode scan) */}
          {(form.kcal_per_100g != null || form.protein_per_100g != null) && (
            <div className="flex flex-wrap gap-2 mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <span className="text-xs text-emerald-700 font-medium w-full mb-1">Wartości odżywcze / 100g:</span>
              {form.kcal_per_100g != null && <span className="text-xs px-2 py-0.5 bg-white rounded-full border border-emerald-200 text-zinc-600">🔥 {Math.round(form.kcal_per_100g)} kcal</span>}
              {form.protein_per_100g != null && <span className="text-xs px-2 py-0.5 bg-white rounded-full border border-emerald-200 text-zinc-600">💪 {Math.round(form.protein_per_100g)}g białka</span>}
              {form.fat_per_100g != null && <span className="text-xs px-2 py-0.5 bg-white rounded-full border border-emerald-200 text-zinc-600">🥑 {Math.round(form.fat_per_100g)}g tłuszczu</span>}
              {form.carbs_per_100g != null && <span className="text-xs px-2 py-0.5 bg-white rounded-full border border-emerald-200 text-zinc-600">🌾 {Math.round(form.carbs_per_100g)}g węglowodanów</span>}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              Zapisz
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Anuluj
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {search.trim() && filtered.length === 0 && (
        <div className="bg-white rounded-xl p-6 border border-zinc-200 text-center mb-4">
          <p className="text-zinc-400 text-sm">Brak wyników dla <strong className="text-zinc-600">&ldquo;{search}&rdquo;</strong></p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-zinc-200 text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-zinc-500">Spiżarnia jest pusta</p>
          <p className="text-sm text-zinc-400 mt-1">Dodaj produkty żeby agent mógł je uwzględnić w odpowiedziach</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <p className="text-sm font-semibold text-zinc-600">{categoryLabels[cat] || cat}</p>
              </div>
              <div className="divide-y divide-zinc-100">
                {catItems.map(item => (
                  <div key={item.id} ref={el => {
                    itemRefs.current[item.id] = el;
                    if (search.trim() && item.id === filtered[0]?.id) (firstMatchRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                  }}>
                    {editId === item.id ? (
                      <form onSubmit={handleEditSave} className="px-4 py-3 bg-zinc-50">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input
                            value={editForm.name}
                            onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="Nazwa"
                            className="col-span-2 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                            required
                          />
                          <div className="flex gap-1">
                            <input
                              value={editForm.quantity}
                              onChange={e => setEditForm(p => ({ ...p, quantity: e.target.value }))}
                              placeholder="Ilość"
                              type="number"
                              step="any"
                              className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                            />
                            <select
                              value={editForm.unit}
                              onChange={e => setEditForm(p => ({ ...p, unit: e.target.value }))}
                              className="px-2 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white"
                            >
                              {['szt', 'g', 'kg', 'ml', 'l', 'op'].map(u => <option key={u}>{u}</option>)}
                            </select>
                          </div>
                          <select
                            value={editForm.category}
                            onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}
                            className="px-2 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white"
                          >
                            {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                          <input
                            value={editForm.expiry_days}
                            onChange={e => setEditForm(p => ({ ...p, expiry_days: e.target.value }))}
                            placeholder="Wytrzyma (dni)"
                            type="number"
                            className="col-span-2 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={isPending}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Zapisz
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditId(null)}
                            className="px-3 py-1.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100"
                          >
                            Anuluj
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditId(null); handleDelete(item.id); }}
                            className="ml-auto px-3 py-1.5 text-sm text-red-500 hover:text-red-700"
                          >
                            Usuń
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 transition-colors"
                        onClick={() => handleEditOpen(item)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-zinc-800"><Highlight text={item.name} query={search} /></span>
                            <ExpiryBadge item={item} />
                          </div>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {item.kcal_per_100g != null && <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-full">🔥{Math.round(item.kcal_per_100g)}</span>}
                            {item.protein_per_100g != null && <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">💪{Math.round(item.protein_per_100g)}g</span>}
                          </div>
                          {item.notes && <p className="text-xs text-zinc-400 mt-0.5">{item.notes}</p>}
                        </div>
                        <span className="text-sm text-zinc-500 shrink-0">
                          {item.quantity} {item.unit}
                        </span>
                        <span className="text-zinc-300 text-xs ml-1">✏️</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

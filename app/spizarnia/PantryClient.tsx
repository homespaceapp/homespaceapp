'use client';

import { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { addPantryItem, deletePantryItem } from './actions';

const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false });

type Item = { id: number; name: string; quantity: number; unit: string; category: string; purchase_date: string; expiry_days: number; notes: string };

const EXPIRY_DEFAULTS: Record<string, number> = {
  'kurczak': 2, 'mięso mielone': 1, 'karkówka': 2, 'wieprzowina': 2,
  'kiełbasa': 6, 'boczek': 6, 'jajka': 21, 'mleko': 5,
  'śmietana': 7, 'ser': 14, 'masło': 21, 'warzywa liściaste': 3,
  'pomidor': 4, 'papryka': 4, 'ogórek': 4, 'ziemniaki': 20,
};

const categoryLabels: Record<string, string> = {
  mięso: '🥩 Mięso',
  nabiał: '🥛 Nabiał',
  warzywa: '🥦 Warzywa',
  suche: '🌾 Suche / Zapas',
  napoje: '🥤 Napoje / Woda',
  słodycze: '🍬 Słodycze',
  inne: '📦 Inne',
};

function getDaysLeft(item: Item): number | null {
  if (!item.purchase_date || !item.expiry_days) return null;
  const purchase = new Date(item.purchase_date);
  const expiry = new Date(purchase.getTime() + item.expiry_days * 86400000);
  const today = new Date();
  return Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
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
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [form, setForm] = useState({ name: '', quantity: '', unit: 'szt', category: 'inne', purchase_date: '', expiry_days: '' });
  const [isPending, startTransition] = useTransition();

  const grouped = items.reduce((acc, item) => {
    const cat = item.category || 'inne';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, Item[]>);

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
        setItems(prev => [...prev, result.item as Item]);
        setForm({ name: '', quantity: '', unit: 'szt', category: 'inne', purchase_date: '', expiry_days: '' });
        setShowForm(false);
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

  function handleScanned({ name, category }: { name: string; category: string }) {
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

      {/* Alerty */}
      {expiring.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-orange-800 mb-2">⚠️ Użyj wkrótce</p>
          <div className="flex flex-col gap-1">
            {expiring.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <ExpiryBadge item={item} />
                <span className="text-orange-700 font-medium">{item.name}</span>
                <span className="text-orange-500">{item.quantity} {item.unit}</span>
              </div>
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
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-800">{item.name}</span>
                        <ExpiryBadge item={item} />
                      </div>
                      {item.notes && <p className="text-xs text-zinc-400 mt-0.5">{item.notes}</p>}
                    </div>
                    <span className="text-sm text-zinc-500 shrink-0">
                      {item.quantity} {item.unit}
                    </span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-zinc-300 hover:text-red-500 transition-colors text-sm ml-2"
                    >
                      ✕
                    </button>
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

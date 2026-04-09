'use client';
import { useState, useTransition } from 'react';
import { addWish, updateWish, deleteWish } from './actions';

type Wish = { id: string; name: string; category: string; price_estimate: number | null; priority: string; notes: string | null; owner: string; bought: boolean; created_at: string };
type FormState = { name: string; category: string; price_estimate: string; priority: string; notes: string; owner: string };

const CATEGORIES: Record<string, string> = {
  dom: '🏠 Dom & meble', elektronika: '💻 Elektronika', agd: '🍳 AGD', odzież: '👕 Odzież',
  rekreacja: '🎮 Rekreacja', zdrowie: '💊 Zdrowie & uroda', inne: '📦 Inne',
};
const PRIORITIES: Record<string, { label: string; color: string }> = {
  high:   { label: '🔴 Pilne',    color: 'bg-red-100 text-red-700 border-red-200' },
  normal: { label: '🟡 Normalne', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low:    { label: '🟢 Kiedyś',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};
const OWNERS: Record<string, string> = { adrian: 'Adrian', kasia: 'Kasia', oboje: 'Oboje' };

function emptyForm(): FormState {
  return { name: '', category: 'dom', price_estimate: '', priority: 'normal', notes: '', owner: 'oboje' };
}

function WishForm({ values, onChange, onSubmit, onCancel, isPending, title, onDelete }: {
  values: FormState; onChange: (v: FormState) => void; onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void; isPending: boolean; title: string; onDelete?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm">
      <p className="text-sm font-semibold text-zinc-700 mb-3">{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <input value={values.name} onChange={e => onChange({ ...values, name: e.target.value })} placeholder="Nazwa (np. Biurko, Głośniki)" required
          className="md:col-span-2 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        <select value={values.category} onChange={e => onChange({ ...values, category: e.target.value })}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white">
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input value={values.price_estimate} onChange={e => onChange({ ...values, price_estimate: e.target.value })}
          placeholder="Orientacyjna cena (zł)" type="number" step="0.01"
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        <select value={values.priority} onChange={e => onChange({ ...values, priority: e.target.value })}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white">
          {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={values.owner} onChange={e => onChange({ ...values, owner: e.target.value })}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white">
          {Object.entries(OWNERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input value={values.notes} onChange={e => onChange({ ...values, notes: e.target.value })} placeholder="Notatka (np. link, sklep)"
          className="md:col-span-2 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">Zapisz</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50">Anuluj</button>
        {onDelete && <button type="button" onClick={onDelete} className="ml-auto px-4 py-2 text-sm text-red-500 hover:text-red-700">Usuń</button>}
      </div>
    </form>
  );
}

export default function PlanowaneClient({ initialItems }: { initialItems: Wish[] }) {
  const [items, setItems] = useState(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [filterCat, setFilterCat] = useState<string>('all');
  const [isPending, startTransition] = useTransition();

  const active = items.filter(i => !i.bought);
  const bought = items.filter(i => i.bought);
  const filtered = filterCat === 'all' ? active : active.filter(i => i.category === filterCat);

  const totalEst = active.reduce((s, i) => s + (i.price_estimate || 0), 0);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await addWish(addForm);
      if (r) { setItems(prev => [r as Wish, ...prev]); setAddForm(emptyForm()); setShowForm(false); }
    });
  }
  function handleEditOpen(w: Wish) {
    setEditId(w.id);
    setEditForm({ name: w.name, category: w.category, price_estimate: w.price_estimate ? String(w.price_estimate) : '', priority: w.priority, notes: w.notes || '', owner: w.owner });
  }
  function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    startTransition(async () => {
      const r = await updateWish(editId, editForm);
      if (r) { setItems(prev => prev.map(i => i.id === editId ? r as Wish : i)); setEditId(null); }
    });
  }
  function handleToggleBought(w: Wish) {
    startTransition(async () => {
      const r = await updateWish(w.id, { bought: !w.bought });
      if (r) setItems(prev => prev.map(i => i.id === w.id ? r as Wish : i));
    });
  }
  function handleDelete(id: string) {
    startTransition(async () => { await deleteWish(id); setItems(prev => prev.filter(i => i.id !== id)); setEditId(null); });
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Planowane zakupy</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{active.length} rzeczy · szacunkowo {totalEst > 0 ? `${totalEst.toFixed(0)} zł` : 'bez cen'}</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setAddForm(emptyForm()); }} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">+ Dodaj</button>
      </div>

      {showForm && <div className="mb-5"><WishForm values={addForm} onChange={setAddForm} onSubmit={handleAdd} onCancel={() => setShowForm(false)} isPending={isPending} title="Nowy planowany zakup" /></div>}

      {/* Filtry kategorii */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        <button onClick={() => setFilterCat('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterCat === 'all' ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}>Wszystkie ({active.length})</button>
        {Object.entries(CATEGORIES).map(([k, v]) => {
          const cnt = active.filter(i => i.category === k).length;
          if (!cnt) return null;
          return <button key={k} onClick={() => setFilterCat(k)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterCat === k ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}>{v} ({cnt})</button>;
        })}
      </div>

      {filtered.length === 0 && active.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-zinc-200 text-center">
          <p className="text-4xl mb-3">🛍️</p><p className="text-zinc-500">Brak planowanych zakupów</p>
          <p className="text-sm text-zinc-400 mt-1">Dodaj meble, elektronikę, rzeczy do domu…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(w => (
            <div key={w.id}>
              {editId === w.id ? (
                <WishForm values={editForm} onChange={setEditForm} onSubmit={handleEditSave} onCancel={() => setEditId(null)} isPending={isPending} title="Edytuj" onDelete={() => handleDelete(w.id)} />
              ) : (
                <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm flex items-start gap-3 hover:border-emerald-400 hover:shadow-md transition-all">
                  <button onClick={() => handleToggleBought(w)} className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${w.bought ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300 hover:border-emerald-400'}`}>
                    {w.bought && <span className="text-xs">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEditOpen(w)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-zinc-800 text-sm">{w.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITIES[w.priority]?.color || ''}`}>{PRIORITIES[w.priority]?.label}</span>
                      {w.owner !== 'oboje' && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${w.owner === 'adrian' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>{OWNERS[w.owner]}</span>}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{CATEGORIES[w.category] || w.category}</p>
                    {w.notes && <p className="text-xs text-zinc-400 mt-0.5 truncate">{w.notes}</p>}
                  </div>
                  {w.price_estimate && <p className="text-sm font-semibold text-zinc-700 shrink-0">~{w.price_estimate.toFixed(0)} zł</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {bought.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">✓ Kupione ({bought.length})</p>
          <div className="flex flex-col gap-2">
            {bought.map(w => (
              <div key={w.id} className="bg-white rounded-xl p-3 border border-zinc-100 flex items-center gap-3 opacity-60">
                <button onClick={() => handleToggleBought(w)} className="w-5 h-5 rounded border-2 border-emerald-500 bg-emerald-500 text-white flex items-center justify-center shrink-0 text-xs">✓</button>
                <p className="text-sm text-zinc-500 line-through flex-1">{w.name}</p>
                <button onClick={() => handleDelete(w.id)} className="text-zinc-300 hover:text-red-400 text-xs">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useTransition, useRef } from 'react';

import {
  addExpense, updateExpense, deleteExpense,
  addBill, updateBill, deleteBill, toggleBillPaid,
} from './actions';

function SvgPie({ data, colors }: { data: { name: string; value: number }[]; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const R = 70; const r = 42; const cx = 90; const cy = 90;
  let angle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(angle); const y1 = cy + R * Math.sin(angle);
    angle += sweep;
    const x2 = cx + R * Math.cos(angle); const y2 = cy + R * Math.sin(angle);
    const xi1 = cx + r * Math.cos(angle - sweep); const yi1 = cy + r * Math.sin(angle - sweep);
    const xi2 = cx + r * Math.cos(angle); const yi2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    return { path: `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${large},0 ${xi1},${yi1} Z`, color: colors[i % colors.length] };
  });
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" className="shrink-0">
      {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2" />)}
    </svg>
  );
}

type Bill = { id: number; name: string; amount: number; due_day: number; category: string; daysLeft: number; paid: boolean };
type Expense = {
  id: number; date: string; category: string; amount: number;
  description: string; type: string; notes: string | null;
};

const EXPENSE_CATEGORIES = ['jedzenie', 'transport', 'rozrywka', 'zdrowie', 'rachunki', 'inne'];
const BILL_CATEGORIES = ['czynsz', 'media', 'internet', 'telefon', 'inne'];
const PIE_COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6', '#6b7280'];

const catColors: Record<string, string> = {
  jedzenie: 'bg-emerald-100 text-emerald-700',
  transport: 'bg-blue-100 text-blue-700',
  rozrywka: 'bg-purple-100 text-purple-700',
  zdrowie: 'bg-red-100 text-red-700',
  rachunki: 'bg-orange-100 text-orange-700',
  inne: 'bg-zinc-100 text-zinc-600',
};

function emptyExpenseForm(month: string) {
  return {
    date: `${month}-${new Date().getDate().toString().padStart(2, '0')}`,
    category: 'jedzenie',
    amount: '',
    description: '',
    type: 'wydatek',
    notes: '',
  };
}

function emptyBillForm() {
  return { name: '', amount: '', due_day: '10', category: 'czynsz' };
}

function BillInlineForm({ inlineForm, setInlineForm, isPending, onSave, onDelete, onCancel }: {
  inlineForm: ReturnType<typeof emptyBillForm>;
  setInlineForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyBillForm>>>;
  isPending: boolean;
  onSave: (e: React.FormEvent) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSave} className="px-4 py-3 bg-zinc-50 border-t border-zinc-200">
      <div className="flex flex-col gap-2">
        <input
          value={inlineForm.name}
          onChange={e => setInlineForm(p => ({ ...p, name: e.target.value }))}
          placeholder="Nazwa"
          className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white"
          required
        />
        <div className="flex gap-2">
          <input
            value={inlineForm.amount}
            onChange={e => setInlineForm(p => ({ ...p, amount: e.target.value }))}
            placeholder="Kwota"
            type="number"
            step="0.01"
            className="flex-1 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white"
            required
          />
          <input
            value={inlineForm.due_day}
            onChange={e => setInlineForm(p => ({ ...p, due_day: e.target.value }))}
            placeholder="Dzień"
            type="number"
            min="1"
            max="31"
            className="w-20 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white"
            required
          />
          <select
            value={inlineForm.category}
            onChange={e => setInlineForm(p => ({ ...p, category: e.target.value }))}
            className="px-2 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white"
          >
            {BILL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={isPending} className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">Zapisz</button>
          <button type="button" onClick={onDelete} className="px-3 py-1.5 text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100">Usuń</button>
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-100">Anuluj</button>
        </div>
      </div>
    </form>
  );
}

export default function BudzetClient({
  bills: initialBills,
  expenses: initialExpenses,
  totalBills,
  currentMonth,
}: {
  bills: Bill[];
  expenses: Expense[];
  totalBills: number;
  currentMonth: string;
}) {
  const [bills, setBills] = useState(initialBills);
  const [expenses, setExpenses] = useState(initialExpenses);

  // Expense form
  const [showExpForm, setShowExpForm] = useState(false);
  const [editExp, setEditExp] = useState<Expense | null>(null);
  const [expForm, setExpForm] = useState(emptyExpenseForm(currentMonth));

  // Bill form (top — tylko dla dodawania nowych)
  const [showBillForm, setShowBillForm] = useState(false);
  const [billForm, setBillForm] = useState(emptyBillForm());
  // Inline edit — który wiersz jest rozwinięty
  const [inlineEditId, setInlineEditId] = useState<number | null>(null);
  const [inlineForm, setInlineForm] = useState(emptyBillForm());

  // Month filter
  const [filterMonth, setFilterMonth] = useState(currentMonth);

  const [isPending, startTransition] = useTransition();
  const expFormRef = useRef<HTMLDivElement>(null);
  const billFormRef = useRef<HTMLDivElement>(null);

  const filteredExpenses = expenses.filter(e => e.date.startsWith(filterMonth));

  const totalIncome = filteredExpenses
    .filter(e => e.type === 'przychód')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalOutcome = filteredExpenses
    .filter(e => e.type === 'wydatek' || !e.type)
    .reduce((sum, e) => sum + e.amount, 0);

  // Ile zostaje po opłaceniu rachunków stałych
  const disponible = totalIncome - totalBills;

  // Pie chart data — wydatki per kategoria
  const catTotals = EXPENSE_CATEGORIES.map(cat => ({
    name: cat,
    value: filteredExpenses
      .filter(e => e.category === cat && (e.type === 'wydatek' || !e.type))
      .reduce((sum, e) => sum + e.amount, 0),
  })).filter(d => d.value > 0);

  // ─── Expense handlers ───────────────────────────────────────────────────────

  function openAddExp() {
    setEditExp(null);
    setExpForm(emptyExpenseForm(filterMonth));
    setShowExpForm(true);
    setTimeout(() => expFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }

  function openAddIncome() {
    setEditExp(null);
    setExpForm({ ...emptyExpenseForm(filterMonth), type: 'przychód' });
    setShowExpForm(true);
    setTimeout(() => expFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }

  function openEditExp(e: Expense) {
    setEditExp(e);
    setExpForm({ date: e.date, category: e.category, amount: String(e.amount), description: e.description, type: e.type || 'wydatek', notes: e.notes || '' });
    setShowExpForm(true);
  }

  function handleExpSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!expForm.amount) return;
    startTransition(async () => {
      if (editExp) {
        const result = await updateExpense(editExp.id, expForm);
        if (result.expense) {
          setExpenses(prev => prev.map(e => e.id === editExp.id ? result.expense as Expense : e));
        }
      } else {
        const result = await addExpense(expForm);
        if (result.expense) {
          setExpenses(prev => [result.expense as Expense, ...prev]);
        }
      }
      setShowExpForm(false);
      setEditExp(null);
    });
  }

  function handleDeleteExp(id: number) {
    startTransition(async () => {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    });
  }

  // ─── Bill handlers ───────────────────────────────────────────────────────────

  function openAddBill() {
    setBillForm(emptyBillForm());
    setShowBillForm(true);
    setInlineEditId(null);
    setTimeout(() => billFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }

  function openInlineEdit(b: Bill) {
    if (inlineEditId === b.id) { setInlineEditId(null); return; }
    setInlineEditId(b.id);
    setInlineForm({ name: b.name, amount: String(b.amount), due_day: String(b.due_day), category: b.category });
    setShowBillForm(false);
  }

  function handleBillSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!billForm.amount || !billForm.name) return;
    startTransition(async () => {
      const result = await addBill(billForm);
      if (result.bill) {
        const today = new Date().getDate();
        const dd = parseInt(billForm.due_day);
        setBills(prev => [...prev, {
          ...result.bill as Bill,
          paid: false,
          daysLeft: dd >= today ? dd - today : 30 - today + dd,
        }].sort((a, b) => a.due_day - b.due_day));
      }
      setShowBillForm(false);
    });
  }

  function handleInlineSave(ev: React.FormEvent, billId: number) {
    ev.preventDefault();
    if (!inlineForm.amount || !inlineForm.name) return;
    startTransition(async () => {
      const result = await updateBill(billId, inlineForm);
      if (result.bill) {
        const today = new Date().getDate();
        const dd = parseInt(inlineForm.due_day);
        setBills(prev => prev.map(b => b.id === billId ? {
          ...b, ...result.bill as Bill,
          daysLeft: dd >= today ? dd - today : 30 - today + dd,
        } : b));
      }
      setInlineEditId(null);
    });
  }

  function handleDeleteBill(id: number) {
    startTransition(async () => {
      await deleteBill(id);
      setBills(prev => prev.filter(b => b.id !== id));
    });
  }

  function handleTogglePaid(id: number) {
    startTransition(async () => {
      const result = await toggleBillPaid(id, currentMonth);
      setBills(prev => prev.map(b => b.id === id ? { ...b, paid: result.paid } : b));
    });
  }

  const urgentBills = bills.filter(b => b.daysLeft <= 5 && !b.paid);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Budżet i finanse</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {new Date(filterMonth + '-01').toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            onClick={openAddExp}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            + Wpis
          </button>
        </div>
      </div>

      {/* Wiersz: Przychody + Koszty stałe */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={openAddIncome}
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left hover:bg-emerald-100 active:bg-emerald-200 transition-colors"
        >
          <p className="text-xs text-emerald-600 uppercase tracking-wide font-medium mb-1">Przychody</p>
          <p className="text-2xl font-bold text-emerald-700">{totalIncome} zł</p>
          <p className="text-xs text-emerald-500 mt-1">+ dodaj przychód</p>
        </button>
        <button
          onClick={openAddBill}
          className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-left hover:bg-orange-100 active:bg-orange-200 transition-colors"
        >
          <p className="text-xs text-orange-600 uppercase tracking-wide font-medium mb-1">Koszty stałe</p>
          <p className="text-2xl font-bold text-orange-700">{totalBills} zł</p>
          <p className="text-xs text-orange-500 mt-1">miesięcznie · + dodaj</p>
        </button>
      </div>

      {/* Główny kafelek: Zostało */}
      {(() => {
        const budget = disponible; // Przychody - Koszty stałe
        const spent = totalOutcome;
        const left = budget - spent;
        const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
        const danger = left < 0;
        const warning = !danger && pct >= 70;
        return (
          <button
            onClick={openAddExp}
            className="w-full text-left bg-white border border-zinc-200 rounded-xl p-5 mb-6 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium mb-1">Zostało w tym miesiącu</p>
                <p className={`text-3xl font-bold ${danger ? 'text-red-600' : warning ? 'text-orange-600' : 'text-zinc-800'}`}>
                  {left} zł
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  budżet {budget} zł · wydano {spent} zł
                </p>
              </div>
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shrink-0 mt-1">
                + dodaj wydatek
              </span>
            </div>
            {/* Pasek postępu */}
            {budget > 0 && (
              <div className="w-full bg-zinc-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${danger ? 'bg-red-500' : warning ? 'bg-orange-400' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            )}
            {budget > 0 && (
              <p className={`text-xs mt-1.5 font-medium ${danger ? 'text-red-500' : warning ? 'text-orange-500' : 'text-zinc-400'}`}>
                {pct}% budżetu wydane
              </p>
            )}
          </button>
        );
      })()}

      {/* Alert rachunki */}
      {urgentBills.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-orange-800 mb-2">💳 Płatności w ciągu 5 dni</p>
          {urgentBills.map(b => (
            <div key={b.id} className="flex items-center justify-between text-sm py-1">
              <span className="text-orange-700 font-medium">{b.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-orange-600">{b.amount} zł</span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  {b.daysLeft === 0 ? 'DZIŚ!' : `za ${b.daysLeft} dni`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Wykres kołowy */}
      {catTotals.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-5">
          <p className="text-sm font-semibold text-zinc-700 mb-3">Podział wydatków</p>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <SvgPie data={catTotals} colors={PIE_COLORS} />
            <div className="flex-1 flex flex-col gap-1.5 w-full">
              {catTotals.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="flex-1 text-zinc-700 capitalize">{d.name}</span>
                  <span className="font-semibold text-zinc-800">{d.value} zł</span>
                  <span className="text-xs text-zinc-400 w-8 text-right">
                    {totalOutcome > 0 ? `${Math.round(d.value / totalOutcome * 100)}%` : ''}
                  </span>
                </div>
              ))}
              {totalIncome > 0 && (
                <div className="flex items-center gap-2 text-sm mt-2 pt-2 border-t border-zinc-100">
                  <span className="w-3 h-3 rounded-full shrink-0 bg-emerald-500" />
                  <span className="flex-1 text-zinc-700">Przychody</span>
                  <span className="font-semibold text-emerald-600">{totalIncome} zł</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Rachunki cykliczne */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-700">Koszty stałe</p>
            <button
              onClick={openAddBill}
              className="text-xs px-2 py-1 bg-zinc-200 hover:bg-zinc-300 rounded text-zinc-700"
            >
              + Dodaj
            </button>
          </div>

          <div ref={billFormRef} />
          {showBillForm && (
            <form onSubmit={handleBillSubmit} className="p-4 border-b border-zinc-100 bg-zinc-50">
              <p className="text-xs font-semibold text-zinc-500 mb-2">Nowy rachunek cykliczny</p>
              <div className="flex flex-col gap-2">
                <input
                  value={billForm.name}
                  onChange={e => setBillForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nazwa (np. Czynsz)"
                  className="px-3 py-2 text-sm border border-zinc-200 rounded-lg"
                  required
                />
                <div className="flex gap-2">
                  <input
                    value={billForm.amount}
                    onChange={e => setBillForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="Kwota"
                    type="number"
                    step="0.01"
                    className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg"
                    required
                  />
                  <input
                    value={billForm.due_day}
                    onChange={e => setBillForm(p => ({ ...p, due_day: e.target.value }))}
                    placeholder="Dzień płatności"
                    type="number"
                    min="1"
                    max="31"
                    className="w-28 px-3 py-2 text-sm border border-zinc-200 rounded-lg"
                    required
                  />
                  <select
                    value={billForm.category}
                    onChange={e => setBillForm(p => ({ ...p, category: e.target.value }))}
                    className="px-2 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
                  >
                    {BILL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={isPending} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">Dodaj</button>
                  <button type="button" onClick={() => setShowBillForm(false)} className="px-3 py-2 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-100">Anuluj</button>
                </div>
              </div>
            </form>
          )}

          {(() => {
            const unpaid = bills.filter(b => !b.paid);
            const paid = bills.filter(b => b.paid);

            return (
              <div className="divide-y divide-zinc-100">
                {unpaid.map(b => (
                  <div key={b.id}>
                    {inlineEditId === b.id ? (
                      <BillInlineForm inlineForm={inlineForm} setInlineForm={setInlineForm} isPending={isPending} onSave={e => handleInlineSave(e, b.id)} onDelete={() => { if (confirm(`Usuń "${b.name}"?`)) { handleDeleteBill(b.id); setInlineEditId(null); } }} onCancel={() => setInlineEditId(null)} />
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 cursor-pointer transition-colors" onClick={() => openInlineEdit(b)}>
                        <button
                          onClick={e => { e.stopPropagation(); handleTogglePaid(b.id); }}
                          className="w-5 h-5 rounded border-2 border-zinc-300 shrink-0 flex items-center justify-center hover:border-emerald-400 transition-colors"
                        />
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-zinc-800">{b.name}</p>
                            <p className="text-xs text-zinc-400">{b.due_day}. każdego miesiąca</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-700">{b.amount} zł</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              b.daysLeft <= 3 ? 'bg-red-100 text-red-700' :
                              b.daysLeft <= 7 ? 'bg-orange-100 text-orange-700' :
                              'bg-zinc-100 text-zinc-500'
                            }`}>
                              {b.daysLeft === 0 ? 'dziś' : `${b.daysLeft}d`}
                            </span>
                            <span className="text-zinc-300 text-xs">✏️</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {paid.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 bg-emerald-50">
                      <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">✓ Zapłacone w tym miesiącu</p>
                    </div>
                    {paid.map(b => (
                      <div key={b.id}>
                        {inlineEditId === b.id ? (
                          <BillInlineForm inlineForm={inlineForm} setInlineForm={setInlineForm} isPending={isPending} onSave={e => handleInlineSave(e, b.id)} onDelete={() => { if (confirm(`Usuń "${b.name}"?`)) { handleDeleteBill(b.id); setInlineEditId(null); } }} onCancel={() => setInlineEditId(null)} />
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 cursor-pointer transition-colors" onClick={() => openInlineEdit(b)}>
                            <button
                              onClick={e => { e.stopPropagation(); handleTogglePaid(b.id); }}
                              className="w-5 h-5 rounded border-2 bg-emerald-500 border-emerald-500 text-white shrink-0 flex items-center justify-center"
                            >
                              <span className="text-[10px] font-bold">✓</span>
                            </button>
                            <div className="flex-1 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-zinc-400 line-through">{b.name}</p>
                                <p className="text-xs text-zinc-400">{b.due_day}. każdego miesiąca</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-emerald-600">{b.amount} zł</span>
                                <span className="text-zinc-300 text-xs">✏️</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })()}
        </div>

        {/* Wpisy budżetowe */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-700">Koszty zmienne</p>
            <button
              onClick={openAddExp}
              className="text-xs px-2 py-1 bg-zinc-200 hover:bg-zinc-300 rounded text-zinc-700"
            >
              + Dodaj
            </button>
          </div>

          <div ref={expFormRef} />
          {showExpForm && (
            <form onSubmit={handleExpSubmit} className="p-4 border-b border-zinc-100 bg-zinc-50">
              <p className="text-xs font-semibold text-zinc-500 mb-2">{editExp ? 'Edytuj wpis' : 'Nowy wpis'}</p>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <select
                    value={expForm.type}
                    onChange={e => setExpForm(p => ({ ...p, type: e.target.value }))}
                    className={`px-2 py-2 text-sm border rounded-lg bg-white ${
                      expForm.type === 'przychód' ? 'border-emerald-300 text-emerald-700' : 'border-red-300 text-red-700'
                    }`}
                  >
                    <option value="wydatek">📉 Wydatek</option>
                    <option value="przychód">📈 Przychód</option>
                  </select>
                  <input
                    type="date"
                    value={expForm.date}
                    onChange={e => setExpForm(p => ({ ...p, date: e.target.value }))}
                    className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    value={expForm.description}
                    onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Opis (np. Biedronka)"
                    className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    value={expForm.amount}
                    onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="Kwota"
                    type="number"
                    step="0.01"
                    className="w-24 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <select
                  value={expForm.category}
                  onChange={e => setExpForm(p => ({ ...p, category: e.target.value }))}
                  className="px-2 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
                >
                  {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {editExp ? 'Zapisz' : 'Dodaj'}
                  </button>
                  {editExp && (
                    <button
                      type="button"
                      onClick={() => { handleDeleteExp(editExp.id); setShowExpForm(false); setEditExp(null); }}
                      className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      Usuń
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setShowExpForm(false); setEditExp(null); }}
                    className="px-3 py-2 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-100"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
            {filteredExpenses.length === 0 ? (
              <p className="text-sm text-zinc-400 px-4 py-6 text-center">Brak wpisów w tym miesiącu</p>
            ) : (
              filteredExpenses.map(e => (
                <div
                  key={e.id}
                  onClick={() => openEditExp(e)}
                  className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-zinc-50 active:bg-zinc-100"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${catColors[e.category] || catColors.inne}`}>
                        {e.category}
                      </span>
                      <span className="text-sm text-zinc-700">{e.description || '—'}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{e.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${e.type === 'przychód' ? 'text-emerald-600' : 'text-zinc-800'}`}>
                      {e.type === 'przychód' ? '+' : ''}{e.amount} zł
                    </span>
                    <span className="text-zinc-300 text-xs">›</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

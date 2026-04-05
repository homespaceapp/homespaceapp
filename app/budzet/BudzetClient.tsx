'use client';

import { useState, useTransition } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  addExpense, updateExpense, deleteExpense,
  addBill, updateBill, deleteBill,
} from './actions';

type Bill = { id: number; name: string; amount: number; due_day: number; category: string; daysLeft: number };
type Expense = {
  id: number; date: string; category: string; amount: number;
  description: string; type: string; notes: string | null;
};

const FOOD_BUDGET = 220;
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

export default function BudzetClient({
  bills: initialBills,
  expenses: initialExpenses,
  totalBills,
  totalExpenses: initialTotalExpenses,
  currentMonth,
}: {
  bills: Bill[];
  expenses: Expense[];
  totalBills: number;
  totalExpenses: number;
  currentMonth: string;
}) {
  const [bills, setBills] = useState(initialBills);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [totalExpenses, setTotalExpenses] = useState(initialTotalExpenses);

  // Expense form
  const [showExpForm, setShowExpForm] = useState(false);
  const [editExp, setEditExp] = useState<Expense | null>(null);
  const [expForm, setExpForm] = useState(emptyExpenseForm(currentMonth));

  // Bill form
  const [showBillForm, setShowBillForm] = useState(false);
  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [billForm, setBillForm] = useState(emptyBillForm());

  // Month filter
  const [filterMonth, setFilterMonth] = useState(currentMonth);

  const [isPending, startTransition] = useTransition();

  const filteredExpenses = expenses.filter(e => e.date.startsWith(filterMonth));

  const foodExpenses = filteredExpenses
    .filter(e => e.category === 'jedzenie' && (e.type === 'wydatek' || !e.type))
    .reduce((sum, e) => sum + e.amount, 0);

  const totalIncome = filteredExpenses
    .filter(e => e.type === 'przychód')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalOutcome = filteredExpenses
    .filter(e => e.type === 'wydatek' || !e.type)
    .reduce((sum, e) => sum + e.amount, 0);

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
          recalcTotal();
        }
      } else {
        const result = await addExpense(expForm);
        if (result.expense) {
          setExpenses(prev => [result.expense as Expense, ...prev]);
          if (result.expense.type === 'wydatek' || !result.expense.type) {
            setTotalExpenses(prev => prev + (result.expense as Expense).amount);
          }
        }
      }
      setShowExpForm(false);
      setEditExp(null);
    });
  }

  function recalcTotal() {
    setTotalExpenses(
      expenses.filter(e => e.type === 'wydatek' || !e.type).reduce((sum, e) => sum + e.amount, 0)
    );
  }

  function handleDeleteExp(id: number, amount: number, type: string) {
    startTransition(async () => {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      if (type === 'wydatek' || !type) setTotalExpenses(prev => prev - amount);
    });
  }

  // ─── Bill handlers ───────────────────────────────────────────────────────────

  function openAddBill() {
    setEditBill(null);
    setBillForm(emptyBillForm());
    setShowBillForm(true);
  }

  function openEditBill(b: Bill) {
    setEditBill(b);
    setBillForm({ name: b.name, amount: String(b.amount), due_day: String(b.due_day), category: b.category });
    setShowBillForm(true);
  }

  function handleBillSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!billForm.amount || !billForm.name) return;
    startTransition(async () => {
      if (editBill) {
        const result = await updateBill(editBill.id, billForm);
        if (result.bill) {
          const today = new Date().getDate();
          const dd = parseInt(billForm.due_day);
          setBills(prev => prev.map(b => b.id === editBill.id ? {
            ...result.bill as Bill,
            daysLeft: dd >= today ? dd - today : 30 - today + dd,
          } : b));
        }
      } else {
        const result = await addBill(billForm);
        if (result.bill) {
          const today = new Date().getDate();
          const dd = parseInt(billForm.due_day);
          setBills(prev => [...prev, {
            ...result.bill as Bill,
            daysLeft: dd >= today ? dd - today : 30 - today + dd,
          }].sort((a, b) => a.due_day - b.due_day));
        }
      }
      setShowBillForm(false);
      setEditBill(null);
    });
  }

  function handleDeleteBill(id: number) {
    startTransition(async () => {
      await deleteBill(id);
      setBills(prev => prev.filter(b => b.id !== id));
    });
  }

  const urgentBills = bills.filter(b => b.daysLeft <= 5);

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

      {/* Karty podsumowania */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-zinc-200">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Rachunki</p>
          <p className="text-xl font-bold text-zinc-800">{totalBills} zł</p>
          <p className="text-xs text-zinc-400 mt-1">miesięcznie</p>
        </div>
        <div className={`bg-white rounded-xl p-4 border ${foodExpenses > FOOD_BUDGET ? 'border-red-300 bg-red-50' : 'border-zinc-200'}`}>
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Jedzenie</p>
          <p className={`text-xl font-bold ${foodExpenses > FOOD_BUDGET ? 'text-red-600' : 'text-zinc-800'}`}>{foodExpenses} zł</p>
          <p className="text-xs text-zinc-400 mt-1">budżet: {FOOD_BUDGET} zł</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-zinc-200">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Wydatki</p>
          <p className="text-xl font-bold text-red-600">{totalOutcome} zł</p>
          <p className="text-xs text-zinc-400 mt-1">w tym miesiącu</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-zinc-200">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Przychody</p>
          <p className="text-xl font-bold text-emerald-600">{totalIncome} zł</p>
          <p className={`text-xs mt-1 font-medium ${totalIncome - totalOutcome >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            saldo: {totalIncome - totalOutcome >= 0 ? '+' : ''}{totalIncome - totalOutcome} zł
          </p>
        </div>
      </div>

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
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-full md:w-72 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={catTotals}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {catTotals.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} zł`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {catTotals.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="flex-1 text-zinc-700 capitalize">{d.name}</span>
                  <span className="font-semibold text-zinc-800">{d.value} zł</span>
                  <span className="text-xs text-zinc-400">
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
            <p className="text-sm font-semibold text-zinc-700">Rachunki cykliczne</p>
            <button
              onClick={openAddBill}
              className="text-xs px-2 py-1 bg-zinc-200 hover:bg-zinc-300 rounded text-zinc-700"
            >
              + Dodaj
            </button>
          </div>

          {showBillForm && (
            <form onSubmit={handleBillSubmit} className="p-4 border-b border-zinc-100 bg-zinc-50">
              <p className="text-xs font-semibold text-zinc-500 mb-2">{editBill ? 'Edytuj rachunek' : 'Nowy rachunek'}</p>
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
                    placeholder="Dzień (1-31)"
                    type="number"
                    min="1"
                    max="31"
                    className="w-24 px-3 py-2 text-sm border border-zinc-200 rounded-lg"
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
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {editBill ? 'Zapisz' : 'Dodaj'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowBillForm(false); setEditBill(null); }}
                    className="px-3 py-2 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-100"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="divide-y divide-zinc-100">
            {bills.map(b => (
              <div key={b.id} className="flex items-center justify-between px-4 py-3 group">
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
                  <button
                    onClick={() => openEditBill(b)}
                    className="text-zinc-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all text-xs"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => { if (confirm(`Usuń "${b.name}"?`)) handleDeleteBill(b.id); }}
                    className="text-zinc-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wpisy budżetowe */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-700">Wpisy</p>
            <button
              onClick={openAddExp}
              className="text-xs px-2 py-1 bg-zinc-200 hover:bg-zinc-300 rounded text-zinc-700"
            >
              + Dodaj
            </button>
          </div>

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
                <div key={e.id} className="flex items-center justify-between px-4 py-2.5 group">
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
                    <button
                      onClick={() => openEditExp(e)}
                      className="text-zinc-200 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all text-xs"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteExp(e.id, e.amount, e.type)}
                      className="text-zinc-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      ✕
                    </button>
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

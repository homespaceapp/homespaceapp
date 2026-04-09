import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

const categoryLabels: Record<string, string> = {
  jedzenie: '🍽️ Jedzenie',
  transport: '🚗 Transport',
  rozrywka: '🎬 Rozrywka',
  chemia: '🧴 Chemia',
  ubrania: '👕 Ubrania',
  zdrowie: '💊 Zdrowie',
  inne: '📦 Inne',
};

const categoryColors: Record<string, string> = {
  jedzenie: 'bg-emerald-400',
  transport: 'bg-blue-400',
  rozrywka: 'bg-purple-400',
  chemia: 'bg-orange-400',
  ubrania: 'bg-pink-400',
  zdrowie: 'bg-red-400',
  inne: 'bg-zinc-400',
};

function getMonthRange(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  const y = d.getFullYear();
  const m = d.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
  const label = d.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  return { from, to, label };
}

export default async function StatystykiPage() {
  const months = [0, 1, 2].map(getMonthRange);

  const { data: allExpenses } = await supabase
    .from('expenses')
    .select('*')
    .gte('date', months[2].from)
    .order('date', { ascending: false });

  const { data: bills } = await supabase
    .from('bills')
    .select('*')
    .eq('active', true);

  const expenses = allExpenses || [];

  // Grupowanie per miesiąc
  const byMonth = months.map(m => {
    const items = expenses.filter(e => e.date >= m.from && e.date <= m.to);
    const total = items.reduce((s, e) => s + (e.amount || 0), 0);
    const byCat = items.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
      return acc;
    }, {} as Record<string, number>);
    return { ...m, total, byCat, items };
  });

  const currentMonth = byMonth[0];
  const maxBar = Math.max(...Object.values(currentMonth.byCat), 1);

  const billsTotal = (bills || []).reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Statystyki</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Przegląd wydatków i rachunków</p>
      </div>

      {/* Bieżący miesiąc — podsumowanie */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm col-span-2 md:col-span-2">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Wydatki — {currentMonth.label}</p>
          <p className="text-3xl font-bold text-zinc-800">{currentMonth.total.toFixed(0)} zł</p>
          <p className="text-xs text-zinc-400 mt-1">{currentMonth.items.length} transakcji</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Rachunki</p>
          <p className="text-2xl font-bold text-orange-600">{billsTotal} zł</p>
          <p className="text-xs text-zinc-400 mt-1">stałe/miesiąc</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Razem</p>
          <p className="text-2xl font-bold text-zinc-800">{(currentMonth.total + billsTotal).toFixed(0)} zł</p>
          <p className="text-xs text-zinc-400 mt-1">wydatki + rachunki</p>
        </div>
      </div>

      {/* Wykres kategorii — bieżący miesiąc */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm mb-6">
        <p className="text-sm font-semibold text-zinc-700 mb-4">Wydatki wg kategorii — {currentMonth.label}</p>
        {Object.keys(currentMonth.byCat).length === 0 ? (
          <p className="text-sm text-zinc-400">Brak wydatków w tym miesiącu</p>
        ) : (
          <div className="flex flex-col gap-3">
            {Object.entries(currentMonth.byCat)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amt]) => (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-600 font-medium">{categoryLabels[cat] || cat}</span>
                    <span className="text-zinc-500">{amt.toFixed(0)} zł</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${categoryColors[cat] || 'bg-zinc-400'}`}
                      style={{ width: `${(amt / maxBar) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Porównanie 3 miesięcy */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm mb-6">
        <p className="text-sm font-semibold text-zinc-700 mb-4">Ostatnie 3 miesiące</p>
        <div className="grid grid-cols-3 gap-4">
          {byMonth.map((m, i) => (
            <div key={i} className="text-center">
              <div
                className="mx-auto mb-2 rounded-t-lg bg-emerald-400"
                style={{
                  height: `${Math.max(8, (m.total / Math.max(...byMonth.map(x => x.total), 1)) * 80)}px`,
                  width: '100%',
                  maxWidth: '60px',
                  opacity: i === 0 ? 1 : i === 1 ? 0.7 : 0.4,
                }}
              />
              <p className="text-xs font-semibold text-zinc-700">{m.total.toFixed(0)} zł</p>
              <p className="text-xs text-zinc-400 capitalize">{m.label.split(' ')[0]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rachunki stałe */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm">
        <p className="text-sm font-semibold text-zinc-700 mb-3">Rachunki stałe</p>
        <div className="flex flex-col divide-y divide-zinc-100">
          {(bills || []).map((b, i) => (
            <div key={i} className="flex justify-between items-center py-2.5 text-sm">
              <span className="text-zinc-700">{b.name}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-zinc-400">{b.due_day}. każdego miesiąca</span>
                <span className="font-semibold text-zinc-800">{b.amount} zł</span>
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center py-2.5 text-sm font-semibold">
            <span className="text-zinc-800">Razem</span>
            <span className="text-orange-600">{billsTotal} zł</span>
          </div>
        </div>
      </div>
    </div>
  );
}

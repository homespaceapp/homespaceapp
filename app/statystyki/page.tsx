import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

const catLabels: Record<string, string> = {
  jedzenie: '🍽️ Jedzenie', transport: '🚗 Transport', rozrywka: '🎬 Rozrywka',
  chemia: '🧴 Chemia', ubrania: '👕 Ubrania', zdrowie: '💊 Zdrowie', inne: '📦 Inne',
};
const catColors: Record<string, string> = {
  jedzenie: 'bg-emerald-400', transport: 'bg-blue-400', rozrywka: 'bg-purple-400',
  chemia: 'bg-orange-400', ubrania: 'bg-pink-400', zdrowie: 'bg-red-400', inne: 'bg-zinc-400',
};
const pantryCategories: Record<string, string> = {
  zamrażarka: '🧊', mięso: '🥩', przyprawy: '🧂', gotowe: '🍳', nabiał: '🥛',
  warzywa: '🥦', suche: '🌾', napoje: '🥤', słodycze: '🍬', chemia: '🧴',
  higiena: '🪥', apteczka: '💊', karma: '🐾', inne: '📦',
};

function getMonthRange(offset = 0) {
  const d = new Date(); d.setMonth(d.getMonth() - offset);
  const y = d.getFullYear(); const m = d.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
  const label = d.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  const short = d.toLocaleDateString('pl-PL', { month: 'short' });
  return { from, to, label, short };
}

export default async function StatystykiPage() {
  const months = [0, 1, 2, 3, 4, 5].map(getMonthRange);

  const [{ data: allExpenses }, { data: bills }, { data: pantry }] = await Promise.all([
    supabase.from('expenses').select('*').gte('date', months[5].from).order('date', { ascending: false }),
    supabase.from('bills').select('*').eq('active', true),
    supabase.from('pantry').select('*'),
  ]);

  const expenses = allExpenses || [];
  const billsTotal = (bills || []).reduce((s: number, b: { amount?: number }) => s + (b.amount || 0), 0);
  const pantryItems = pantry || [];

  // Dane per miesiąc
  const byMonth = months.map(m => {
    const items = expenses.filter(e => e.date >= m.from && e.date <= m.to && (e.type === 'wydatek' || !e.type));
    const income = expenses.filter(e => e.date >= m.from && e.date <= m.to && e.type === 'przychód').reduce((s: number, e: { amount?: number }) => s + (e.amount || 0), 0);
    const total: number = items.reduce((s: number, e: { amount?: number }) => s + (e.amount || 0), 0);
    const byCat = items.reduce((acc: Record<string, number>, e: { category: string; amount?: number }) => {
      acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
      return acc;
    }, {} as Record<string, number>);
    return { ...m, total, income, byCat, count: items.length };
  });

  const current = byMonth[0];
  const prev = byMonth[1];
  const diff = current.total - prev.total;
  const diffPct = prev.total > 0 ? Math.round((diff / prev.total) * 100) : 0;

  const maxBar = Math.max(...(Object.values(current.byCat) as number[]), 1);
  const maxMonthBar = Math.max(...byMonth.map(m => m.total as number), 1);

  // Spiżarnia — rotacja i stany
  const today = new Date();
  const pantryStats = {
    total: pantryItems.length,
    expiringSoon: pantryItems.filter((p: { purchase_date?: string; expiry_days?: number }) => {
      if (!p.purchase_date || !p.expiry_days) return false;
      const expiry = new Date(new Date(p.purchase_date).getTime() + p.expiry_days * 86400000);
      return Math.ceil((expiry.getTime() - today.getTime()) / 86400000) <= 3;
    }).length,
    expired: pantryItems.filter((p: { purchase_date?: string; expiry_days?: number }) => {
      if (!p.purchase_date || !p.expiry_days) return false;
      const expiry = new Date(new Date(p.purchase_date).getTime() + p.expiry_days * 86400000);
      return expiry < today;
    }).length,
    byCategory: pantryItems.reduce((acc: Record<string, number>, p: { category?: string }) => {
      const cat = p.category || 'inne';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    avgExpiryDays: (() => {
      const valid = pantryItems.filter((p: { purchase_date?: string; expiry_days?: number }) => p.purchase_date && p.expiry_days);
      if (!valid.length) return null;
      const avg = valid.reduce((s: number, p: { purchase_date: string; expiry_days: number }) => {
        const expiry = new Date(new Date(p.purchase_date).getTime() + p.expiry_days * 86400000);
        return s + Math.max(0, Math.ceil((expiry.getTime() - today.getTime()) / 86400000));
      }, 0) / valid.length;
      return Math.round(avg);
    })(),
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Statystyki</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Finanse, spiżarnia, trendy miesięczne</p>
      </div>

      {/* ── Kafelki summary ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm col-span-2">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Wydatki — {current.label}</p>
          <p className="text-3xl font-bold text-zinc-800">{current.total.toFixed(0)} zł</p>
          <p className={`text-xs mt-1 font-medium ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-emerald-600' : 'text-zinc-400'}`}>
            {diff > 0 ? `▲ +${diff.toFixed(0)} zł` : diff < 0 ? `▼ ${diff.toFixed(0)} zł` : '→ bez zmian'} vs poprzedni miesiąc ({diffPct > 0 ? '+' : ''}{diffPct}%)
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Rachunki</p>
          <p className="text-2xl font-bold text-orange-600">{billsTotal} zł</p>
          <p className="text-xs text-zinc-400 mt-1">{(bills || []).length} stałych</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Razem</p>
          <p className="text-2xl font-bold text-zinc-800">{(current.total + billsTotal).toFixed(0)} zł</p>
          <p className="text-xs text-zinc-400 mt-1">wydatki + rachunki</p>
        </div>
      </div>

      {/* ── Trend 6 miesięcy ── */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm mb-5">
        <p className="text-sm font-semibold text-zinc-700 mb-4">Trend wydatków — ostatnie 6 miesięcy</p>
        <div className="flex items-end gap-2 h-24">
          {[...byMonth].reverse().map((m, i) => {
            const pct = maxMonthBar > 0 ? (m.total / maxMonthBar) * 100 : 0;
            const isLatest = i === byMonth.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-[10px] text-zinc-500 font-medium">{m.total > 0 ? `${m.total.toFixed(0)}` : ''}</p>
                <div className="w-full rounded-t-md" style={{ height: `${Math.max(4, pct * 0.7)}px`, backgroundColor: isLatest ? '#10b981' : '#d1fae5' }} />
                <p className="text-[9px] text-zinc-400 capitalize">{m.short}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Kategorie bieżący miesiąc ── */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm mb-5">
        <p className="text-sm font-semibold text-zinc-700 mb-4">Kategorie — {current.label}</p>
        {Object.keys(current.byCat).length === 0 ? (
          <p className="text-sm text-zinc-400">Brak wydatków w tym miesiącu</p>
        ) : (
          <div className="flex flex-col gap-3">
            {(Object.entries(current.byCat) as [string, number][])
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amt]) => (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-600 font-medium">{catLabels[cat] || cat}</span>
                    <span className="text-zinc-500">{amt.toFixed(0)} zł ({Math.round((amt / current.total) * 100)}%)</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${catColors[cat] || 'bg-zinc-400'}`} style={{ width: `${(amt / maxBar) * 100}%` }} />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── Porównanie kategorii miesiąc-do-miesiąca ── */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm mb-5">
        <p className="text-sm font-semibold text-zinc-700 mb-3">Porównanie kategorii M/M</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-400">
                <th className="text-left pb-2 font-medium">Kategoria</th>
                {byMonth.slice(0, 3).map(m => (
                  <th key={m.from} className="text-right pb-2 font-medium capitalize">{m.short}</th>
                ))}
                <th className="text-right pb-2 font-medium text-zinc-500">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {Object.keys({ ...byMonth[0].byCat, ...byMonth[1].byCat, ...byMonth[2].byCat }).map(cat => {
                const vals = byMonth.slice(0, 3).map(m => (m.byCat as Record<string, number>)[cat] || 0);
                const delta = vals[0] - vals[1];
                return (
                  <tr key={cat}>
                    <td className="py-1.5 text-zinc-600">{catLabels[cat] || cat}</td>
                    {vals.map((v, i) => (
                      <td key={i} className="py-1.5 text-right text-zinc-700">{v > 0 ? `${v.toFixed(0)} zł` : '—'}</td>
                    ))}
                    <td className={`py-1.5 text-right font-semibold ${delta > 0 ? 'text-red-500' : delta < 0 ? 'text-emerald-600' : 'text-zinc-400'}`}>
                      {delta !== 0 ? `${delta > 0 ? '+' : ''}${delta.toFixed(0)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Spiżarnia ── */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm mb-5">
        <p className="text-sm font-semibold text-zinc-700 mb-4">Spiżarnia — stan zapasów</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-800">{pantryStats.total}</p>
            <p className="text-xs text-zinc-400">produktów</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${pantryStats.expiringSoon > 0 ? 'text-orange-500' : 'text-emerald-600'}`}>{pantryStats.expiringSoon}</p>
            <p className="text-xs text-zinc-400">wygasa ≤3 dni</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${pantryStats.expired > 0 ? 'text-red-600' : 'text-zinc-400'}`}>{pantryStats.expired}</p>
            <p className="text-xs text-zinc-400">przeterminowane</p>
          </div>
        </div>
        {pantryStats.avgExpiryDays !== null && (
          <p className="text-xs text-zinc-500 mb-4">Średnia pozostałych dni do ważności: <strong>{pantryStats.avgExpiryDays} dni</strong></p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {(Object.entries(pantryStats.byCategory) as [string, number][])
            .sort(([, a], [, b]) => b - a)
            .map(([cat, cnt]) => (
              <div key={cat} className="flex items-center gap-2 bg-zinc-50 rounded-lg px-3 py-2">
                <span>{pantryCategories[cat] || '📦'}</span>
                <span className="text-xs text-zinc-600 flex-1 truncate">{cat}</span>
                <span className="text-xs font-semibold text-zinc-700">{cnt}</span>
              </div>
            ))}
        </div>
      </div>

      {/* ── Rachunki stałe ── */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm">
        <p className="text-sm font-semibold text-zinc-700 mb-3">Rachunki stałe</p>
        <div className="flex flex-col divide-y divide-zinc-100">
          {(bills || []).map((b: { name: string; due_day: number; amount: number }, i: number) => (
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

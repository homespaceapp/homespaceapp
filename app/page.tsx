import { supabase } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function getWeekNumber(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

export default async function DashboardPage() {
  const today = new Date();
  const weekNum = getWeekNumber(today);
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

  // Pobierz dzisiejszy obiad z Supabase
  const { data: todayMealData } = await supabase
    .from('weekly_plan')
    .select('*, meals(*)')
    .eq('week_number', weekNum)
    .eq('day_of_week', dayOfWeek)
    .single();

  const todayMeal = todayMealData ? {
    meal_name: todayMealData.meal_name || todayMealData.meals?.name,
    protein_rating: todayMealData.meals?.protein_rating,
    prep_time: todayMealData.meals?.prep_time,
    notes: todayMealData.meals?.notes
  } : null;

  // Pobierz plan tygodnia
  const { data: weekMealsData } = await supabase
    .from('weekly_plan')
    .select('*, meals(name, protein_rating, prep_time)')
    .eq('week_number', weekNum)
    .order('day_of_week');

  const weekMeals = weekMealsData || [];

  // Pobierz rachunki
  const { data: billsData } = await supabase
    .from('bills')
    .select('*')
    .eq('active', true)
    .order('due_day');

  const bills = billsData || [];
  const todayDay = today.getDate();
  const upcomingBills = bills.filter(b => {
    const daysLeft = b.due_day - todayDay;
    return daysLeft >= 0 && daysLeft <= 7;
  });

  // Pobierz dzisiejsze wydarzenia z kalendarza
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const { data: todayEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('date', todayStr)
    .order('time', { ascending: true, nullsFirst: false });

  // Pobierz wygasające produkty
  const { data: pantryExpiring } = await supabase
    .from('pantry')
    .select('*')
    .not('purchase_date', 'is', null)
    .not('expiry_days', 'is', null)
    .limit(5);

  const proteinColors: Record<string, string> = {
    hi: 'bg-emerald-100 text-emerald-800',
    md: 'bg-yellow-100 text-yellow-800',
    ok: 'bg-blue-100 text-blue-800',
    lo: 'bg-red-100 text-red-700',
  };
  const proteinLabels: Record<string, string> = { hi: '💪💪💪', md: '💪💪', ok: '💪', lo: '⚠️' };
  const dayLabels = ['', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">
          {today.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h1>
        <p className="text-zinc-500 text-sm mt-0.5">Tydzień {weekNum}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Dzisiaj na obiad */}
        <div className="md:col-span-2 bg-white rounded-xl p-5 border border-zinc-200 shadow-sm">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Dzisiaj na obiad</p>
          {todayMeal ? (
            <>
              <h2 className="text-xl font-semibold text-zinc-800">{todayMeal.meal_name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${proteinColors[todayMeal.protein_rating] || ''}`}>
                  {proteinLabels[todayMeal.protein_rating]} białko
                </span>
                {todayMeal.prep_time && (
                  <span className="text-xs text-zinc-400">⏱️ {todayMeal.prep_time} min</span>
                )}
              </div>
              {todayMeal.notes && (
                <p className="text-sm text-zinc-500 mt-2">{todayMeal.notes}</p>
              )}
            </>
          ) : (
            <div className="text-zinc-400">
              <p className="text-base">Brak planu na dziś</p>
              <Link href="/obiady" className="text-sm text-emerald-600 hover:underline mt-1 inline-block">
                → Przejdź do planu obiadów
              </Link>
            </div>
          )}
        </div>

        {/* Dziś w kalendarzu */}
        <div className="md:col-span-2 bg-white rounded-xl p-5 border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Dziś w kalendarzu</p>
            <Link href="/kalendarz" className="text-xs text-emerald-600 hover:underline">Kalendarz →</Link>
          </div>
          {!todayEvents?.length ? (
            <p className="text-sm text-zinc-400">Nic zaplanowanego na dziś</p>
          ) : (
            <div className="flex flex-col gap-2">
              {todayEvents.map(ev => {
                const ownerStyles: Record<string, string> = {
                  adrian: 'bg-blue-100 text-blue-700',
                  kasia: 'bg-pink-100 text-pink-700',
                  oboje: 'bg-yellow-100 text-yellow-700',
                };
                const ownerLabels: Record<string, string> = { adrian: 'Adrian', kasia: 'Kasia', oboje: 'Oboje' };
                return (
                  <div key={ev.id} className="flex items-start gap-2.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${ownerStyles[ev.owner] || 'bg-zinc-100 text-zinc-600'}`}>
                      {ownerLabels[ev.owner] || ev.owner}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-zinc-800">{ev.title}</p>
                      {ev.time && <p className="text-xs text-zinc-400">{ev.time}</p>}
                      {ev.notes && <p className="text-xs text-zinc-400">{ev.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alerty */}
        <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Alerty</p>
          {upcomingBills.length === 0 && (pantryExpiring?.length || 0) === 0 ? (
            <p className="text-sm text-emerald-600">✓ Wszystko OK</p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingBills.map((b, i) => (
                <div key={i} className="text-xs">
                  <span className="text-orange-500">💳</span>{' '}
                  <span className="font-medium">{b.name}</span>
                  <span className="text-zinc-400"> — {b.due_day}. dnia ({b.amount} zł)</span>
                </div>
              ))}
              {pantryExpiring?.map((p, i) => (
                <div key={i} className="text-xs">
                  <span className="text-red-500">⚠️</span>{' '}
                  <span className="font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tydzień */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Ten tydzień</p>
          <Link href="/obiady" className="text-xs text-emerald-600 hover:underline">
            Pełny plan →
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map(d => {
            const meal = weekMeals.find(m => m.day_of_week === d);
            const isToday = d === dayOfWeek;
            return (
              <div
                key={d}
                className={`rounded-lg p-2 text-center ${isToday ? 'bg-emerald-50 ring-1 ring-emerald-400' : 'bg-zinc-50'}`}
              >
                <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-emerald-700' : 'text-zinc-400'}`}>
                  {dayLabels[d]}
                </p>
                {meal ? (
                  <>
                    <p className="text-xs text-zinc-700 leading-tight line-clamp-2">{meal.meal_name || meal.meals?.name}</p>
                    <span className="text-xs mt-1 inline-block">{proteinLabels[meal.meals?.protein_rating]}</span>
                  </>
                ) : (
                  <p className="text-xs text-zinc-300">—</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/zakupy', label: 'Generuj zakupy', icon: '🛒', desc: 'Na ten tydzień' },
          { href: '/spizarnia', label: 'Stan lodówki', icon: '📦', desc: 'Co masz w domu' },
          { href: '/budzet', label: 'Rachunki', icon: '💰', desc: 'Terminy i budżet' },
          { href: '/agent', label: 'Zapytaj agenta', icon: '🤖', desc: 'Co ugotować?' },
        ].map(({ href, label, icon, desc }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl p-4 border border-zinc-200 hover:border-emerald-400 hover:shadow-sm transition-all"
          >
            <span className="text-2xl">{icon}</span>
            <p className="font-semibold text-zinc-800 text-sm mt-2">{label}</p>
            <p className="text-xs text-zinc-400">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

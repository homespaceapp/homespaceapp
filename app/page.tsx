import { supabase } from '@/lib/db';
import Link from 'next/link';
import TasksWidget from './TasksWidget';
import CalendarWidget from './CalendarWidget';
import type { Task } from './zadania/actions';

export const dynamic = 'force-dynamic';

function getWeekNumber(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

const proteinColors: Record<string, string> = {
  hi: 'bg-emerald-100 text-emerald-800',
  md: 'bg-yellow-100 text-yellow-800',
  ok: 'bg-blue-100 text-blue-800',
  lo: 'bg-red-100 text-red-700',
};
const proteinLabels: Record<string, string> = { hi: '💪💪💪', md: '💪💪', ok: '💪', lo: '⚠️' };
const dayLabels = ['', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

const ownerStyles: Record<string, string> = {
  adrian: 'bg-blue-100 text-blue-700',
  kasia: 'bg-pink-100 text-pink-700',
  oboje: 'bg-yellow-100 text-yellow-700',
};
const ownerLabels: Record<string, string> = { adrian: 'Adrian', kasia: 'Kasia', oboje: 'Oboje' };

const MAX_ITEMS = 5;

export default async function DashboardPage() {
  const today = new Date();
  const weekNum = getWeekNumber(today);
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [
    { data: todayMealData },
    { data: weekMealsData },
    { data: billsData },
    { data: pantryExpiring },
    { data: todayEvents },
    { data: tasksData },
  ] = await Promise.all([
    supabase.from('weekly_plan').select('*, meals(*)').eq('week_number', weekNum).eq('day_of_week', dayOfWeek).single(),
    supabase.from('weekly_plan').select('*, meals(name, protein_rating, prep_time)').eq('week_number', weekNum).order('day_of_week'),
    supabase.from('bills').select('*').eq('active', true).order('due_day'),
    supabase.from('pantry').select('*').not('purchase_date', 'is', null).not('expiry_days', 'is', null).limit(10),
    supabase.from('calendar_events').select('*').eq('date', todayStr).order('time', { ascending: true, nullsFirst: false }),
    supabase.from('tasks').select('*').order('status').order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }),
  ]);

  const todayMeal = todayMealData ? {
    meal_name: todayMealData.meal_name || todayMealData.meals?.name,
    protein_rating: todayMealData.meals?.protein_rating,
    prep_time: todayMealData.meals?.prep_time,
    notes: todayMealData.meals?.notes,
  } : null;

  const weekMeals = weekMealsData || [];
  const todayDay = today.getDate();
  const upcomingBills = (billsData || []).filter(b => {
    const daysLeft = b.due_day - todayDay;
    return daysLeft >= 0 && daysLeft <= 7;
  });

  const expiringItems = (pantryExpiring || []).filter(p => {
    if (!p.purchase_date || !p.expiry_days) return false;
    const purchased = new Date(p.purchase_date);
    const expiry = new Date(purchased.getTime() + p.expiry_days * 86400000);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    return daysLeft <= 3;
  });

  const tasks = (tasksData || []) as Task[];

  const events = todayEvents || [];
  const visibleEvents = events.slice(0, MAX_ITEMS);
  const moreEvents = events.length - visibleEvents.length;

  const visibleBills = upcomingBills.slice(0, MAX_ITEMS);
  const moreBills = upcomingBills.length - visibleBills.length;

  const visibleExpiring = expiringItems.slice(0, MAX_ITEMS);
  const moreExpiring = expiringItems.length - visibleExpiring.length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-zinc-800">
          {today.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h1>
        <p className="text-zinc-500 text-sm mt-0.5">Tydzień {weekNum}</p>
      </div>

      {/* Kafelki: 2x2 grid — Kalendarz, Obiad, Płatności, Spiżarnia */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

        {/* 1. Dziś w kalendarzu */}
        <CalendarWidget initialEvents={visibleEvents} />

        {/* 2. Dziś na obiad */}
        <Link href={`/obiady?day=${dayOfWeek}`} className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all block">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">🍽️ Dziś na obiad</p>
          {todayMeal ? (
            <>
              <h2 className="text-xl font-semibold text-zinc-800">{todayMeal.meal_name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${proteinColors[todayMeal.protein_rating] || ''}`}>
                  {proteinLabels[todayMeal.protein_rating]} białko
                </span>
                {todayMeal.prep_time && <span className="text-xs text-zinc-400">⏱️ {todayMeal.prep_time} min</span>}
              </div>
              {todayMeal.notes && <p className="text-sm text-zinc-500 mt-2">{todayMeal.notes}</p>}
              <p className="text-xs text-emerald-500 mt-3">→ Zobacz przepis</p>
            </>
          ) : (
            <div className="text-zinc-400">
              <p className="text-base">Brak planu na dziś</p>
              <p className="text-sm text-emerald-600 mt-1">→ Przejdź do planu obiadów</p>
            </div>
          )}
        </Link>

        {/* 3. Płatności */}
        <Link href="/budzet" className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm hover:border-orange-300 hover:shadow-md transition-all block">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">💳 Płatności</p>
          {visibleBills.length === 0 ? (
            <p className="text-sm text-emerald-600">✓ Nic w tym tygodniu</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {visibleBills.map((b, i) => (
                <div key={i} className="text-xs">
                  <span className="font-medium text-zinc-700">{b.name}</span>
                  <span className="text-zinc-400"> — {b.due_day}. ({b.amount} zł)</span>
                </div>
              ))}
              {moreBills > 0 && <p className="text-xs text-zinc-400">+{moreBills} więcej…</p>}
            </div>
          )}
          <p className="text-xs text-orange-400 mt-3">→ Budżet</p>
        </Link>

        {/* 4. Spiżarnia */}
        <Link href="/spizarnia" className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm hover:border-red-300 hover:shadow-md transition-all block">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">📦 Spiżarnia</p>
          {visibleExpiring.length === 0 ? (
            <p className="text-sm text-emerald-600">✓ Nic nie wygasa</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {visibleExpiring.map((p, i) => (
                <div key={i} className="text-xs">
                  <span className="text-red-500">⚠️ </span>
                  <span className="font-medium text-zinc-700">{p.name}</span>
                </div>
              ))}
              {moreExpiring > 0 && <p className="text-xs text-zinc-400">+{moreExpiring} więcej…</p>}
            </div>
          )}
          <p className="text-xs text-red-400 mt-3">→ Spiżarnia</p>
        </Link>
      </div>

      {/* Zadania */}
      <TasksWidget initialTasks={tasks} />

      {/* Tydzień */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Ten tydzień</p>
          <Link href="/obiady" className="text-xs text-emerald-600 hover:underline">Pełny plan →</Link>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map(d => {
            const meal = weekMeals.find(m => m.day_of_week === d);
            const isToday = d === dayOfWeek;
            return (
              <div key={d} className={`rounded-lg p-2 text-center ${isToday ? 'bg-emerald-50 ring-1 ring-emerald-400' : 'bg-zinc-50'}`}>
                <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-emerald-700' : 'text-zinc-400'}`}>{dayLabels[d]}</p>
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
          <Link key={href} href={href} className="bg-white rounded-xl p-4 border border-zinc-200 hover:border-emerald-400 hover:shadow-sm transition-all">
            <span className="text-2xl">{icon}</span>
            <p className="font-semibold text-zinc-800 text-sm mt-2">{label}</p>
            <p className="text-xs text-zinc-400">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

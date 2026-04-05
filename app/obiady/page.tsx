import { supabase } from '@/lib/db';
import Link from 'next/link';
import { MealCard } from './MealCard';

export const dynamic = 'force-dynamic';

function getWeekNumber(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

const categoryLabels: Record<string, string> = {
  drób: '🍗 Drób',
  kurczak: '🍗 Kurczak',
  wieprzowina: '🥩 Wieprzowina',
  makaron: '🍝 Makarony',
  jajka: '🥚 Jajka',
  kasza: '🌾 Kasza',
  ziemniaki: '🥔 Ziemniaki',
  słodkie: '🍬 Słodkie',
  slodkie: '🍬 Słodkie (niedziela)',
  szybkie: '⚡ Szybkie',
};

export default async function ObiadyPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; view?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();
  const currentWeek = getWeekNumber(today);
  const selectedWeek = params.week ? parseInt(params.week) : currentWeek;
  const view = params.view || 'week';

  const { data: weekPlan } = await supabase
    .from('weekly_plan')
    .select('*')
    .eq('week_number', selectedWeek)
    .order('day_of_week');

  const { data: allMeals } = await supabase
    .from('meals')
    .select('*')
    .order('category')
    .order('name');

  type MealRow = {
    id: number;
    name: string;
    category: string;
    prep_time: number;
    protein_rating: string;
    notes: string;
    recipe: string;
    ingredients: string;
  };

  const mealsData = (allMeals || []) as MealRow[];
  const mealsMap = mealsData.reduce((acc, m) => { acc[m.id] = m; return acc; }, {} as Record<number, MealRow>);

  const weekMeals = (weekPlan || []).map(wp => ({
    day_of_week: wp.day_of_week as number,
    meal_name: wp.meal_name as string,
    protein_rating: mealsMap[wp.meal_id]?.protein_rating || '',
    prep_time: mealsMap[wp.meal_id]?.prep_time || null,
    notes: mealsMap[wp.meal_id]?.notes || '',
    recipe: mealsMap[wp.meal_id]?.recipe || '',
    ingredients: mealsMap[wp.meal_id]?.ingredients || '',
  }));

  const categoryGroups = mealsData.reduce((acc, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {} as Record<string, MealRow[]>);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Plan obiadów</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Tydzień {selectedWeek} / 52</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/obiady?week=${selectedWeek - 1}&view=${view}`}
            className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600"
          >
            ← Poprzedni
          </Link>
          <span className="text-sm font-medium text-zinc-700 w-20 text-center">
            Tydz. {selectedWeek}
            {selectedWeek === currentWeek && <span className="ml-1 text-xs text-emerald-600">(obecny)</span>}
          </span>
          <Link
            href={`/obiady?week=${selectedWeek + 1}&view=${view}`}
            className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600"
          >
            Następny →
          </Link>
          <Link
            href={`/obiady?week=${currentWeek}&view=${view}`}
            className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Dziś
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-zinc-100 rounded-lg p-1 w-fit">
        {['week', 'meals'].map(v => (
          <Link
            key={v}
            href={`/obiady?week=${selectedWeek}&view=${v}`}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === v ? 'bg-white shadow-sm text-zinc-800' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {v === 'week' ? '📅 Tydzień' : '🍽️ Wszystkie dania'}
          </Link>
        ))}
      </div>

      {view === 'week' && (
        <div className="flex flex-col gap-3">
          {weekMeals.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-zinc-200 text-center">
              <p className="text-zinc-400 mb-2">Brak planu na tydzień {selectedWeek}</p>
              <p className="text-sm text-zinc-400">Plan tygodniowy możesz dodać przez edycję bazy danych</p>
            </div>
          ) : (
            weekMeals.map(meal => (
              <MealCard key={meal.day_of_week} meal={meal} />
            ))
          )}
          {weekMeals.length > 0 && (
            <div className="mt-2">
              <Link
                href={`/zakupy?week=${selectedWeek}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                🛒 Generuj listę zakupów na ten tydzień
              </Link>
            </div>
          )}
        </div>
      )}

      {view === 'meals' && (
        <div className="flex flex-col gap-6">
          {Object.entries(categoryGroups).map(([cat, meals]) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                {categoryLabels[cat] || cat}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {meals.map(meal => (
                  <MealCard key={meal.id} meal={{ meal_name: meal.name, protein_rating: meal.protein_rating, prep_time: meal.prep_time, notes: meal.notes, recipe: meal.recipe, ingredients: meal.ingredients }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

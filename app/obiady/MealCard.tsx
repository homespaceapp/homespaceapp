'use client';

import { useState } from 'react';

type Meal = {
  day_of_week?: number;
  meal_name: string;
  protein_rating: string;
  prep_time: number | null;
  notes: string;
  recipe: string;
  ingredients: string;
};

const proteinColors: Record<string, string> = {
  hi: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  md: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ok: 'bg-blue-100 text-blue-800 border-blue-200',
  lo: 'bg-red-50 text-red-700 border-red-200',
};
const proteinLabels: Record<string, string> = { hi: '💪💪💪 >90g', md: '💪💪 60–90g', ok: '💪 30–60g', lo: '⚠️ <30g' };
const dayLabels = ['', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

export function MealCard({ meal }: { meal: Meal }) {
  const [open, setOpen] = useState(false);
  const hasRecipe = !!(meal.recipe || meal.ingredients);

  return (
    <>
      <div
        onClick={() => hasRecipe && setOpen(true)}
        className={`bg-white rounded-xl p-4 border ${proteinColors[meal.protein_rating] || 'border-zinc-200'} shadow-sm ${hasRecipe ? 'cursor-pointer hover:shadow-md active:scale-[0.99] transition-all' : ''}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {meal.day_of_week && (
              <span className="text-xs font-semibold text-zinc-400 w-12 shrink-0">
                {dayLabels[meal.day_of_week]}
              </span>
            )}
            <div>
              <p className="font-semibold text-zinc-800">
                {meal.meal_name}
                {hasRecipe && <span className="ml-2 text-xs text-emerald-600">📖 przepis</span>}
              </p>
              {meal.notes && <p className="text-xs text-zinc-500 mt-0.5">{meal.notes}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {meal.prep_time && <span className="text-xs text-zinc-400">⏱️ {meal.prep_time} min</span>}
            {meal.protein_rating && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${proteinColors[meal.protein_rating] || ''}`}>
                {proteinLabels[meal.protein_rating]}
              </span>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-zinc-100 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-800">{meal.meal_name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  {meal.prep_time && <span className="text-xs text-zinc-400">⏱️ {meal.prep_time} min</span>}
                  {meal.protein_rating && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${proteinColors[meal.protein_rating]}`}>
                      {proteinLabels[meal.protein_rating]}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none ml-4">✕</button>
            </div>

            <div className="p-5 flex flex-col gap-5">
              {meal.ingredients && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-700 mb-2">🧂 Składniki</h3>
                  <ul className="flex flex-col gap-1">
                    {meal.ingredients.split(',').map((ing, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        <span>{ing.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {meal.recipe && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-700 mb-2">👨‍🍳 Przygotowanie</h3>
                  <div className="flex flex-col gap-2">
                    {meal.recipe.split('\n').filter(l => l.trim()).map((step, i) => (
                      <p key={i} className="text-sm text-zinc-700 leading-relaxed">{step.trim()}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

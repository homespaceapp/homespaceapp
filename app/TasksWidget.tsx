'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toggleTask } from './zadania/actions';
import type { Task } from './zadania/actions';

const OWNER_STYLES: Record<string, string> = {
  adrian: 'bg-blue-100 text-blue-700',
  kasia: 'bg-pink-100 text-pink-700',
  oboje: 'bg-yellow-100 text-yellow-700',
};
const OWNER_LABELS: Record<string, string> = { adrian: 'Adrian', kasia: 'Kasia', oboje: 'Oboje' };

function isOverdue(task: Task) {
  if (!task.due_date || task.status === 'done') return false;
  return new Date(task.due_date) < new Date(new Date().toDateString());
}

export default function TasksWidget({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [, startTransition] = useTransition();

  function handleToggle(task: Task) {
    setTasks(prev => prev.map(t =>
      t.id === task.id
        ? { ...t, status: t.status === 'todo' ? 'done' : 'todo', done_at: t.status === 'todo' ? new Date().toISOString() : null }
        : t
    ));
    startTransition(async () => {
      await toggleTask(task.id, task.status);
    });
  }

  const todo = tasks.filter(t => t.status === 'todo');
  const done = tasks.filter(t => t.status === 'done');

  return (
    <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">✅ Zadania na dziś</p>
        <Link href="/zadania" className="text-xs text-emerald-600 hover:underline">Wszystkie →</Link>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-zinc-400">Brak zadań</p>
      ) : (
        <div className="flex flex-col gap-1">
          {todo.map(task => (
            <div key={task.id} className="flex items-center gap-3 py-1.5">
              <button
                onClick={() => handleToggle(task)}
                className="w-5 h-5 rounded-full border-2 border-zinc-300 hover:border-emerald-400 flex-shrink-0 flex items-center justify-center transition-colors"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-zinc-800">{task.title}</span>
                {isOverdue(task) && <span className="ml-2 text-[10px] text-red-500">⚠️ po terminie</span>}
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${OWNER_STYLES[task.assigned_to]}`}>
                {OWNER_LABELS[task.assigned_to]}
              </span>
            </div>
          ))}
          {done.length > 0 && (
            <>
              <div className="border-t border-zinc-100 my-1" />
              {done.map(task => (
                <div key={task.id} className="flex items-center gap-3 py-1.5 opacity-50">
                  <button
                    onClick={() => handleToggle(task)}
                    className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-emerald-500 flex-shrink-0 flex items-center justify-center text-white text-[10px] transition-colors"
                  >
                    ✓
                  </button>
                  <span className="text-sm text-zinc-400 line-through flex-1">{task.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${OWNER_STYLES[task.assigned_to]}`}>
                    {OWNER_LABELS[task.assigned_to]}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

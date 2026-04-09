'use client';

import { useState, useTransition } from 'react';
import { addNote, updateNote, deleteNote } from './actions';

type Note = { id: string; owner: string; title: string; body: string | null; color: string; pinned: boolean; created_at: string };

const COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  red:    { bg: 'bg-red-50',    border: 'border-red-400',    dot: 'bg-red-500' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', dot: 'bg-yellow-400' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-300',   dot: 'bg-blue-400' },
  green:  { bg: 'bg-emerald-50', border: 'border-emerald-300', dot: 'bg-emerald-400' },
  pink:   { bg: 'bg-pink-50',   border: 'border-pink-300',   dot: 'bg-pink-400' },
  zinc:   { bg: 'bg-white',     border: 'border-zinc-200',   dot: 'bg-zinc-400' },
};

const ownerStyles: Record<string, string> = {
  adrian: 'bg-blue-100 text-blue-700',
  kasia: 'bg-pink-100 text-pink-700',
  oboje: 'bg-yellow-100 text-yellow-700',
};
const ownerLabels: Record<string, string> = { adrian: 'Adrian', kasia: 'Kasia', oboje: 'Oboje' };

export default function NotatkiClient({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', color: 'yellow', owner: 'oboje' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', body: '', color: 'yellow', owner: 'oboje' });
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    startTransition(async () => {
      const result = await addNote(form);
      if (result) {
        setNotes(prev => [result as Note, ...prev]);
        setForm({ title: '', body: '', color: 'yellow', owner: 'oboje' });
        setShowForm(false);
      }
    });
  }

  function handleEditOpen(note: Note) {
    setEditId(note.id);
    setEditForm({ title: note.title, body: note.body || '', color: note.color, owner: note.owner });
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    startTransition(async () => {
      const result = await updateNote(editId, editForm);
      if (result) {
        setNotes(prev => prev.map(n => n.id === editId ? result as Note : n));
        setEditId(null);
      }
    });
  }

  function handlePin(note: Note) {
    startTransition(async () => {
      const result = await updateNote(note.id, { pinned: !note.pinned });
      if (result) setNotes(prev => prev.map(n => n.id === note.id ? result as Note : n).sort((a, b) => Number(b.pinned) - Number(a.pinned)));
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    });
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Notatki</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{notes.length} notatek domowych</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          + Dodaj
        </button>
      </div>

      {/* Formularz */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl p-5 border border-zinc-200 mb-5 shadow-sm">
          <p className="text-sm font-semibold text-zinc-700 mb-3">Nowa notatka</p>
          <input
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Tytuł notatki"
            required
            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-2"
          />
          <textarea
            value={form.body}
            onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
            placeholder="Treść (opcjonalne)"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none mb-3"
          />
          <div className="flex items-center gap-4 mb-3">
            <div className="flex gap-2">
              {Object.entries(COLORS).map(([c, s]) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, color: c }))}
                  className={`w-6 h-6 rounded-full ${s.dot} transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-zinc-400' : ''}`}
                />
              ))}
            </div>
            <select
              value={form.owner}
              onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}
              className="px-2 py-1 text-xs border border-zinc-200 rounded-lg bg-white"
            >
              {Object.entries(ownerLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">Zapisz</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50">Anuluj</button>
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-zinc-200 text-center">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-zinc-500">Brak notatek</p>
          <p className="text-sm text-zinc-400 mt-1">Dodaj pierwsze przypomnienie domowe</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map(note => {
            const c = COLORS[note.color] || COLORS.yellow;
            if (editId === note.id) {
              return (
                <form key={note.id} onSubmit={handleEditSave} className={`rounded-xl p-4 border-2 shadow-sm ${c.bg} ${c.border}`}>
                  <input
                    value={editForm.title}
                    onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                    required
                    className="w-full px-2 py-1 text-sm border border-zinc-200 rounded-lg mb-2 bg-white"
                  />
                  <textarea
                    value={editForm.body}
                    onChange={e => setEditForm(p => ({ ...p, body: e.target.value }))}
                    rows={3}
                    className="w-full px-2 py-1 text-sm border border-zinc-200 rounded-lg resize-none mb-2 bg-white"
                  />
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex gap-2">
                      {Object.entries(COLORS).map(([col, s]) => (
                        <button key={col} type="button" onClick={() => setEditForm(p => ({ ...p, color: col }))}
                          className={`w-5 h-5 rounded-full ${s.dot} ${editForm.color === col ? 'ring-2 ring-offset-1 ring-zinc-500' : ''}`}
                          title={col === 'red' ? '🔴 Bardzo ważne' : col}
                        />
                      ))}
                    </div>
                    <select
                      value={editForm.owner}
                      onChange={e => setEditForm(p => ({ ...p, owner: e.target.value }))}
                      className="px-2 py-1 text-xs border border-zinc-200 rounded-lg bg-white"
                    >
                      {Object.entries(ownerLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-1.5 text-xs">
                    <button type="submit" disabled={isPending} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">Zapisz</button>
                    <button type="button" onClick={() => setEditId(null)} className="px-3 py-1.5 border border-zinc-300 rounded-lg text-zinc-600 hover:bg-white/50">Anuluj</button>
                    <button type="button" onClick={() => { setEditId(null); handleDelete(note.id); }} className="ml-auto px-3 py-1.5 text-red-500 hover:text-red-700">Usuń</button>
                  </div>
                </form>
              );
            }
            return (
              <div key={note.id} className={`rounded-xl p-4 border shadow-sm ${c.bg} ${c.border} ${note.pinned ? 'border-2' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {note.pinned && <span className="text-xs">📌</span>}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ownerStyles[note.owner] || 'bg-zinc-100 text-zinc-600'}`}>
                      {ownerLabels[note.owner] || note.owner}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handlePin(note)} className="text-zinc-400 hover:text-zinc-700 text-sm px-1" title={note.pinned ? 'Odepnij' : 'Przypnij'}>
                      {note.pinned ? '📌' : '📍'}
                    </button>
                    <button onClick={() => handleEditOpen(note)} className="text-zinc-400 hover:text-zinc-700 text-sm px-1">✏️</button>
                  </div>
                </div>
                <p className="font-semibold text-zinc-800 text-sm mb-1">{note.title}</p>
                {note.body && <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap">{note.body}</p>}
                <p className="text-[10px] text-zinc-400 mt-2">
                  {new Date(note.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

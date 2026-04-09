'use client';

import { useState, useTransition } from 'react';
import { addContact, updateContact, deleteContact } from './actions';

type Contact = { id: string; name: string; role: string | null; phone: string | null; email: string | null; notes: string | null };
type FormState = { name: string; role: string; phone: string; email: string; notes: string };

const ROLE_ICONS: Record<string, string> = {
  hydraulik: '🔧', elektryk: '⚡', zarządca: '🏢', dozorca: '🏠',
  lekarz: '🏥', dentysta: '🦷', weterynarz: '🐾', apteka: '💊',
  rodzina: '👨‍👩‍👧', sąsiad: '🤝', właściciel: '🔑', inne: '📋',
};

function getRoleIcon(role: string | null) {
  if (!role) return '📋';
  const lower = role.toLowerCase();
  return Object.entries(ROLE_ICONS).find(([k]) => lower.includes(k))?.[1] || '📋';
}

const ROLES = ['Właściciel', 'Hydraulik', 'Elektryk', 'Zarządca', 'Dozorca', 'Lekarz', 'Dentysta', 'Weterynarz', 'Apteka', 'Rodzina', 'Sąsiad', 'Inne'];

function emptyForm(): FormState {
  return { name: '', role: '', phone: '', email: '', notes: '' };
}

// ─── Formularz jako osobny komponent POZA KontaktyClient ─────────────────────
// WAŻNE: musi być poza komponentem nadrzędnym, inaczej React przy każdym
// re-renderze tworzy nowy typ komponentu → unmount/mount → traci fokus klawiatury
function ContactFormFields({
  values,
  onChange,
  onSubmit,
  onCancel,
  isPending,
  showDelete,
  onDelete,
  title,
}: {
  values: FormState;
  onChange: (v: FormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isPending: boolean;
  showDelete?: boolean;
  onDelete?: () => void;
  title: string;
}) {
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm">
      <p className="text-sm font-semibold text-zinc-700 mb-3">{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <input
          value={values.name}
          onChange={e => onChange({ ...values, name: e.target.value })}
          placeholder="Imię / Nazwa *"
          required
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <select
          value={values.role}
          onChange={e => onChange({ ...values, role: e.target.value })}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
        >
          <option value="">— Rola —</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input
          value={values.phone}
          onChange={e => onChange({ ...values, phone: e.target.value })}
          placeholder="Telefon"
          type="tel"
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <input
          value={values.email}
          onChange={e => onChange({ ...values, email: e.target.value })}
          placeholder="E-mail"
          type="email"
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <input
          value={values.notes}
          onChange={e => onChange({ ...values, notes: e.target.value })}
          placeholder="Notatka (np. godziny pracy)"
          className="md:col-span-2 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          Zapisz
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50"
        >
          Anuluj
        </button>
        {showDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto px-4 py-2 text-sm text-red-500 hover:text-red-700"
          >
            Usuń
          </button>
        )}
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function KontaktyClient({ initialContacts }: { initialContacts: Contact[] }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [showForm, setShowForm] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    startTransition(async () => {
      const result = await addContact(addForm);
      if (result) {
        setContacts(prev => [...prev, result as Contact].sort((a, b) => a.name.localeCompare(b.name)));
        setAddForm(emptyForm());
        setShowForm(false);
      }
    });
  }

  function handleEditOpen(c: Contact) {
    setEditId(c.id);
    setEditForm({ name: c.name, role: c.role || '', phone: c.phone || '', email: c.email || '', notes: c.notes || '' });
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    startTransition(async () => {
      const result = await updateContact(editId, editForm);
      if (result) {
        setContacts(prev => prev.map(c => c.id === editId ? result as Contact : c));
        setEditId(null);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteContact(id);
      setContacts(prev => prev.filter(c => c.id !== id));
      setEditId(null);
    });
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Kontakty domowe</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Hydraulik, lekarz, zarządca, właściciel…</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setAddForm(emptyForm()); }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          + Dodaj
        </button>
      </div>

      {showForm && (
        <div className="mb-5">
          <ContactFormFields
            values={addForm}
            onChange={setAddForm}
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            isPending={isPending}
            title="Nowy kontakt"
          />
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-zinc-200 text-center">
          <p className="text-4xl mb-3">📞</p>
          <p className="text-zinc-500">Brak kontaktów</p>
          <p className="text-sm text-zinc-400 mt-1">Dodaj hydraulika, właściciela, lekarza…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {contacts.map(c => (
            <div key={c.id}>
              {editId === c.id ? (
                <ContactFormFields
                  values={editForm}
                  onChange={setEditForm}
                  onSubmit={handleEditSave}
                  onCancel={() => setEditId(null)}
                  isPending={isPending}
                  showDelete
                  onDelete={() => handleDelete(c.id)}
                  title="Edytuj kontakt"
                />
              ) : (
                <div
                  className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all"
                  onClick={() => handleEditOpen(c)}
                >
                  <span className="text-2xl shrink-0">{getRoleIcon(c.role)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-800">{c.name}</p>
                    {c.role && <p className="text-xs text-zinc-400">{c.role}</p>}
                    {c.notes && <p className="text-xs text-zinc-400 mt-0.5">{c.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700"
                      >
                        📞 {c.phone}
                      </a>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        {c.email}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

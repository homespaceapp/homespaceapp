'use server';

import { supabase } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { sendPushToAll } from '@/lib/push';

type ExpenseForm = {
  date: string;
  category: string;
  amount: string;
  description: string;
  type: string;
  notes?: string;
};

export async function addExpense(form: ExpenseForm) {
  const { data } = await supabase
    .from('expenses')
    .insert({
      date: form.date,
      category: form.category,
      amount: parseFloat(form.amount),
      description: form.description,
      type: form.type || 'wydatek',
      notes: form.notes || null,
    })
    .select()
    .single();
  revalidatePath('/budzet');
  return { expense: data };
}

export async function updateExpense(id: number, form: ExpenseForm) {
  const { data } = await supabase
    .from('expenses')
    .update({
      date: form.date,
      category: form.category,
      amount: parseFloat(form.amount),
      description: form.description,
      type: form.type || 'wydatek',
      notes: form.notes || null,
    })
    .eq('id', id)
    .select()
    .single();
  revalidatePath('/budzet');
  return { expense: data };
}

export async function deleteExpense(id: number) {
  await supabase.from('expenses').delete().eq('id', id);
  revalidatePath('/budzet');
}

// Bills CRUD
type BillForm = {
  name: string;
  amount: string;
  due_day: string;
  category: string;
};

export async function addBill(form: BillForm) {
  const { data } = await supabase
    .from('bills')
    .insert({
      name: form.name,
      amount: parseFloat(form.amount),
      due_day: parseInt(form.due_day),
      category: form.category,
      active: true,
    })
    .select()
    .single();
  revalidatePath('/budzet');
  return { bill: data };
}

export async function updateBill(id: number, form: BillForm) {
  const { data } = await supabase
    .from('bills')
    .update({
      name: form.name,
      amount: parseFloat(form.amount),
      due_day: parseInt(form.due_day),
      category: form.category,
    })
    .eq('id', id)
    .select()
    .single();
  revalidatePath('/budzet');
  return { bill: data };
}

export async function toggleBillPaid(id: number, currentMonth: string) {
  const { data: bill } = await supabase.from('bills').select('name, last_paid_month').eq('id', id).single();
  const billData = bill as { name: string; last_paid_month?: string } | null;
  const newMonth = billData?.last_paid_month === currentMonth ? null : currentMonth;
  await supabase.from('bills').update({ last_paid_month: newMonth }).eq('id', id);
  if (newMonth !== null && billData?.name) {
    await sendPushToAll({ title: '💳 Opłacono rachunek', body: billData.name, url: '/budzet', tag: 'bills' });
  }
  revalidatePath('/budzet');
  return { paid: newMonth !== null };
}

export async function deleteBill(id: number) {
  await supabase.from('bills').delete().eq('id', id);
  revalidatePath('/budzet');
}

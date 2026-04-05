import { supabase } from '@/lib/db';
import BudzetClient from './BudzetClient';

export const dynamic = 'force-dynamic';

export default async function BudzetPage() {
  const today = new Date();
  const todayDay = today.getDate();
  const currentMonth = today.toISOString().slice(0, 7);

  const { data: bills } = await supabase
    .from('bills')
    .select('*')
    .eq('active', true)
    .order('due_day');

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .like('date', `${currentMonth}%`)
    .order('date', { ascending: false });

  const billsData = (bills || []) as Array<{
    id: number; name: string; amount: number; due_day: number; category: string;
  }>;
  const expensesData = (expenses || []) as Array<{
    id: number; date: string; category: string; amount: number; description: string;
    type: string; notes: string | null;
  }>;

  const totalBills = billsData.reduce((sum, b) => sum + b.amount, 0);

  const billsWithDaysLeft = billsData.map(b => ({
    ...b,
    daysLeft: b.due_day >= todayDay ? b.due_day - todayDay : 30 - todayDay + b.due_day,
  }));

  return (
    <BudzetClient
      bills={billsWithDaysLeft}
      expenses={expensesData}
      totalBills={totalBills}
      currentMonth={currentMonth}
    />
  );
}

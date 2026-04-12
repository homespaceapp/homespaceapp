'use server';

import Groq from 'groq-sdk';
import { supabase } from '@/lib/db';

type Message = { role: 'user' | 'assistant'; content: string };

async function getContext() {
  const today = new Date();
  const weekNum = Math.ceil((((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(today.getFullYear(), 0, 1).getDay() + 1) / 7);

  const [weekMealsRes, pantryRes, billsRes, mealsRes] = await Promise.all([
    supabase.from('weekly_plan').select('day_of_week, meal_name').eq('week_number', weekNum),
    supabase.from('pantry').select('name, quantity, unit, purchase_date, expiry_days'),
    supabase.from('bills').select('name, amount, due_day').eq('active', true),
    supabase.from('meals').select('name, category, prep_time, protein_rating, ingredients'),
  ]);

  const days = ['', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
  const planText = weekMealsRes.data?.map(m => `${days[m.day_of_week]}: ${m.meal_name}`).join(', ') || 'brak planu';
  const billsText = billsRes.data?.map(b => `${b.name} ${b.amount}zł/${b.due_day}.`).join(', ') || 'brak';

  // Spiżarnia z terminami ważności
  const pantryWithExpiry = (pantryRes.data || []).map(p => {
    const purchaseDate = new Date(p.purchase_date);
    const expiryDate = new Date(purchaseDate.getTime() + p.expiry_days * 86400000);
    const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / 86400000);
    return { ...p, daysLeft };
  });

  const expired = pantryWithExpiry.filter(p => p.daysLeft < 0);
  const expiringSoon = pantryWithExpiry.filter(p => p.daysLeft >= 0 && p.daysLeft <= 3);
  const ok = pantryWithExpiry.filter(p => p.daysLeft > 3);

  const pantryText = [
    expiringSoon.length > 0
      ? `⚠️ KOŃCZĄ SIĘ (użyj ASAP): ${expiringSoon.map(p => `${p.name} (${p.quantity} ${p.unit}, zostało ${p.daysLeft} dni)`).join('; ')}`
      : null,
    expired.length > 0
      ? `❌ PRZETERMINOWANE: ${expired.map(p => p.name).join(', ')}`
      : null,
    ok.length > 0
      ? `✅ OK: ${ok.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(', ')}`
      : null,
  ].filter(Boolean).join('\n') || 'spiżarnia pusta';

  const recipesText = (mealsRes.data || [])
    .map(m => `[${m.name}] składniki: ${m.ingredients}`)
    .join('\n');

  return `PROFIL: Adrian (cel 150-160g białka/dzień, shake ~47g/dzień), Kasia (cel 75-100g/dzień). Zakupy: soboty. Budżet jedzenie: 220zł/mies.
DATA: ${today.toLocaleDateString('pl-PL')}

PLAN TYGODNIA (tydzień ${weekNum}): ${planText}

SPIŻARNIA:
${pantryText}

RACHUNKI: ${billsText}

BAZA PRZEPISÓW (${mealsRes.data?.length || 0} dań):
${recipesText}`;
}

export async function sendMessage(messages: Message[], imageBase64?: string, imageMime?: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return 'Brak klucza GROQ_API_KEY. Dodaj go w ustawieniach Vercel → Environment Variables.';
  }

  const context = await getContext();
  const client = new Groq({ apiKey });

  const systemPrompt = `Jesteś Agentem Loszki — inteligentnym asystentem domowym Adriana i Kasi.
Odpowiadasz po polsku, krótko i konkretnie.

TWOJE GŁÓWNE ZADANIA:
1. Gdy pytają co ugotować — sprawdź spiżarnię, priorytetyzuj produkty z krótkim terminem ważności, dopasuj przepisy z bazy do dostępnych składników
2. Gdy analizujesz paragon — wypisz produkty jako listę: "- Nazwa (ilość, cena)"
3. Gdy pytają o zakupy — uwzględnij plan tygodnia i czego brakuje w spiżarni
4. Gdy pytają o białko — policz na podstawie przepisów i celów Adriana/Kasi

ZASADA: zawsze sprawdzaj najpierw co się kończy w spiżarni i buduj propozycję wokół tych produktów.

AKTUALNY KONTEKST:
${context}`;

  const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  // Groq nie obsługuje obrazów w llama — jeśli jest obraz, dodaj info tekstowo
  if (imageBase64 && imageMime) {
    const last = groqMessages[groqMessages.length - 1];
    last.content = `[Użytkownik wysłał zdjęcie paragonu]\n${last.content}`;
  }

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      max_tokens: 1024,
    });
    return response.choices[0]?.message?.content ?? '';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('429') || msg.includes('rate_limit')) {
      return '⚠️ Przekroczono limit zapytań. Spróbuj za chwilę.';
    }
    console.error('Agent error:', msg);
    return `❌ Błąd agenta: ${msg.slice(0, 200)}`;
  }
}

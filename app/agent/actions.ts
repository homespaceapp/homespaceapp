'use server';

import { GoogleGenAI } from '@google/genai';
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
    return { ...p, daysLeft, expiryDate };
  });

  const expired = pantryWithExpiry.filter(p => p.daysLeft < 0);
  const expiringSoon = pantryWithExpiry.filter(p => p.daysLeft >= 0 && p.daysLeft <= 3);
  const ok = pantryWithExpiry.filter(p => p.daysLeft > 3);

  const pantryText = [
    expiringSoon.length > 0
      ? `⚠️ KOŃCZĄ SIĘ (${expiringSoon.length > 0 ? 'użyj ASAP' : ''}): ${expiringSoon.map(p => `${p.name} (${p.quantity} ${p.unit}, zostało ${p.daysLeft} dni)`).join('; ')}`
      : null,
    expired.length > 0
      ? `❌ PRZETERMINOWANE: ${expired.map(p => `${p.name}`).join(', ')}`
      : null,
    ok.length > 0
      ? `✅ OK: ${ok.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(', ')}`
      : null,
  ].filter(Boolean).join('\n') || 'spiżarnia pusta';

  // Przepisy (skrócone — nazwa + składniki)
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
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return 'Brak klucza GOOGLE_API_KEY. Dodaj go w ustawieniach Vercel → Environment Variables.';
  }

  const context = await getContext();
  const ai = new GoogleGenAI({ apiKey });

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

  const history = messages.slice(-10, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat = ai.chats.create({
    model: 'gemini-1.5-flash',
    config: { systemInstruction: systemPrompt },
    history,
  });

  const lastMessage = messages[messages.length - 1];
  let parts: object[];

  if (imageBase64 && imageMime) {
    parts = [
      { inlineData: { mimeType: imageMime, data: imageBase64 } },
      { text: lastMessage.content },
    ];
  } else {
    parts = [{ text: lastMessage.content }];
  }

  try {
    const response = await chat.sendMessage({ message: parts });
    return response.text ?? '';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return '⚠️ Przekroczono limit zapytań Gemini (free tier). Spróbuj za chwilę lub wróć po północy gdy limit się resetuje.';
    }
    console.error('Agent error:', msg);
    return `❌ Błąd agenta: ${msg.slice(0, 200)}`;
  }
}

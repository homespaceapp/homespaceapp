'use server';

import Groq from 'groq-sdk';
import pdfParse from 'pdf-parse';
import { supabase } from '@/lib/db';
import { revalidatePath } from 'next/cache';

type Message = { role: 'user' | 'assistant'; content: string };

// ─── Narzędzia agenta (function calling) ─────────────────────────────────────

const TOOLS: Groq.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'add_to_pantry',
      description: 'Dodaje produkt do spiżarni. Używaj gdy użytkownik mówi że coś kupił, wgrywa paragon, lub prosi o dodanie produktu.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Lista produktów do dodania',
            items: {
              type: 'object',
              properties: {
                name:        { type: 'string',  description: 'Nazwa produktu np. "Mleko UHT 1L"' },
                quantity:    { type: 'number',  description: 'Ilość, domyślnie 1' },
                unit:        { type: 'string',  description: 'Jednostka: szt, kg, g, l, ml, op' },
                category:    { type: 'string',  description: 'Kategoria: nabiał, mięso, warzywa, owoce, suche, napoje, słodycze, przyprawy, inne' },
                expiry_days: { type: 'number',  description: 'Dni do przeterminowania. Przykłady: mleko=7, jogurt=14, mięso=2, kurczak=2, makaron=730, ryż=730, chleb=5, ser=14, śmietana=7, jajka=21, warzywa=5, owoce=7' },
              },
              required: ['name', 'quantity', 'unit', 'category', 'expiry_days'],
            },
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_from_pantry',
      description: 'Usuwa produkt ze spiżarni. Używaj gdy użytkownik mówi że coś zużył, zjadł lub wyrzucił.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nazwa produktu do usunięcia (przybliżona)' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_budget_entry',
      description: 'Dodaje wpis wydatku do budżetu. Używaj gdy użytkownik wgrywa paragon lub mówi że coś kupił — zawsze razem z add_to_pantry.',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string',  description: 'Opis zakupów np. "Zakupy Lidl", "Biedronka", "Żabka"' },
          amount:      { type: 'number',  description: 'Łączna kwota w PLN' },
          category:    { type: 'string',  description: 'Kategoria: jedzenie, chemia, inne' },
          date:        { type: 'string',  description: 'Data w formacie YYYY-MM-DD, dziś jeśli nie podano' },
        },
        required: ['description', 'amount', 'category', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_calendar_event',
      description: 'Dodaje wydarzenie do kalendarza. Używaj gdy użytkownik prosi o wpisanie czegoś do kalendarza.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string',  description: 'Tytuł wydarzenia' },
          date:  { type: 'string',  description: 'Data w formacie YYYY-MM-DD' },
          time:  { type: 'string',  description: 'Godzina w formacie HH:MM, opcjonalna' },
          owner: { type: 'string',  description: 'Kto: adrian, kasia, oboje' },
          notes: { type: 'string',  description: 'Dodatkowe notatki, opcjonalne' },
        },
        required: ['title', 'date', 'owner'],
      },
    },
  },
];

// ─── Wykonanie narzędzi ───────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  if (name === 'add_to_pantry') {
    const items = args.items as Array<{
      name: string; quantity: number; unit: string; category: string; expiry_days: number;
    }>;
    const today = new Date().toISOString().split('T')[0];
    const results: string[] = [];

    for (const item of items) {
      const { data: existing } = await supabase
        .from('pantry')
        .select('id, quantity')
        .ilike('name', item.name.trim())
        .maybeSingle();

      if (existing) {
        await supabase
          .from('pantry')
          .update({ quantity: existing.quantity + item.quantity })
          .eq('id', existing.id);
        results.push(`Zaktualizowano: ${item.name} (ilość +${item.quantity})`);
      } else {
        await supabase.from('pantry').insert({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          purchase_date: today,
          expiry_days: item.expiry_days,
        });
        results.push(`Dodano: ${item.name} (${item.quantity} ${item.unit}, ważne ${item.expiry_days} dni)`);
      }
    }

    revalidatePath('/spizarnia');
    return results.join('\n');
  }

  if (name === 'add_budget_entry') {
    const { error } = await supabase.from('expenses').insert({
      date: args.date,
      category: args.category,
      amount: args.amount,
      description: args.description,
      type: 'wydatek',
    });
    revalidatePath('/budzet');
    if (error) return `Błąd budżetu: ${error.message}`;
    return `Dodano wydatek: ${args.description} — ${args.amount} zł (${args.category})`;
  }

  if (name === 'remove_from_pantry') {
    const itemName = args.name as string;
    const { data } = await supabase
      .from('pantry')
      .select('id, name')
      .ilike('name', `%${itemName}%`)
      .limit(1)
      .maybeSingle();

    if (!data) return `Nie znaleziono "${itemName}" w spiżarni.`;
    await supabase.from('pantry').delete().eq('id', data.id);
    revalidatePath('/spizarnia');
    return `Usunięto ze spiżarni: ${data.name}`;
  }

  if (name === 'add_calendar_event') {
    const { error } = await supabase.from('calendar_events').insert({
      title: args.title,
      date: args.date,
      time: args.time ?? null,
      owner: args.owner,
      notes: args.notes ?? null,
    });
    revalidatePath('/kalendarz');
    if (error) return `Błąd kalendarza: ${error.message}`;
    return `Dodano do kalendarza: ${args.title} (${args.date}${args.time ? ' ' + args.time : ''}, ${args.owner})`;
  }

  return `Nieznane narzędzie: ${name}`;
}

// ─── Kontekst ─────────────────────────────────────────────────────────────────

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

  const pantryWithExpiry = (pantryRes.data || []).map(p => {
    const purchaseDate = new Date(p.purchase_date);
    const expiryDate = new Date(purchaseDate.getTime() + p.expiry_days * 86400000);
    const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / 86400000);
    return { ...p, daysLeft };
  });

  const expired      = pantryWithExpiry.filter(p => p.daysLeft < 0);
  const expiringSoon = pantryWithExpiry.filter(p => p.daysLeft >= 0 && p.daysLeft <= 3);
  const ok           = pantryWithExpiry.filter(p => p.daysLeft > 3);

  const pantryText = [
    expiringSoon.length > 0 ? `⚠️ KOŃCZĄ SIĘ: ${expiringSoon.map(p => `${p.name} (${p.quantity} ${p.unit}, ${p.daysLeft} dni)`).join('; ')}` : null,
    expired.length > 0      ? `❌ PRZETERMINOWANE: ${expired.map(p => p.name).join(', ')}` : null,
    ok.length > 0           ? `✅ OK: ${ok.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(', ')}` : null,
  ].filter(Boolean).join('\n') || 'spiżarnia pusta';

  const recipesText = (mealsRes.data || []).map(m => `[${m.name}] składniki: ${m.ingredients}`).join('\n');

  return `PROFIL: Adrian (cel 150-160g białka/dzień, shake ~47g/dzień), Kasia (cel 75-100g/dzień). Zakupy: soboty. Budżet: 220zł/mies.
DATA: ${today.toLocaleDateString('pl-PL')}
PLAN TYGODNIA (tydzień ${weekNum}): ${planText}
SPIŻARNIA:\n${pantryText}
RACHUNKI: ${billsText}
BAZA PRZEPISÓW (${mealsRes.data?.length || 0} dań):\n${recipesText}`;
}

// ─── Analiza obrazu przez model vision ───────────────────────────────────────

async function analyzeImage(client: Groq, imageBase64: string, imageMime: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'llama-3.2-11b-vision-preview',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
        { type: 'text', text: 'Opisz dokładnie co widzisz na tym obrazie. Jeśli to paragon — wypisz wszystkie produkty spożywcze z ilościami i cenami. Jeśli to coś innego — opisz co to jest.' },
      ],
    }],
  });
  return response.choices[0]?.message?.content ?? 'Nie udało się przeanalizować obrazu.';
}

// ─── Analiza PDF ─────────────────────────────────────────────────────────────

async function parsePDF(pdfBase64: string): Promise<string> {
  const buffer = Buffer.from(pdfBase64, 'base64');
  const data = await pdfParse(buffer);
  const text = data.text?.trim();
  if (!text) return '[PDF nie zawiera tekstu — może być zeskanowany obrazem]';
  return `[TREŚĆ PDF]:\n${text.slice(0, 3000)}`;
}

// ─── Główna funkcja ───────────────────────────────────────────────────────────

export async function sendMessage(messages: Message[], imageBase64?: string, imageMime?: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return 'Brak klucza GROQ_API_KEY.';

  const context = await getContext();
  const client = new Groq({ apiKey });

  const systemPrompt = `Jesteś Agentem Loszki — inteligentnym asystentem domowym Adriana i Kasi. Odpowiadasz po polsku, krótko i konkretnie.

MOŻESZ:
- Dodawać i usuwać produkty ze spiżarni (używaj narzędzi!)
- Dodawać wydarzenia do kalendarza (używaj narzędzi!)
- Gdy użytkownik wysyła paragon — AUTOMATYCZNIE dodaj produkty spożywcze do spiżarni
- Doradzać co ugotować bazując na spiżarni i terminach ważności
- Odpowiadać na pytania o budżet, rachunki, plan tygodnia

ZASADA: gdy możesz coś zrobić (dodać, usunąć, zapisać) — ZRÓB TO przez narzędzie, nie tylko mów że możesz.

GDY UŻYTKOWNIK WYSYŁA ZDJĘCIE PARAGONU:
1. Przeanalizuj opis obrazu i zidentyfikuj sklep oraz produkty
2. WYWOŁAJ add_to_pantry z produktami spożywczymi (mięso, nabiał, warzywa, owoce, pieczywo, suche produkty, napoje) — pomiń chemię i kosmetyki
3. WYWOŁAJ add_budget_entry z łączną kwotą i opisem sklepu (np. "Zakupy Lidl", "Biedronka") — kategoria: "jedzenie"
4. Potwierdź krótko co dodałeś do spiżarni i ile wydano

AKTUALNY KONTEKST:
${context}`;

  // Jeśli załącznik — analizuj: PDF przez text parser, obraz przez vision model
  let imageDescription = '';
  if (imageBase64 && imageMime) {
    try {
      if (imageMime === 'application/pdf') {
        imageDescription = await parsePDF(imageBase64);
      } else {
        imageDescription = await analyzeImage(client, imageBase64, imageMime);
      }
    } catch (e) {
      imageDescription = `[Nie udało się odczytać pliku: ${e instanceof Error ? e.message : String(e)}]`;
    }
  }

  // Buduj historię wiadomości
  const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-10).map((m, i) => {
      const isLast = i === Math.min(messages.length, 10) - 1;
      if (isLast && imageDescription) {
        return {
          role: m.role as 'user' | 'assistant',
          content: `${m.content}\n\n[OBRAZ - opis]: ${imageDescription}`,
        };
      }
      return { role: m.role as 'user' | 'assistant', content: m.content };
    }),
  ];

  // Wykryj intencję — jeśli użytkownik chce coś zapisać, wymuś użycie narzędzia
  const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() ?? '';
  // isActionIntent = true gdy użytkownik chce coś zapisać LUB wysyła zdjęcie (imageBase64 obecny)
  const isActionIntent = !!imageBase64 || /kalend|wydarzen|wpisz|dodaj do|zaplanuj|jutro|pojutrze|poniedzia|wtorek|środa|czwartek|piątek|sobota|niedziela|stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia|o \d{1,2}[:h]|kupiłem|kupiłam|kupił|zakup|paragon|przeanalizuj|zjadłem|zjadłam|zjedliśmy|zużyłem|wyrzuciłem/.test(lastUserMsg);

  try {
    // Pierwsza odpowiedź — wymuś narzędzie jeśli wykryto intencję akcji
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      tools: TOOLS,
      tool_choice: isActionIntent ? 'required' : 'auto',
      max_tokens: 1024,
    });
    console.log('[Agent] isActionIntent:', isActionIntent, '| tool_choice:', isActionIntent ? 'required' : 'auto');

    const choice = response.choices[0];
    console.log('[Agent] finish_reason:', choice.finish_reason, '| tool_calls:', JSON.stringify(choice.message.tool_calls ?? null));

    // Jeśli model chce wywołać narzędzia
    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
      const toolResults: string[] = [];

      for (const toolCall of choice.message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        console.log('[Agent] wywołuję narzędzie:', toolCall.function.name, JSON.stringify(args));
        const result = await executeTool(toolCall.function.name, args);
        console.log('[Agent] wynik narzędzia:', result);
        toolResults.push(result);
      }

      // Druga runda — model podsumowuje co zrobił
      const followUp = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          ...groqMessages,
          { role: 'assistant', content: choice.message.content ?? '', tool_calls: choice.message.tool_calls },
          ...choice.message.tool_calls.map((tc, i) => ({
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: toolResults[i],
          })),
        ],
        max_tokens: 512,
      });

      return followUp.choices[0]?.message?.content ?? toolResults.join('\n');
    }

    return choice.message.content ?? '';

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('429') || msg.includes('rate_limit')) {
      return '⚠️ Przekroczono limit zapytań. Spróbuj za chwilę.';
    }
    console.error('Agent error:', msg);
    return `❌ Błąd agenta: ${msg.slice(0, 200)}`;
  }
}

// ─── Historia chatu (Supabase sync) ──────────────────────────────────────────

export async function getChatHistory(): Promise<Message[]> {
  const { data, error } = await supabase
    .from('agent_chat')
    .select('role, content')
    .order('created_at', { ascending: true })
    .limit(100);
  if (error || !data?.length) return [];
  return data as Message[];
}

export async function saveChatMessages(msgs: Message[]): Promise<void> {
  if (!msgs.length) return;
  await supabase.from('agent_chat').insert(
    msgs.map(m => ({ role: m.role, content: m.content }))
  );
}

export async function clearChatHistory(): Promise<void> {
  await supabase.from('agent_chat').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}

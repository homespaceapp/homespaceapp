import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, getCurrentUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const { origin } = new URL(request.url);

  if (!token) return NextResponse.redirect(`${origin}/login?error=missing_token`);

  // Sprawdź token przez admin (pomija RLS, bo user jeszcze nie w householdzie)
  const { data: invite } = await supabaseAdmin
    .from('invite_tokens')
    .select('*, households(name)')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!invite) return NextResponse.redirect(`${origin}/invite/invalid`);

  const user = await getCurrentUser();

  if (!user) {
    // Przekieruj na login z invite tokenem w query — po magic link wróci tu
    return NextResponse.redirect(`${origin}/login?invite=${token}`);
  }

  // Sprawdź czy user już nie jest w tym householdzie
  const supabase = await getSupabaseServer();
  const { data: existing } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .eq('household_id', invite.household_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.redirect(`${origin}/kalendarz`);
  }

  // Dodaj usera do householdu (admin — bo user może nie mieć jeszcze uprawnień)
  await supabaseAdmin.from('household_members').insert({
    household_id: invite.household_id,
    user_id: user.id,
    role: 'member',
  });

  // Oznacz token jako użyty
  await supabaseAdmin.from('invite_tokens').update({
    used_at: new Date().toISOString(),
    used_by: user.id,
  }).eq('token', token);

  // Jeśli user miał automatycznie utworzony własny household przy rejestracji,
  // można go usunąć (opcjonalne) — zostawiamy, user może z niego korzystać

  return NextResponse.redirect(`${origin}/kalendarz?invite=accepted`);
}

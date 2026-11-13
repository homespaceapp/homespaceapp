import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') ?? '/kalendarz';
  const inviteToken = searchParams.get('invite');

  if (code) {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Jeśli user już ma household — przejdź do aplikacji
      const { data: existing } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', data.user.id)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        if (inviteToken) {
          // Redirect do akceptacji invite
          return NextResponse.redirect(`${origin}/api/invite/accept?token=${inviteToken}`);
        }
        // Stwórz nowy household dla nowego użytkownika
        const { data: household } = await supabase
          .from('households')
          .insert({ name: `Dom ${data.user.email?.split('@')[0] ?? 'nowy'}`, created_by: data.user.id })
          .select()
          .single();

        if (household) {
          await supabase.from('household_members').insert({
            household_id: household.id,
            user_id: data.user.id,
            role: 'owner',
          });
        }
      }

      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

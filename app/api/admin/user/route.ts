import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/db';

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { email, household_id } = await req.json();
  if (!email) return NextResponse.json({ error: 'missing email' }, { status: 400 });

  const { origin } = new URL(req.url);
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (household_id && data.user) {
    await supabaseAdmin.from('household_members').upsert({
      household_id, user_id: data.user.id, role: 'member',
    });
  }

  return NextResponse.json({ ok: true, user_id: data.user?.id });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id, banned } = await req.json();
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    ban_duration: banned ? '876000h' : 'none',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

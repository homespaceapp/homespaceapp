export function getSupabasePublicConfig() {
  const url =
    process.env.NEXT_PUBLIC_HOMESPACE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_HOMESPACE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Brak publicznej konfiguracji Supabase dla HomeSpace.');
  }

  return { url, anonKey };
}

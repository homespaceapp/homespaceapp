'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicConfig } from './supabase-config';

export function getSupabaseBrowser() {
  const { url, anonKey } = getSupabasePublicConfig();
  return createBrowserClient(
    url,
    anonKey
  );
}

'use client';

import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import type { Database } from '@/lib/database.types';

export function createClient() {
  return createBrowserClient<Database>(env.supabase.url!, env.supabase.anonKey!);
}

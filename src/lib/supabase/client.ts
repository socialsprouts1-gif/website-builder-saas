'use client';

import { createBrowserClient } from '@supabase/ssr';
import { env, isSupabaseConfigured } from '@/lib/env';
import { SupabaseNotConfiguredError } from './errors';
import type { Database } from '@/lib/database.types';

export function createClient() {
  if (!isSupabaseConfigured) throw new SupabaseNotConfiguredError();

  return createBrowserClient<Database>(env.supabase.url!, env.supabase.anonKey!);
}

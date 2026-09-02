import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { SupabaseNotConfiguredError } from './errors';
import type { Database } from '@/lib/database.types';

/**
 * Service-role client. Bypasses RLS, so it is only ever constructed inside
 * server-only modules (webhooks, background generation, rate limiting) and its
 * results are always scoped by an explicit user_id filter in the caller.
 */
export function createAdminClient() {
  if (!env.supabase.url || !env.supabase.serviceRoleKey) {
    throw new SupabaseNotConfiguredError();
  }
  return createClient<Database>(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

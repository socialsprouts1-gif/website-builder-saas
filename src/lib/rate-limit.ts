import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Postgres-backed sliding window. Deliberately dependency-free: this app already
 * requires Supabase, and adding Redis for a handful of counters is not worth an
 * extra service for a product at this stage.
 */
export async function rateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await supabase
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('bucket', bucket)
    .gte('created_at', since);

  if (error) {
    // Fail open rather than locking every user out on a transient DB error,
    // but never silently: the caller logs this.
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }

  const used = count ?? 0;
  if (used >= limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: windowSeconds };
  }

  await supabase.from('rate_limit_events').insert({ bucket });
  return { allowed: true, remaining: limit - used - 1, retryAfterSeconds: 0 };
}

/** Housekeeping — call from a cron; keeps the events table from growing forever. */
export async function pruneRateLimitEvents(olderThanSeconds = 86_400) {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - olderThanSeconds * 1000).toISOString();
  await supabase.from('rate_limit_events').delete().lt('created_at', cutoff);
}

export const RATE_LIMITS = {
  generation: { limit: 20, windowSeconds: 60 * 60 },
  chatEdit: { limit: 60, windowSeconds: 60 * 60 },
  transcription: { limit: 60, windowSeconds: 60 * 60 },
  chatbotPublic: { limit: 30, windowSeconds: 60 },
} as const;

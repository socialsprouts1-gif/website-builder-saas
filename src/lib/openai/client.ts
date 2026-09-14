import 'server-only';
import OpenAI from 'openai';
import { env, CREDIT_COST, WELCOME_CREDITS, type CreditedEvent } from '@/lib/env';
import { getAllowance } from '@/lib/allowance';
import { decryptSecret } from '@/lib/crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type KeySource = 'platform' | 'byok';

export interface ResolvedKey {
  apiKey: string;
  source: KeySource;
  /** Credits left today on the platform key; Infinity when BYOK. */
  creditsRemaining: number;
}

export class NoKeyAvailableError extends Error {
  constructor(public readonly reason: 'not_configured' | 'quota_exhausted') {
    super(
      reason === 'quota_exhausted'
        ? "You have used your welcome credits and today's allowance. More free credits arrive at midnight UTC — or add your own OpenAI key and there is no limit at all."
        : 'No OpenAI key is configured. Add your own key in Settings → API keys to start generating.',
    );
    this.name = 'NoKeyAvailableError';
  }
}

/** Midnight UTC tonight — when the allowance resets. */
export function creditsResetAt(): Date {
  const reset = new Date();
  reset.setUTCHours(24, 0, 0, 0);
  return reset;
}

function startOfUtcDay(): string {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString();
}

/**
 * Credits drawn on the platform key so far today.
 *
 * Weights are applied at read time from CREDIT_COST rather than stored, so
 * there is no extra column to migrate and existing rows are priced correctly.
 */
async function platformCreditsUsedToday(userId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('usage_events')
    .select('event_type')
    .eq('user_id', userId)
    .eq('key_source', 'platform')
    .gte('created_at', startOfUtcDay())
    .limit(2000);

  return (data ?? []).reduce(
    (total, row) => total + (CREDIT_COST[row.event_type as CreditedEvent] ?? 0),
    0,
  );
}

/**
 * Everything this account has ever spent on the shared key.
 *
 * The welcome grant is derived from this rather than stored as a balance: there
 * is no column to keep in step, no double-spend to guard against, and a refund
 * is a deleted row. Free accounts have a handful of rows, so the read is cheap.
 */
async function platformCreditsUsedEver(userId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('usage_events')
    .select('event_type')
    .eq('user_id', userId)
    .eq('key_source', 'platform')
    .limit(5000);

  return (data ?? []).reduce(
    (total, row) => total + (CREDIT_COST[row.event_type as CreditedEvent] ?? 0),
    0,
  );
}

/** Welcome grant left, and today's allowance left, as two separate pots. */
async function pots(userId: string, dailyCredits: number) {
  const [usedToday, usedEver] = await Promise.all([
    platformCreditsUsedToday(userId),
    platformCreditsUsedEver(userId),
  ]);

  const welcome = Math.max(0, WELCOME_CREDITS - usedEver);
  const today = Math.max(0, dailyCredits - usedToday);
  return { usedToday, usedEver, welcome, today, total: welcome + today };
}

/**
 * BYOK first — unlimited, billed to the user's own OpenAI account — and only
 * then Lumen's pooled key, for as many credits as the day has left.
 *
 * `intent` is what the caller is about to spend, so the check happens before
 * the money is spent rather than after.
 */
export async function resolveApiKey(
  userId: string,
  intent: CreditedEvent = 'generation',
): Promise<ResolvedKey> {
  const supabase = createAdminClient();

  const { data: keyRow } = await supabase
    .from('api_keys')
    .select('encrypted_key')
    .eq('user_id', userId)
    .eq('provider', 'openai')
    .eq('is_active', true)
    .maybeSingle();

  if (keyRow?.encrypted_key) {
    try {
      return { apiKey: decryptSecret(keyRow.encrypted_key), source: 'byok', creditsRemaining: Infinity };
    } catch {
      // A key that will not decrypt (rotated master key) falls through to the
      // platform key rather than hard-failing the user's generation.
    }
  }

  if (!env.openai.platformKey) throw new NoKeyAvailableError('not_configured');

  const allowance = await getAllowance(userId);

  // Admins are never metered.
  if (allowance.unlimited) {
    return { apiKey: env.openai.platformKey, source: 'platform', creditsRemaining: Infinity };
  }

  // The welcome grant is spent first and never refills; the daily allowance is
  // what is left after it. A new account therefore has enough to finish a site
  // rather than enough to start one.
  const { total } = await pots(userId, allowance.dailyCredits);

  // Refuse when the call would overdraw, not merely when the balance is zero.
  if (total < CREDIT_COST[intent]) throw new NoKeyAvailableError('quota_exhausted');

  return { apiKey: env.openai.platformKey, source: 'platform', creditsRemaining: total };
}

/**
 * A key for metadata only — listing models costs nothing, so it must not be
 * blocked by, or counted against, the daily allowance.
 */
export async function resolveApiKeyForMetadata(userId: string): Promise<ResolvedKey | null> {
  try {
    return await resolveApiKey(userId, 'transcription');
  } catch {
    return null;
  }
}

/** Read-only view of quota for settings/usage screens. */
export async function getKeyStatus(userId: string) {
  const supabase = createAdminClient();
  const { data: keyRow } = await supabase
    .from('api_keys')
    .select('last4, validated_at')
    .eq('user_id', userId)
    .eq('provider', 'openai')
    .eq('is_active', true)
    .maybeSingle();

  const allowance = await getAllowance(userId);
  const balance = allowance.unlimited
    ? { usedToday: 0, welcome: 0, today: allowance.dailyCredits, total: allowance.dailyCredits }
    : await pots(userId, allowance.dailyCredits);

  return {
    hasOwnKey: Boolean(keyRow),
    last4: keyRow?.last4 ?? null,
    validatedAt: keyRow?.validated_at ?? null,
    platformConfigured: Boolean(env.openai.platformKey),
    tier: allowance.tier,
    unlimited: allowance.unlimited,
    creditsUsed: balance.usedToday,
    creditsLimit: allowance.dailyCredits,
    /** Grant left. Shown separately because it does not come back tomorrow. */
    welcomeRemaining: balance.welcome,
    welcomeTotal: WELCOME_CREDITS,
    creditsRemaining: balance.total,
    resetsAt: creditsResetAt().toISOString(),
  };
}

export function openaiFor(apiKey: string): OpenAI {
  // Retries are handled by callWithRetry so each wait can be reported; leaving
  // them on here would multiply the delay and hide it. The timeout is the
  // longest a single streamed completion should ever legitimately take.
  return new OpenAI({ apiKey, maxRetries: 0, timeout: 120_000 });
}

/** One cheap, harmless call to prove a pasted key works before we store it. */
export async function validateKey(apiKey: string): Promise<{ ok: true; modelCount: number } | { ok: false; error: string }> {
  try {
    const client = new OpenAI({ apiKey, maxRetries: 0, timeout: 15_000 });
    const models = await client.models.list();
    return { ok: true, modelCount: models.data.length };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Key validation failed';
    return { ok: false, error: message.includes('401') ? 'That key was rejected by OpenAI.' : message };
  }
}

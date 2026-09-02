import 'server-only';
import OpenAI from 'openai';
import { env, CREDIT_COST, DAILY_PLATFORM_CREDITS, type CreditedEvent } from '@/lib/env';
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
        ? "You have used today's free credits. They reset at midnight UTC — or add your own OpenAI key in Settings → API keys for no limit at all."
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

  const used = await platformCreditsUsedToday(userId);
  const remaining = Math.max(0, DAILY_PLATFORM_CREDITS - used);

  // Refuse when the call would overdraw, not merely when the balance is zero.
  if (remaining < CREDIT_COST[intent]) throw new NoKeyAvailableError('quota_exhausted');

  return { apiKey: env.openai.platformKey, source: 'platform', creditsRemaining: remaining };
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

  const used = await platformCreditsUsedToday(userId);

  return {
    hasOwnKey: Boolean(keyRow),
    last4: keyRow?.last4 ?? null,
    validatedAt: keyRow?.validated_at ?? null,
    platformConfigured: Boolean(env.openai.platformKey),
    creditsUsed: used,
    creditsLimit: DAILY_PLATFORM_CREDITS,
    creditsRemaining: Math.max(0, DAILY_PLATFORM_CREDITS - used),
    resetsAt: creditsResetAt().toISOString(),
  };
}

export function openaiFor(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, maxRetries: 2, timeout: 180_000 });
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

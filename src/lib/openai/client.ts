import 'server-only';
import OpenAI from 'openai';
import { env, CREDIT_COST, FREE_CREDITS, type CreditedEvent } from '@/lib/env';
import { getAllowance } from '@/lib/allowance';
import {
  NoKeyAvailableError,
  canAfford,
  totalCredits,
  type CreditBalance,
} from '@/lib/credits';
import { decryptSecret } from '@/lib/crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type KeySource = 'platform' | 'byok';

export interface ResolvedKey {
  apiKey: string;
  source: KeySource;
  /** Credits left today on the platform key; Infinity when BYOK. */
  creditsRemaining: number;
}

export { NoKeyAvailableError } from '@/lib/credits';

/**
 * When a paid plan's allowance comes back: the start of next month, UTC.
 *
 * A calendar month rather than the subscription's own anniversary. It is one
 * day's difference to anybody's advantage or disadvantage, and it is the
 * version a person can state without looking anything up — "it refreshes when
 * the month turns over" — which matters more than the arithmetic.
 */
export function creditsResetAt(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

function startOfUtcMonth(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * Credits drawn on the platform key so far this month.
 *
 * Weights are applied at read time from CREDIT_COST rather than stored, so
 * there is no extra column to migrate and existing rows are priced correctly.
 */
async function platformCreditsUsedThisMonth(userId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('usage_events')
    .select('event_type')
    .eq('user_id', userId)
    .eq('key_source', 'platform')
    .gte('created_at', startOfUtcMonth())
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

/**
 * What this account has left, as the shape every screen and every refusal
 * reads. The two pots stay separate because only one of them comes back.
 */
export async function creditBalance(userId: string): Promise<CreditBalance> {
  const allowance = await getAllowance(userId);

  if (allowance.unlimited) {
    return {
      tier: allowance.tier,
      unlimited: true,
      freeRemaining: FREE_CREDITS,
      freeTotal: FREE_CREDITS,
      periodRemaining: 0,
      periodLimit: 0,
    };
  }

  const [usedThisMonth, usedEver] = await Promise.all([
    platformCreditsUsedThisMonth(userId),
    platformCreditsUsedEver(userId),
  ]);

  return {
    tier: allowance.tier,
    unlimited: false,
    freeRemaining: Math.max(0, FREE_CREDITS - usedEver),
    freeTotal: FREE_CREDITS,
    periodRemaining: Math.max(0, allowance.monthlyCredits - usedThisMonth),
    periodLimit: allowance.monthlyCredits,
  };
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

  const balance = await creditBalance(userId);

  // Admins are never metered.
  if (balance.unlimited) {
    return { apiKey: env.openai.platformKey, source: 'platform', creditsRemaining: Infinity };
  }

  // The free grant is spent first and never refills; a paid plan's monthly
  // allowance is what follows it. Refuse when the call would overdraw, not
  // merely when the balance has already reached zero.
  if (!canAfford(balance, CREDIT_COST[intent])) {
    throw new NoKeyAvailableError('quota_exhausted', balance);
  }

  return {
    apiKey: env.openai.platformKey,
    source: 'platform',
    creditsRemaining: totalCredits(balance),
  };
}

/**
 * A key for metadata only — listing models costs nothing, so it must not be
 * blocked by, or counted against, the allowance.
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

  const balance = await creditBalance(userId);

  return {
    hasOwnKey: Boolean(keyRow),
    last4: keyRow?.last4 ?? null,
    validatedAt: keyRow?.validated_at ?? null,
    platformConfigured: Boolean(env.openai.platformKey),
    balance,
    tier: balance.tier,
    unlimited: balance.unlimited,
    creditsRemaining: totalCredits(balance),
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

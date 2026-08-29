import 'server-only';
import OpenAI from 'openai';
import { env, FREE_PLATFORM_GENERATIONS_PER_MONTH } from '@/lib/env';
import { decryptSecret } from '@/lib/crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type KeySource = 'platform' | 'byok';

export interface ResolvedKey {
  apiKey: string;
  source: KeySource;
  /** Remaining free platform generations this month; Infinity when BYOK. */
  remainingFree: number;
}

export class NoKeyAvailableError extends Error {
  constructor(public readonly reason: 'not_configured' | 'quota_exhausted') {
    super(
      reason === 'quota_exhausted'
        ? 'Your free generations for this month are used up. Add your own OpenAI key in Settings → API keys for unlimited generations.'
        : 'No OpenAI key is configured. Add your own key in Settings → API keys to start generating.',
    );
    this.name = 'NoKeyAvailableError';
  }
}

async function platformGenerationsUsedThisMonth(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('key_source', 'platform')
    .eq('event_type', 'generation')
    .gte('created_at', monthStart.toISOString());

  return count ?? 0;
}

/**
 * BYOK first (unlimited, billed to the user's own OpenAI account), otherwise
 * Lumen's pooled platform key up to the monthly free allowance.
 */
export async function resolveApiKey(userId: string): Promise<ResolvedKey> {
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
      return { apiKey: decryptSecret(keyRow.encrypted_key), source: 'byok', remainingFree: Infinity };
    } catch {
      // A key that will not decrypt (rotated master key) falls through to the
      // platform key rather than hard-failing the user's generation.
    }
  }

  if (!env.openai.platformKey) throw new NoKeyAvailableError('not_configured');

  const used = await platformGenerationsUsedThisMonth(userId);
  const remainingFree = Math.max(0, FREE_PLATFORM_GENERATIONS_PER_MONTH - used);
  if (remainingFree <= 0) throw new NoKeyAvailableError('quota_exhausted');

  return { apiKey: env.openai.platformKey, source: 'platform', remainingFree };
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

  const used = await platformGenerationsUsedThisMonth(userId);

  return {
    hasOwnKey: Boolean(keyRow),
    last4: keyRow?.last4 ?? null,
    validatedAt: keyRow?.validated_at ?? null,
    platformConfigured: Boolean(env.openai.platformKey),
    freeUsed: used,
    freeLimit: FREE_PLATFORM_GENERATIONS_PER_MONTH,
    freeRemaining: Math.max(0, FREE_PLATFORM_GENERATIONS_PER_MONTH - used),
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

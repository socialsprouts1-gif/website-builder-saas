import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { KeySource } from '@/lib/openai/client';

/**
 * Rough blended $/1M-token rates used only to give the founder a spend signal
 * in /admin and the user a "what did this cost" number. Update alongside
 * OpenAI's pricing page; unknown models fall back to the default row.
 */
const RATES: Record<string, { in: number; out: number }> = {
  default: { in: 2.5, out: 10 },
  mini: { in: 0.25, out: 1 },
  nano: { in: 0.1, out: 0.4 },
  embedding: { in: 0.02, out: 0 },
};

function rateFor(model: string) {
  if (model.includes('embedding')) return RATES.embedding;
  if (model.includes('nano')) return RATES.nano;
  if (model.includes('mini')) return RATES.mini;
  return RATES.default;
}

export function estimateCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const rate = rateFor(model);
  return Number((((tokensIn * rate.in) + (tokensOut * rate.out)) / 1_000_000).toFixed(6));
}

export async function recordUsage(params: {
  userId: string;
  projectId?: string | null;
  eventType: 'generation' | 'chat_edit' | 'vision' | 'transcription' | 'embedding' | 'chatbot_reply' | 'image';
  model: string;
  keySource: KeySource;
  tokensIn?: number;
  tokensOut?: number;
}) {
  const tokensIn = params.tokensIn ?? 0;
  const tokensOut = params.tokensOut ?? 0;

  const supabase = createAdminClient();
  await supabase.from('usage_events').insert({
    user_id: params.userId,
    project_id: params.projectId ?? null,
    event_type: params.eventType,
    model: params.model,
    key_source: params.keySource,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_usd: estimateCostUsd(params.model, tokensIn, tokensOut),
  });
}

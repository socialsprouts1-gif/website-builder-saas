import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * What a site's assistant is allowed to answer, and who pays for it.
 *
 * Separate from build credits on purpose, and the reason is the owner rather
 * than the accounting: somebody who has spent their build credits still wants
 * the assistant on their live site answering customers. A visitor asking "do
 * you deliver to Pune" is not the owner generating a website, and charging it
 * to the same bucket means a busy shop goes quiet the moment the owner has
 * finished building.
 *
 * So: a free monthly allowance on Lumen's key, then the owner's own key. A
 * site with its own key is never metered here — they are paying their provider
 * directly and Lumen has no business counting it.
 */
export const FREE_REPLIES = 10;

export interface ChatAllowance {
  /** Whether this reply may be answered at all. */
  allowed: boolean;
  /** Whose key pays. */
  source: 'own' | 'platform';
  used: number;
  remaining: number;
  /** What to say to the visitor when it is not allowed. */
  message?: string;
}

/** Year and month, which is what a period is compared on rather than a job. */
export function periodKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export interface ChatbotMeter {
  id: string;
  replies_used: number;
  replies_period: string | null;
  own_key_cipher: string | null;
}

/**
 * Decides, without writing anything.
 *
 * A period that has rolled over reads as zero used rather than being reset by
 * a scheduled job — there is no job, and one that failed would silently stop
 * everybody's assistant. The counter is corrected on the next successful
 * reply, which is the only moment the number matters.
 */
export function checkAllowance(meter: ChatbotMeter, now = new Date()): ChatAllowance {
  if (meter.own_key_cipher) {
    return { allowed: true, source: 'own', used: 0, remaining: Number.POSITIVE_INFINITY };
  }

  const current = periodKey(now);
  const used = meter.replies_period === current ? meter.replies_used : 0;
  const remaining = Math.max(0, FREE_REPLIES - used);

  if (remaining <= 0) {
    return {
      allowed: false,
      source: 'platform',
      used,
      remaining: 0,
      // Said to a visitor, so it is about them rather than about billing.
      // "The owner has not paid" is not a customer's problem to read.
      message:
        'I have answered as many questions as I can this month. Please use the contact form or call, and someone will come back to you.',
    };
  }

  return { allowed: true, source: 'platform', used, remaining };
}

/** Counts one answered reply. Only ever called after a successful answer. */
export async function recordReply(meter: ChatbotMeter, now = new Date()): Promise<void> {
  if (meter.own_key_cipher) return;

  const current = periodKey(now);
  const used = meter.replies_period === current ? meter.replies_used : 0;

  await createAdminClient()
    .from('chatbots')
    .update({ replies_used: used + 1, replies_period: current })
    .eq('id', meter.id);
}

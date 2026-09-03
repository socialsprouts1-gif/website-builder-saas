import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { isEntitled } from '@/lib/razorpay';
import { isBillingConfigured } from '@/lib/env';
import type { SubscriptionRow } from '@/lib/database.types';

export interface BillingState {
  subscription: SubscriptionRow | null;
  /** On a paid plan. Raises the daily ceiling — it never gates access. */
  entitled: boolean;
  daysLeft: number | null;
  hoursLeft: number | null;
  billingConfigured: boolean;
}

/**
 * Every account gets a row on the free tier.
 *
 * Free is permanent, not a countdown: nothing here expires and nothing here
 * blocks the product. Subscribing swaps the row to an active plan, which only
 * raises the daily credit ceiling (see getAllowance).
 */
export async function ensureSubscriptionRow(userId: string): Promise<SubscriptionRow> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('subscriptions')
    .insert({ user_id: userId, status: 'free', current_period_end: null })
    .select('*')
    .single();

  if (error || !created) throw new Error(error?.message ?? 'Could not set up your account');
  return created;
}

export async function getBillingState(userId: string): Promise<BillingState> {
  const subscription = await ensureSubscriptionRow(userId).catch(() => null);

  const entitled = isEntitled(subscription?.status, subscription?.current_period_end);
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  const msLeft = periodEnd ? Math.max(0, periodEnd.getTime() - Date.now()) : null;
  const daysLeft = msLeft === null ? null : Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  const hoursLeft = msLeft === null ? null : Math.ceil(msLeft / (60 * 60 * 1000));

  return {
    subscription,
    entitled,
    daysLeft,
    hoursLeft,
    billingConfigured: isBillingConfigured,
  };
}

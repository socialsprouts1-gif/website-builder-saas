import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { isEntitled, TRIAL_DAYS } from '@/lib/razorpay';
import { isBillingConfigured } from '@/lib/env';
import type { SubscriptionRow } from '@/lib/database.types';

export interface BillingState {
  subscription: SubscriptionRow | null;
  entitled: boolean;
  onTrial: boolean;
  daysLeft: number | null;
  hoursLeft: number | null;
  billingConfigured: boolean;
}

/**
 * Every account starts on a trial row so a new user can build their first site
 * before paying — the gate is then a single `entitled` check everywhere, rather
 * than a special case scattered through the app.
 */
export async function ensureSubscriptionRow(userId: string): Promise<SubscriptionRow> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return existing;

  const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: created, error } = await supabase
    .from('subscriptions')
    .insert({ user_id: userId, status: 'trialing', current_period_end: trialEnd })
    .select('*')
    .single();

  if (error || !created) throw new Error(error?.message ?? 'Could not start your trial');
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
    onTrial: subscription?.status === 'trialing',
    daysLeft,
    hoursLeft,
    billingConfigured: isBillingConfigured,
  };
}

/** Used by the generation endpoints to refuse work on a lapsed account. */
export async function requireEntitlement(userId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const state = await getBillingState(userId);
  if (state.entitled) return { ok: true };
  return {
    ok: false,
    reason: state.onTrial
      ? 'Your trial has ended. Subscribe in Settings → Billing to keep building.'
      : 'Your subscription is not active. Update it in Settings → Billing to keep building.',
  };
}

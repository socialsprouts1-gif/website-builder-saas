import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { isEntitled } from '@/lib/razorpay';
import type { Tier } from '@/lib/credits';
import { FREE_PLAN, planByKey } from '@/lib/plans';

export type { Tier };

export interface Allowance {
  tier: Tier;
  /** Daily credits on the shared key: none on free, Infinity for admins. */
  dailyCredits: number;
  /** True when nothing here should be metered or rate limited. */
  unlimited: boolean;
}

/**
 * What an account is allowed, in one place.
 *
 * The free tier is a one-time grant rather than a daily allowance, so a free
 * account has no daily credits at all — see FREE_CREDITS. Subscribing is what
 * turns the tap on: a paid account gets its plan's daily credits, every day.
 *
 * Nothing here takes anything away. A free account whose grant is spent keeps
 * its sites, keeps them published, and can still export them; what stops is
 * generating new ones on Lumen's key.
 *
 * Admins are exempt from all of it.
 */
export async function getAllowance(userId: string): Promise<Allowance> {
  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from('users')
    .select('email, is_admin')
    .eq('id', userId)
    .maybeSingle();

  const bootstrapAdmin = user?.email
    ? env.adminEmails.includes(user.email.toLowerCase())
    : false;

  if (user?.is_admin || bootstrapAdmin) {
    return { tier: 'admin', dailyCredits: Infinity, unlimited: true };
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, plan')
    .eq('user_id', userId)
    .maybeSingle();

  if (isEntitled(subscription?.status, subscription?.current_period_end)) {
    // The plan decides the tier and the credits together. An unrecognised value
    // — a row from before the catalogue existed — is treated as the cheapest
    // paid plan rather than as premium: the mistake that costs Lumen money is
    // better than the one that gives somebody a tier they did not buy.
    const plan = planByKey(subscription?.plan) ?? planFallback();
    return { tier: plan.tier, dailyCredits: plan.dailyCredits, unlimited: false };
  }

  // No daily bucket on free. The grant is the whole of it.
  return { tier: 'free', dailyCredits: FREE_PLAN.dailyCredits, unlimited: false };
}

/** A paid row whose plan we cannot read is still a paying customer. */
function planFallback() {
  return planByKey('pro_monthly') ?? FREE_PLAN;
}

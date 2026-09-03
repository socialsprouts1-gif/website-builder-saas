import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { DAILY_PLATFORM_CREDITS, PRO_DAILY_PLATFORM_CREDITS, env } from '@/lib/env';
import { isEntitled } from '@/lib/razorpay';

export type Tier = 'admin' | 'pro' | 'free';

export interface Allowance {
  tier: Tier;
  /** Daily credits on the shared key; Infinity for admins. */
  dailyCredits: number;
  /** True when nothing here should be metered or rate limited. */
  unlimited: boolean;
}

/**
 * What an account is allowed, in one place.
 *
 * Lumen is freemium: the free tier is permanent, not a countdown. Signing up
 * gets you a daily allowance forever; paying raises the ceiling. Nothing about
 * billing blocks access to the product — running out of credits for the day is
 * the only limit a free user meets.
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
    .select('status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (isEntitled(subscription?.status, subscription?.current_period_end)) {
    return { tier: 'pro', dailyCredits: PRO_DAILY_PLATFORM_CREDITS, unlimited: false };
  }

  return { tier: 'free', dailyCredits: DAILY_PLATFORM_CREDITS, unlimited: false };
}

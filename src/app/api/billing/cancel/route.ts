import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cancelSubscription } from '@/lib/razorpay';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * One click, no retention flow. Cancels at period end so the user keeps the
 * time they already paid for (spec Section 12).
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const admin = createAdminClient();
    const { data: subscription } = await admin
      .from('subscriptions')
      .select('id, razorpay_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!subscription?.razorpay_subscription_id) {
      return jsonError('There is no active subscription to cancel.', 409);
    }

    await cancelSubscription(subscription.razorpay_subscription_id);

    await admin
      .from('subscriptions')
      .update({ cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', subscription.id);

    return NextResponse.json({ cancelled: true });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

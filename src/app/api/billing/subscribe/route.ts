import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSubscription } from '@/lib/razorpay';
import { ensureSubscriptionRow } from '@/lib/billing';
import { subscribeSchema } from '@/lib/validation';
import { env } from '@/lib/env';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const body = subscribeSchema.parse(await request.json().catch(() => ({})));
    const gstin = body.gstin?.trim() || null;

    await ensureSubscriptionRow(user.id);

    const subscription = await createSubscription({
      userId: user.id,
      email: user.email ?? '',
      gstin,
    });

    const admin = createAdminClient();
    await admin
      .from('subscriptions')
      .update({
        razorpay_subscription_id: subscription.id,
        status: subscription.status,
        gstin,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return NextResponse.json({
      subscriptionId: subscription.id,
      shortUrl: subscription.shortUrl,
      keyId: env.razorpay.keyId,
    });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { handleRouteError, jsonError } from '@/lib/api';
import { logError } from '@/lib/errors';
import { shopPaymentKeys } from '@/lib/shop/gateway';
import { verifyPaymentSignature } from '@/lib/shop/payments';

export const runtime = 'nodejs';

const schema = z.object({
  razorpay_order_id: z.string().trim().min(6).max(80),
  razorpay_payment_id: z.string().trim().min(6).max(80),
  razorpay_signature: z.string().trim().length(64),
});

/**
 * "That payment went through" — checked, never believed.
 *
 * The browser tells us an order was paid. Of course it does; anybody can post
 * this. What makes it true is the signature, which only somebody holding the
 * shop owner's key secret could have produced, and which is bound to the exact
 * gateway order id we created from our own total. A customer cannot pay ₹1 for
 * a ₹4,000 order and have it accepted, because the amount was never theirs to
 * choose and is not read from this request at all.
 *
 * The order is found by the gateway's order id, so a signature valid for some
 * other shop's order matches nothing here.
 *
 * The preview twin of /api/shop/[slug]/paid, for an owner testing their own
 * checkout before publishing. Same verification, no weaker.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await context.params;

    const limit = await rateLimit(`paid:${clientAddress(request)}`, 30, 60 * 10);
    if (!limit.allowed) return jsonError('Too many attempts. Please try again shortly.', 429);

    const body = schema.parse(await request.json());
    const admin = createAdminClient();

    const { data: project } = await admin
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .maybeSingle();

    if (!project) return jsonError('This shop is not taking orders.', 404);

    const { data: order } = await admin
      .from('shop_orders')
      .select('id, status, paid_at')
      .eq('project_id', project.id)
      .eq('payment_order_id', body.razorpay_order_id)
      .maybeSingle();

    // No order for that gateway id in this shop. Says nothing about which part
    // was wrong.
    if (!order) return jsonError('That payment could not be matched to an order.', 404);

    // Already settled. Answered as success: the customer pressing back and
    // forward twice has not done anything wrong, and a second confirmation must
    // not read as a failure.
    if (order.paid_at) return NextResponse.json({ paid: true });

    const keys = await shopPaymentKeys(project.id);
    if (!keys) return jsonError('This shop cannot verify payments right now.', 409);

    const ok = verifyPaymentSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
      keySecret: keys.keySecret,
    });

    if (!ok) {
      // Worth knowing about: a bad signature is either a broken integration or
      // somebody trying it on, and both are things the owner should see.
      await logError({
        scope: 'shop.payment.signature',
        error: new Error('Payment signature did not verify'),
        projectId: project.id,
      });
      return jsonError('That payment could not be verified.', 422);
    }

    await admin
      .from('shop_orders')
      .update({
        status: order.status === 'placed' ? 'paid' : order.status,
        payment_id: body.razorpay_payment_id,
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    return NextResponse.json({ paid: true });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

function clientAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

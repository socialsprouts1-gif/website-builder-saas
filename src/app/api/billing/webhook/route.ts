import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { planForRazorpayId, verifyWebhookSignature } from '@/lib/razorpay';
import { statusForEvent } from '@/lib/billing-events';

export const runtime = 'nodejs';

/**
 * Razorpay subscription webhooks. The raw body is read as text and the
 * signature verified before anything is trusted or written (spec Section 16).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayEvent;
  } catch {
    return NextResponse.json({ error: 'Malformed payload' }, { status: 400 });
  }

  const admin = createAdminClient();
  const subscriptionEntity = event.payload?.subscription?.entity;
  const paymentEntity = event.payload?.payment?.entity;
  const invoiceEntity = event.payload?.invoice?.entity;

  const razorpaySubscriptionId =
    subscriptionEntity?.id ?? invoiceEntity?.subscription_id ?? null;
  if (!razorpaySubscriptionId) return NextResponse.json({ ignored: true });

  const { data: row } = await admin
    .from('subscriptions')
    .select('id, user_id, gstin')
    .eq('razorpay_subscription_id', razorpaySubscriptionId)
    .maybeSingle();

  // A webhook for a subscription we never recorded is not an error — it may be
  // a retry that arrived before our own create call committed.
  if (!row) return NextResponse.json({ ignored: true });

  const nextStatus = statusForEvent(event.event, subscriptionEntity?.status);

  // The tier comes from the plan that was actually charged for, not from what
  // the subscribe route wrote down before the money moved. Somebody who upgrades
  // on Razorpay's own page never touches our route at all.
  const paidPlan = planForRazorpayId(subscriptionEntity?.plan_id);
  const periodEnd = subscriptionEntity?.current_end
    ? new Date(subscriptionEntity.current_end * 1000).toISOString()
    : null;

  // An event that says nothing about the subscription's status leaves it alone.
  // Only the invoice below is written for those.
  if (nextStatus || periodEnd || paidPlan || event.event === 'subscription.cancelled') {
    await admin
      .from('subscriptions')
      .update({
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(paidPlan ? { plan: paidPlan.key } : {}),
        ...(periodEnd ? { current_period_end: periodEnd } : {}),
        ...(event.event === 'subscription.cancelled'
          ? { cancelled_at: new Date().toISOString() }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
  }

  if (event.event === 'subscription.charged' && (invoiceEntity || paymentEntity)) {
    const invoiceId = invoiceEntity?.id ?? null;
    // Idempotent: a Razorpay retry must not create a duplicate invoice row.
    const { data: existing } = invoiceId
      ? await admin.from('invoices').select('id').eq('razorpay_invoice_id', invoiceId).maybeSingle()
      : { data: null };

    if (!existing) {
      await admin.from('invoices').insert({
        subscription_id: row.id,
        razorpay_invoice_id: invoiceId,
        razorpay_payment_id: paymentEntity?.id ?? null,
        amount_paise: invoiceEntity?.amount ?? paymentEntity?.amount ?? 0,
        currency: invoiceEntity?.currency ?? paymentEntity?.currency ?? 'INR',
        gstin: row.gstin,
        pdf_url: invoiceEntity?.short_url ?? null,
        status: 'paid',
        issued_at: invoiceEntity?.issued_at
          ? new Date(invoiceEntity.issued_at * 1000).toISOString()
          : new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ received: true });
}

interface RazorpayEvent {
  event: string;
  payload?: {
    subscription?: {
      entity?: { id: string; status?: string; current_end?: number; plan_id?: string };
    };
    payment?: { entity?: { id: string; amount?: number; currency?: string } };
    invoice?: {
      entity?: {
        id: string;
        subscription_id?: string;
        amount?: number;
        currency?: string;
        short_url?: string;
        issued_at?: number;
      };
    };
  };
}

import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyWebhookSignature } from '@/lib/razorpay';

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

  const nextStatus = mapStatus(event.event, subscriptionEntity?.status);
  const periodEnd = subscriptionEntity?.current_end
    ? new Date(subscriptionEntity.current_end * 1000).toISOString()
    : null;

  await admin
    .from('subscriptions')
    .update({
      status: nextStatus,
      ...(periodEnd ? { current_period_end: periodEnd } : {}),
      ...(event.event === 'subscription.cancelled' ? { cancelled_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id);

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

function mapStatus(eventName: string, entityStatus?: string): string {
  switch (eventName) {
    case 'subscription.activated':
    case 'subscription.charged':
      return 'active';
    case 'subscription.halted':
      return 'halted';
    case 'subscription.cancelled':
      return 'cancelled';
    case 'subscription.completed':
      return 'completed';
    case 'subscription.pending':
    case 'payment.failed':
      return 'pending';
    default:
      return entityStatus ?? 'active';
  }
}

interface RazorpayEvent {
  event: string;
  payload?: {
    subscription?: { entity?: { id: string; status?: string; current_end?: number } };
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

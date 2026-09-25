import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Taking money on somebody else's shop.
 *
 * The owner connects their own Razorpay account, so the payment goes to them
 * and Lumen never touches it — no settlement account, no split, no liability
 * for a refund. Their key secret stays on the server and is used for exactly
 * two things: creating the order, and checking that the payment the browser
 * came back with is real.
 *
 * Everything security-critical here is a pure function, because the failure
 * mode is a customer paying ₹1 for a ₹4,000 order and the server believing
 * them. Nothing in this file reads an amount, an order id or a success flag
 * from the browser and acts on it.
 */

export interface RazorpayKeys {
  keyId: string;
  keySecret: string;
}

/** A Razorpay key id is public — it goes to the browser. The secret never does. */
export function looksLikeRazorpayKeyId(value: string | undefined | null): boolean {
  return typeof value === 'string' && /^rzp_(test|live)_[A-Za-z0-9]{6,}$/.test(value.trim());
}

export function razorpayKeysFrom(
  credentials: Record<string, string> | null | undefined,
): RazorpayKeys | null {
  const keyId = credentials?.key_id?.trim();
  const keySecret = credentials?.key_secret?.trim();
  if (!keyId || !keySecret) return null;
  if (!looksLikeRazorpayKeyId(keyId)) return null;
  return { keyId, keySecret };
}

/**
 * Razorpay signs `order_id|payment_id` with the key secret.
 *
 * Compared in constant time: a comparison that returns early leaks, one byte
 * at a time, how much of a guess was right, and a signature is exactly the
 * kind of value somebody would sit and guess at.
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const { orderId, paymentId, signature, keySecret } = params;
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

  const expected = createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature.toLowerCase(), 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export interface PaymentIntent {
  provider: 'razorpay';
  /** Public. The browser needs it to open the gateway. */
  keyId: string;
  /** The gateway's order id, created from our own total. */
  orderId: string;
  amountPaise: number;
  currency: 'INR';
  /** Shown inside the gateway's own window. */
  businessName: string;
  reference: string;
  prefill: { name: string; contact: string; email: string };
}

/**
 * A Razorpay order, created from the total this server worked out.
 *
 * The amount is passed in from the order row, never from the request, which is
 * the whole point: the gateway will not accept a payment for a different amount
 * than the order it was created against.
 */
export async function createRazorpayOrder(params: {
  keys: RazorpayKeys;
  amountPaise: number;
  reference: string;
  notes?: Record<string, string>;
}): Promise<{ id: string } | null> {
  const { keys, amountPaise, reference } = params;
  if (!Number.isInteger(amountPaise) || amountPaise < 100) return null;

  const auth = Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString('base64');

  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        authorization: `Basic ${auth}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        // Razorpay allows 40 characters and rejects the order outright if the
        // receipt is longer, which would fail every order on a long reference.
        receipt: reference.slice(0, 40),
        notes: params.notes ?? {},
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { id?: unknown };
    return typeof data.id === 'string' && data.id.startsWith('order_') ? { id: data.id } : null;
  } catch {
    // The gateway being unreachable must not lose the order. It is already
    // recorded; the customer is asked to pay another way instead.
    return null;
  }
}

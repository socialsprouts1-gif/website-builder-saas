import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { looksLikeRazorpayKeyId, razorpayKeysFrom, verifyPaymentSignature } from './payments';

/**
 * The half of a payment that decides whether somebody can pay ₹1 for a ₹4,000
 * order. Every case here is one a real attacker tries first.
 */
const SECRET = 'a-key-secret-that-never-leaves-the-server';
const sign = (orderId: string, paymentId: string, secret = SECRET) =>
  createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

describe('verifyPaymentSignature', () => {
  const orderId = 'order_MkT9xQ2p1abcDE';
  const paymentId = 'pay_MkT9xQ2p1abcDE';

  it('accepts what the gateway actually signed', () => {
    expect(
      verifyPaymentSignature({ orderId, paymentId, signature: sign(orderId, paymentId), keySecret: SECRET }),
    ).toBe(true);
  });

  it('accepts it whichever case the hex arrives in', () => {
    const signature = sign(orderId, paymentId).toUpperCase();
    expect(verifyPaymentSignature({ orderId, paymentId, signature, keySecret: SECRET })).toBe(true);
  });

  it('refuses a signature made with a different secret', () => {
    const signature = sign(orderId, paymentId, 'somebody-elses-secret');
    expect(verifyPaymentSignature({ orderId, paymentId, signature, keySecret: SECRET })).toBe(false);
  });

  /** Signing a cheap order and presenting it against an expensive one. */
  it('refuses a signature made for a different order', () => {
    const signature = sign('order_someCheapOrder', paymentId);
    expect(verifyPaymentSignature({ orderId, paymentId, signature, keySecret: SECRET })).toBe(false);
  });

  it('refuses a signature made for a different payment', () => {
    const signature = sign(orderId, 'pay_somebodyElsesPayment');
    expect(verifyPaymentSignature({ orderId, paymentId, signature, keySecret: SECRET })).toBe(false);
  });

  it('refuses anything that is not a sha256 hex digest', () => {
    for (const signature of ['', 'nope', 'a'.repeat(63), 'a'.repeat(65), 'z'.repeat(64)]) {
      expect(verifyPaymentSignature({ orderId, paymentId, signature, keySecret: SECRET }), signature).toBe(
        false,
      );
    }
  });

  it('refuses when anything it needs is missing', () => {
    const good = sign(orderId, paymentId);
    expect(verifyPaymentSignature({ orderId: '', paymentId, signature: good, keySecret: SECRET })).toBe(false);
    expect(verifyPaymentSignature({ orderId, paymentId: '', signature: good, keySecret: SECRET })).toBe(false);
    expect(verifyPaymentSignature({ orderId, paymentId, signature: good, keySecret: '' })).toBe(false);
  });
});

describe('the keys a shop pays through', () => {
  it('takes a live or a test key', () => {
    expect(looksLikeRazorpayKeyId('rzp_live_A1b2C3d4E5f6G7')).toBe(true);
    expect(looksLikeRazorpayKeyId('rzp_test_A1b2C3d4E5f6G7')).toBe(true);
  });

  it('refuses anything that is not one, rather than sending it to the browser', () => {
    for (const value of ['', 'sk_live_abc', 'rzp_A1b2C3', 'rzp_live_', undefined, null]) {
      expect(looksLikeRazorpayKeyId(value as string), String(value)).toBe(false);
    }
  });

  it('needs both halves before a shop can charge anything', () => {
    expect(razorpayKeysFrom({ key_id: 'rzp_live_A1b2C3d4E5f6G7' })).toBeNull();
    expect(razorpayKeysFrom({ key_secret: 'x' })).toBeNull();
    expect(razorpayKeysFrom(null)).toBeNull();
    expect(razorpayKeysFrom({ key_id: 'rzp_live_A1b2C3d4E5f6G7', key_secret: 'x' })).toEqual({
      keyId: 'rzp_live_A1b2C3d4E5f6G7',
      keySecret: 'x',
    });
  });
});

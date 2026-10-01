import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isEntitled } from '@/lib/razorpay';
import { SUBSCRIPTION_EVENTS, statusForEvent } from './billing-events';

describe('reading a Razorpay webhook', () => {
  it('names the status for the events that decide a subscription', () => {
    expect(statusForEvent('subscription.activated')).toBe('active');
    expect(statusForEvent('subscription.charged')).toBe('active');
    expect(statusForEvent('subscription.cancelled')).toBe('cancelled');
    expect(statusForEvent('subscription.halted')).toBe('halted');
    expect(statusForEvent('subscription.paused')).toBe('paused');
  });

  /**
   * The bug this exists for. Razorpay's dashboard offers fifty-five events and
   * ticking all of them is reasonable, so an unrelated one used to arrive,
   * carry no subscription status, fall through to a default of 'active' — and
   * mark a lapsed account as paying.
   */
  it('changes nothing for an event that says nothing', () => {
    expect(statusForEvent('invoice.expired')).toBeNull();
    expect(statusForEvent('payment.failed')).toBeNull();
    expect(statusForEvent('fund_account.validation.completed')).toBeNull();
    expect(statusForEvent('order.paid')).toBeNull();
  });

  it('believes a status the subscription itself reports', () => {
    expect(statusForEvent('subscription.updated', 'active')).toBe('active');
    expect(statusForEvent('subscription.updated', 'expired')).toBe('expired');
  });

  it('never lets an unmodelled event grant entitlement on its own', () => {
    for (const name of ['invoice.paid', 'invoice.expired', 'payment.captured', 'refund.created']) {
      const status = statusForEvent(name);
      expect(status).toBeNull();
      // And if it were ever written, it must not be a paying status.
      expect(isEntitled(status, null)).toBe(false);
    }
  });

  it('lists the events worth ticking in the dashboard, and only those', () => {
    expect(SUBSCRIPTION_EVENTS).toContain('subscription.activated');
    expect(SUBSCRIPTION_EVENTS).toContain('subscription.charged');
    expect(SUBSCRIPTION_EVENTS).toContain('subscription.cancelled');
    for (const name of SUBSCRIPTION_EVENTS) {
      expect(name.startsWith('subscription.')).toBe(true);
      expect(statusForEvent(name)).not.toBeNull();
    }
  });
});

describe('which statuses keep the app unlocked', () => {
  it('unlocks for the ones that mean somebody is paying or about to', () => {
    expect(isEntitled('active', null)).toBe(true);
    expect(isEntitled('authenticated', null)).toBe(true);
  });

  it('locks for the ones that mean they are not', () => {
    for (const status of ['cancelled', 'completed', 'halted', 'paused', 'expired', 'free']) {
      expect(isEntitled(status, null), status).toBe(false);
    }
    expect(isEntitled(null, null)).toBe(false);
  });
});

describe('the webhook endpoint', () => {
  /**
   * Razorpay posts to whatever URL was typed into its dashboard, and a webhook
   * sender is not a browser: a 308 to the canonical host is recorded as a
   * failed delivery rather than followed. A subscription that never activates
   * because the apex was typed instead of www is not a failure anyone would
   * think to look for.
   */
  it('is not behind the canonical-host redirect', () => {
    const middleware = readFileSync(join(process.cwd(), 'src/middleware.ts'), 'utf8');
    const matcher = middleware.slice(middleware.indexOf('matcher'));
    expect(matcher).toContain('api/billing/webhook');
  });
});

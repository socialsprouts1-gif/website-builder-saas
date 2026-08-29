import 'server-only';
import Razorpay from 'razorpay';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';
import { env, PLAN_PRICE_PAISE } from '@/lib/env';

/**
 * Razorpay Subscriptions, INR only (spec Section 12).
 *
 * Everything here degrades to a clear "billing is not configured" state rather
 * than throwing at import time, so the rest of the app still runs before the
 * founder has added keys.
 */

export const TRIAL_DAYS = 14;

export class BillingNotConfiguredError extends Error {
  constructor() {
    super('Billing is not configured yet. Add your Razorpay keys to enable subscriptions.');
    this.name = 'BillingNotConfiguredError';
  }
}

export function razorpayClient(): Razorpay {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) throw new BillingNotConfiguredError();
  return new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
}

export interface CreatedSubscription {
  id: string;
  shortUrl: string | null;
  status: string;
}

/**
 * Creates the recurring ₹500/month subscription. `total_count` is Razorpay's
 * required cycle cap; 120 months keeps it effectively open-ended while still
 * satisfying the API.
 */
export async function createSubscription(params: {
  userId: string;
  email: string;
  gstin?: string | null;
}): Promise<CreatedSubscription> {
  if (!env.razorpay.planId) {
    throw new Error('RAZORPAY_PLAN_ID is not set. Create a ₹500/month plan in the Razorpay dashboard first.');
  }

  const client = razorpayClient();
  const subscription = await client.subscriptions.create({
    plan_id: env.razorpay.planId,
    total_count: 120,
    customer_notify: 1,
    quantity: 1,
    notes: {
      lumen_user_id: params.userId,
      email: params.email,
      ...(params.gstin ? { gstin: params.gstin } : {}),
    },
  });

  return {
    id: subscription.id,
    shortUrl: (subscription as { short_url?: string }).short_url ?? null,
    status: subscription.status,
  };
}

/** Cancels at period end — the user keeps what they already paid for. */
export async function cancelSubscription(subscriptionId: string) {
  const client = razorpayClient();
  return client.subscriptions.cancel(subscriptionId, true);
}

export async function fetchSubscription(subscriptionId: string) {
  const client = razorpayClient();
  return client.subscriptions.fetch(subscriptionId);
}

export async function fetchInvoicesForSubscription(subscriptionId: string) {
  const client = razorpayClient();
  const response = await client.invoices.all({ subscription_id: subscriptionId, count: 24 });
  return response.items ?? [];
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !env.razorpay.webhookSecret) return false;
  try {
    return validateWebhookSignature(rawBody, signature, env.razorpay.webhookSecret);
  } catch {
    return false;
  }
}

export function formatInr(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export const PLAN_LABEL = `${formatInr(PLAN_PRICE_PAISE)} / month`;

/** Statuses Razorpay reports that should keep the app unlocked. */
const ACTIVE_STATUSES = new Set(['active', 'authenticated', 'trialing', 'pending']);

export function isEntitled(status: string | null | undefined, periodEnd: string | null | undefined): boolean {
  if (!status) return false;
  if (!ACTIVE_STATUSES.has(status)) return false;
  if (status === 'trialing' && periodEnd) return new Date(periodEnd).getTime() > Date.now();
  return true;
}

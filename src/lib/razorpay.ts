import 'server-only';
import Razorpay from 'razorpay';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';
import { env } from '@/lib/env';
import { PLANS, formatInr, planByKey, priceLabel, type Plan, type PlanKey } from '@/lib/plans';

/**
 * Razorpay Subscriptions, INR only (spec Section 12).
 *
 * Everything here degrades to a clear "billing is not configured" state rather
 * than throwing at import time, so the rest of the app still runs before the
 * founder has added keys.
 */

/**
 * No time-limited trial any more. The free tier is a credit grant rather than a
 * countdown, so nothing expires on a clock — see FREE_CREDITS.
 */
export const TRIAL_DAYS = 0;

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

/** The Razorpay plan id behind one of Lumen's plans, if it is configured. */
export function razorpayPlanId(plan: Plan): string | undefined {
  return plan.envVar ? env.razorpay.planIds[plan.envVar] : undefined;
}

/**
 * The introductory offer behind a plan, if one is configured.
 *
 * This is the guard that keeps the price on the card and the price at the
 * checkout the same thing. The catalogue says what the intro price would be;
 * this says whether Razorpay has actually been told about it. Nothing is
 * advertised on the strength of the first alone.
 */
export function introOfferId(plan: Plan): string | undefined {
  return plan.introEnvVar ? env.razorpay.offerIds[plan.introEnvVar] : undefined;
}

/** The plan keys whose intro price may be shown, because it will be charged. */
export const introPlans = (): PlanKey[] =>
  PLANS.filter((plan) => Boolean(introOfferId(plan))).map((plan) => plan.key);

/** Which plans can actually be bought on this deployment. */
export const purchasablePlans = (): Plan[] =>
  PLANS.filter((plan) => plan.envVar !== null && Boolean(razorpayPlanId(plan)));

/**
 * A Razorpay plan id, back to the plan it belongs to.
 *
 * The webhook needs this: an upgrade bought on Razorpay's hosted page comes
 * back as a plan id and nothing else, and the tier it grants must come from
 * what was actually paid for rather than from what we last wrote down.
 */
export function planForRazorpayId(planId: string | null | undefined): Plan | undefined {
  if (!planId) return undefined;
  return PLANS.find((plan) => razorpayPlanId(plan) === planId);
}

/**
 * Creates the recurring subscription for one of Lumen's plans. `total_count` is
 * Razorpay's required cycle cap — 120 months, or 10 years of annual billing —
 * which keeps it effectively open-ended while still satisfying the API.
 */
export async function createSubscription(params: {
  userId: string;
  email: string;
  planKey: PlanKey;
  gstin?: string | null;
}): Promise<CreatedSubscription> {
  const plan = planByKey(params.planKey);
  if (!plan || !plan.envVar) throw new Error('That plan cannot be bought.');

  const planId = razorpayPlanId(plan);
  if (!planId) {
    // Said to the person, not to the deployment. The missing variable is named
    // in the server log, where somebody can act on it; a customer reading an
    // environment variable's name on a payment dialog learns nothing.
    console.error(`[lumen:billing] ${plan.envVar} is not set — create the plan in Razorpay.`);
    throw new BillingNotConfiguredError();
  }

  const offerId = introOfferId(plan);

  const client = razorpayClient();
  const subscription = await client.subscriptions.create({
    plan_id: planId,
    // Razorpay applies the offer to the cycles its own configuration says —
    // for an intro price that is the first charge only. Left out entirely when
    // none is set up, which is also when the card does not mention one.
    ...(offerId ? { offer_id: offerId } : {}),
    total_count: plan.period === 'yearly' ? 10 : 120,
    customer_notify: 1,
    quantity: 1,
    notes: {
      lumen_user_id: params.userId,
      lumen_plan: plan.key,
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

export { formatInr };

/** The label on the cheapest paid plan, for a sentence that needs one price. */
export const PLAN_LABEL = priceLabel(PLANS[1]);

/** Statuses Razorpay reports that should keep the app unlocked. */
const ACTIVE_STATUSES = new Set(['active', 'authenticated', 'trialing', 'pending']);

export function isEntitled(status: string | null | undefined, periodEnd: string | null | undefined): boolean {
  if (!status) return false;
  if (!ACTIVE_STATUSES.has(status)) return false;
  if (status === 'trialing' && periodEnd) return new Date(periodEnd).getTime() > Date.now();
  return true;
}

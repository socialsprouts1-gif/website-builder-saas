import { FREE_CREDITS } from '@/lib/env';
import { PLAN_PRICE_LABEL } from '@/lib/env';
import { PLANS, type PlanTier } from '@/lib/plans';

/**
 * What an account has left, and what that means.
 *
 * Free used to be a daily bucket that refilled forever, which made the paid
 * plan a convenience rather than a decision: nobody upgrades from "wait until
 * midnight". The free tier is now a one-time grant — {@link FREE_CREDITS}
 * credits, for the life of the account — and when it is gone the only ways on
 * are to subscribe or to bring your own OpenAI key.
 *
 * The arithmetic lives here, away from the database and the React, because it
 * is the part that decides whether somebody is asked for money. Every screen
 * that shows a balance and every route that refuses one reads it from these
 * functions, so the meter in the sidebar cannot say something different from
 * the wall the build hits.
 */

/** A plan tier, plus the founder's own account, which is not a plan. */
export type Tier = 'admin' | PlanTier;

export interface CreditBalance {
  tier: Tier;
  /** Admins, and anyone on their own OpenAI key. Nothing below applies. */
  unlimited: boolean;
  /**
   * The one-time grant and anything added by hand, and what is left of it.
   * It never refills on its own.
   */
  freeRemaining: number;
  freeTotal: number;
  /** Of freeTotal, how much an admin gave. Zero for an ordinary account. */
  granted: number;
  /**
   * This month's allowance and its ceiling. Both zero on the free tier.
   *
   * A month rather than a day: a daily bucket makes a subscription feel like a
   * meter, and "come back tomorrow" is not something somebody who has paid
   * should ever be told.
   */
  periodRemaining: number;
  periodLimit: number;
}

export function totalCredits(balance: CreditBalance): number {
  if (balance.unlimited) return Infinity;
  return Math.max(0, balance.freeRemaining) + Math.max(0, balance.periodRemaining);
}

/** Whether a call costing this much may go ahead. */
export function canAfford(balance: CreditBalance, cost: number): boolean {
  return totalCredits(balance) >= cost;
}

/**
 * Whether the only way forward is to pay.
 *
 * A free account that has spent its grant is asked to upgrade. A paid account
 * that has reached this month's ceiling is not — theirs comes back with the
 * month, and showing them an upgrade dialog would be selling them what they
 * already have.
 */
export function needsUpgrade(balance: CreditBalance, cost: number): boolean {
  if (balance.unlimited || canAfford(balance, cost)) return false;
  return balance.tier === 'free';
}

/** Whether what is left comes back on its own. */
export function refills(balance: CreditBalance): boolean {
  return !balance.unlimited && balance.periodLimit > 0;
}

/**
 * What to say when a call is refused. Written for the person reading it: what
 * ran out, whether it comes back, and the two ways on.
 */
export function exhaustedMessage(balance: CreditBalance): string {
  if (refills(balance)) {
    return "You have reached this month's ceiling on the shared key. It lifts when the month turns over — or add your own OpenAI key in Settings and there is no limit at all.";
  }
  return `Your ${balance.freeTotal} free credits are used up. Your sites stay live and exportable. Upgrade for ${PLAN_PRICE_LABEL} a month to keep building, or add your own OpenAI key in Settings for no limit at all.`;
}

/**
 * What the meter says.
 *
 * A free account sees its grant counted down, because the number is the whole
 * point of it — ten credits, and how many are left decides what happens next.
 * A paid account sees no number at all. Its ceiling is set where nobody will
 * meet it, and printing "4,000 remaining" turns a subscription into a meter
 * running down; the figure only appears if somebody is genuinely close to it,
 * which is the one time it is information rather than anxiety.
 */
export interface MeterReading {
  label: string;
  /** Null when there is no number worth showing. */
  left: number | null;
  outOf: number | null;
  detail: string;
}

/** Below this much of a paid ceiling, the number stops being noise. */
const NEARLY_SPENT = 0.15;

export function meterReading(balance: CreditBalance): MeterReading {
  if (balance.unlimited) {
    return { label: 'Credits', left: null, outOf: null, detail: 'Nothing is metered.' };
  }

  if (balance.periodLimit === 0) {
    return {
      label: 'Free credits',
      left: Math.max(0, balance.freeRemaining),
      outOf: balance.freeTotal,
      detail: 'These do not reset.',
    };
  }

  const left = Math.max(0, balance.periodRemaining);
  const low = left < balance.periodLimit * NEARLY_SPENT;
  return {
    // The plan's own name, so renaming a tier renames the meter with it.
    label: `${PLANS.find((plan) => plan.tier === balance.tier)?.name ?? 'Plan'}`,
    left: low ? left : null,
    outOf: low ? balance.periodLimit : null,
    detail: low
      ? 'Running low this month. It refreshes when the month turns over.'
      : 'No daily cap. Build what the business needs.',
  };
}

/** The code a refused call carries, so the client knows to offer the plan. */
export const CREDITS_EXHAUSTED = 'credits_exhausted';

/**
 * The other reason to show the plan: not out of credits, but on a tier that
 * does not include what was asked for. Same dialog, different sentence.
 */
export const PLAN_REQUIRED = 'plan_required';

export class NoKeyAvailableError extends Error {
  readonly code: string | null;

  constructor(
    public readonly reason: 'not_configured' | 'quota_exhausted',
    balance?: CreditBalance,
  ) {
    super(
      reason === 'quota_exhausted'
        ? (balance
            ? exhaustedMessage(balance)
            : 'You have no credits left. Upgrade, or add your own OpenAI key in Settings.')
        : 'No OpenAI key is configured. Add your own key in Settings → API keys to start generating.',
    );
    this.name = 'NoKeyAvailableError';
    this.code = reason === 'quota_exhausted' ? CREDITS_EXHAUSTED : null;
  }
}

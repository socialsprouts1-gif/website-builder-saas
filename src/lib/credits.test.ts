import { describe, expect, it } from 'vitest';
import { FREE_CREDITS, CREDIT_COST } from '@/lib/env';
import { planFor } from '@/lib/plans';

const PRO_MONTHLY = planFor('pro', 'monthly')!.monthlyCredits;
import {
  NoKeyAvailableError,
  canAfford,
  exhaustedMessage,
  meterReading,
  needsUpgrade,
  refills,
  totalCredits,
  type CreditBalance,
} from './credits';

const free = (freeRemaining: number, granted = 0): CreditBalance => ({
  tier: 'free',
  unlimited: false,
  freeRemaining,
  freeTotal: FREE_CREDITS + granted,
  granted,
  periodRemaining: 0,
  periodLimit: 0,
});

const pro = (periodRemaining: number): CreditBalance => ({
  tier: 'pro',
  unlimited: false,
  freeRemaining: 0,
  freeTotal: FREE_CREDITS,
  granted: 0,
  periodRemaining,
  periodLimit: PRO_MONTHLY,
});

const admin: CreditBalance = {
  tier: 'admin',
  unlimited: true,
  freeRemaining: FREE_CREDITS,
  freeTotal: FREE_CREDITS,
  granted: 0,
  periodRemaining: 0,
  periodLimit: 0,
};

describe('the free tier', () => {
  it('is a grant, not a daily allowance', () => {
    expect(refills(free(FREE_CREDITS))).toBe(false);
    expect(refills(free(0))).toBe(false);
    expect(refills(pro(0))).toBe(true);
  });

  it('is exactly enough for whole sites, and says so honestly', () => {
    // The number on the welcome screen is derived from these two, so if one of
    // them moves the copy moves with it rather than going quietly wrong.
    expect(FREE_CREDITS % CREDIT_COST.generation).toBe(0);
    expect(FREE_CREDITS / CREDIT_COST.generation).toBeGreaterThanOrEqual(1);
  });

  it('refuses the call that would overdraw, not the one after it', () => {
    const almost = free(CREDIT_COST.generation - 1);
    expect(canAfford(almost, CREDIT_COST.generation)).toBe(false);
    expect(canAfford(almost, CREDIT_COST.chat_edit)).toBe(true);
    expect(canAfford(free(CREDIT_COST.generation), CREDIT_COST.generation)).toBe(true);
  });

  it('asks a spent free account to upgrade', () => {
    expect(needsUpgrade(free(0), CREDIT_COST.generation)).toBe(true);
    expect(needsUpgrade(free(FREE_CREDITS), CREDIT_COST.generation)).toBe(false);
  });

  /**
   * The bug this exists for: a paid account that has spent today being sold
   * the plan it is already on. Theirs comes back; there is nothing to buy.
   */
  it('never sells the plan to somebody already on it', () => {
    expect(needsUpgrade(pro(0), CREDIT_COST.generation)).toBe(false);
    expect(exhaustedMessage(pro(0))).toMatch(/month/i);
    expect(exhaustedMessage(pro(0))).not.toMatch(/upgrade/i);
  });

  it('never tells a free account its credits come back', () => {
    const message = exhaustedMessage(free(0));
    expect(message).not.toMatch(/midnight|reset|tomorrow|every day|this month/i);
    expect(message).toMatch(/upgrade/i);
    // What it must promise, because it is what stops the wall being a threat.
    expect(message).toMatch(/stay live/i);
  });
});

describe('credits given by hand', () => {
  /**
   * The founder adding fifty credits to somebody's account has to show up as
   * fifty credits, not as fifty credits that the meter still calls ten.
   */
  it('counts toward the same pot, and the meter says so', () => {
    const topped = free(55, 50);
    expect(totalCredits(topped)).toBe(55);
    expect(canAfford(topped, CREDIT_COST.generation)).toBe(true);
    expect(needsUpgrade(topped, CREDIT_COST.generation)).toBe(false);

    const reading = meterReading(topped);
    expect(reading.left).toBe(55);
    expect(reading.outOf).toBe(FREE_CREDITS + 50);
  });

  it('still runs out, and still asks for a plan when it does', () => {
    const spent = free(0, 50);
    expect(canAfford(spent, 1)).toBe(false);
    expect(needsUpgrade(spent, CREDIT_COST.generation)).toBe(true);
    expect(exhaustedMessage(spent)).toMatch(/upgrade/i);
  });

  it('never tells somebody a granted credit comes back on its own', () => {
    expect(refills(free(0, 50))).toBe(false);
  });
});

describe('the meter', () => {
  it('counts the grant while any of it is left', () => {
    const reading = meterReading(free(4));
    expect(reading.label).toBe('Free credits');
    expect(reading.left).toBe(4);
    expect(reading.outOf).toBe(FREE_CREDITS);
  });

  /**
   * The point of the change. A paid ceiling is set where nobody meets it, so
   * printing "3,940 remaining" every time somebody opens the app turns a
   * subscription into a meter running down.
   */
  it('shows a paid plan no number at all', () => {
    const reading = meterReading(pro(PRO_MONTHLY));
    expect(reading.label).toBe('Professional');
    expect(reading.left).toBeNull();
    expect(reading.outOf).toBeNull();
    expect(reading.detail).toMatch(/no daily cap/i);
  });

  it('shows the number only when somebody is genuinely close to it', () => {
    const nearly = meterReading(pro(Math.floor(PRO_MONTHLY * 0.1)));
    expect(nearly.left).toBe(Math.floor(PRO_MONTHLY * 0.1));
    expect(nearly.outOf).toBe(PRO_MONTHLY);
    expect(nearly.detail).toMatch(/running low/i);
  });

  it('never shows a negative balance', () => {
    expect(meterReading(free(-3)).left).toBe(0);
    expect(totalCredits(free(-3))).toBe(0);
  });
});

describe('an unmetered account', () => {
  it('can afford anything and is never asked for money', () => {
    expect(totalCredits(admin)).toBe(Infinity);
    expect(canAfford(admin, 10_000)).toBe(true);
    expect(needsUpgrade(admin, 10_000)).toBe(false);
  });
});

describe('the refusal', () => {
  it('carries a code the browser can act on', () => {
    const error = new NoKeyAvailableError('quota_exhausted', free(0));
    expect(error.code).toBe('credits_exhausted');
    expect(error.message).toBe(exhaustedMessage(free(0)));
  });

  it('does not offer the plan when the problem is a missing key', () => {
    const error = new NoKeyAvailableError('not_configured');
    expect(error.code).toBeNull();
    expect(error.message).toMatch(/no openai key is configured/i);
  });
});

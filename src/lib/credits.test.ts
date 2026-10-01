import { describe, expect, it } from 'vitest';
import { FREE_CREDITS, CREDIT_COST } from '@/lib/env';
import { planFor } from '@/lib/plans';

const PRO_DAILY_PLATFORM_CREDITS = planFor('pro', 'monthly')!.dailyCredits;
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

const free = (freeRemaining: number): CreditBalance => ({
  tier: 'free',
  unlimited: false,
  freeRemaining,
  freeTotal: FREE_CREDITS,
  dailyRemaining: 0,
  dailyLimit: 0,
});

const pro = (dailyRemaining: number): CreditBalance => ({
  tier: 'pro',
  unlimited: false,
  freeRemaining: 0,
  freeTotal: FREE_CREDITS,
  dailyRemaining,
  dailyLimit: PRO_DAILY_PLATFORM_CREDITS,
});

const admin: CreditBalance = {
  tier: 'admin',
  unlimited: true,
  freeRemaining: FREE_CREDITS,
  freeTotal: FREE_CREDITS,
  dailyRemaining: 0,
  dailyLimit: 0,
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
    expect(exhaustedMessage(pro(0))).toMatch(/midnight/i);
    expect(exhaustedMessage(pro(0))).not.toMatch(/upgrade/i);
  });

  it('never tells a free account its credits come back', () => {
    const message = exhaustedMessage(free(0));
    expect(message).not.toMatch(/midnight|reset|tomorrow|every day/i);
    expect(message).toMatch(/upgrade/i);
    // What it must promise, because it is what stops the wall being a threat.
    expect(message).toMatch(/stay live/i);
  });
});

describe('the meter', () => {
  it('counts the grant while any of it is left', () => {
    expect(meterReading(free(4))).toEqual({ label: 'Free credits', left: 4, outOf: FREE_CREDITS });
    expect(meterReading(free(0)).outOf).toBe(FREE_CREDITS);
  });

  it('switches to the daily pot once a plan is paying for it', () => {
    const reading = meterReading(pro(120));
    expect(reading.label).toBe('Pro credits');
    expect(reading.left).toBe(120);
    expect(reading.outOf).toBe(PRO_DAILY_PLATFORM_CREDITS);
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

import { describe, expect, it } from 'vitest';
import { summariseSubscriptions, summariseUsage } from './admin-metrics';
import { PLANS, planByKey } from './plans';

const sub = (plan: string, status: string, cancelled: string | null = null) => ({
  plan,
  status,
  cancelled_at: cancelled,
});

describe('what the revenue page adds up', () => {
  /**
   * The bug this is built to prevent. Multiplying a subscriber count by one
   * price was right when there was one price; with two tiers and two billing
   * periods it overstates or understates every month — and a yearly plan has
   * to count as its monthly share, not as a month at the yearly price.
   */
  it('sums each subscriber at the plan they are actually on', () => {
    const pro = planByKey('pro_monthly')!;
    const premiumYear = planByKey('premium_yearly')!;

    const snapshot = summariseSubscriptions([
      sub('pro_monthly', 'active'),
      sub('pro_monthly', 'active'),
      sub('premium_yearly', 'active'),
    ]);

    expect(snapshot.mrrPaise).toBe(pro.perMonthPaise * 2 + premiumYear.perMonthPaise);
    // A yearly subscription is a twelfth of its price each month, which is
    // less than the monthly plan costs — if it were not, nobody would pay
    // yearly.
    expect(premiumYear.perMonthPaise).toBeLessThan(planByKey('premium_monthly')!.perMonthPaise);
  });

  it('counts only what is actually being paid for', () => {
    const snapshot = summariseSubscriptions([
      sub('pro_monthly', 'active'),
      sub('pro_monthly', 'trialing'),
      sub('pro_monthly', 'halted'),
      sub('premium_monthly', 'active', '2026-01-01T00:00:00Z'),
    ]);

    // A trial is not revenue, and neither is a halted subscription.
    expect(snapshot.active).toBe(2);
    expect(snapshot.trialing).toBe(1);
    expect(snapshot.mrrPaise).toBe(
      planByKey('pro_monthly')!.perMonthPaise + planByKey('premium_monthly')!.perMonthPaise,
    );
    expect(snapshot.cancelled).toBe(1);
    expect(snapshot.churnRate).toBeCloseTo(25, 5);
  });

  it('never divides by nothing', () => {
    const empty = summariseSubscriptions([]);
    expect(empty.churnRate).toBe(0);
    expect(empty.mrrPaise).toBe(0);
    expect(empty.byPlan).toEqual([]);
  });

  /** A plan key that is no longer in the catalogue must not break the page. */
  it('survives a subscription on a plan that no longer exists', () => {
    const snapshot = summariseSubscriptions([sub('legacy_founder', 'active')]);
    expect(snapshot.active).toBe(1);
    expect(snapshot.mrrPaise).toBe(0);
    expect(snapshot.byPlan).toHaveLength(1);
    expect(snapshot.byPlan[0].label).toBeTruthy();
  });

  it('ranks the plans by what they bring in', () => {
    const snapshot = summariseSubscriptions([
      sub('pro_monthly', 'active'),
      sub('premium_monthly', 'active'),
      sub('premium_monthly', 'active'),
    ]);
    expect(snapshot.byPlan[0].key).toBe('premium_monthly');
    expect(snapshot.byPlan[0].count).toBe(2);
    // The shares the page prints have to add up to the total it prints.
    expect(snapshot.byPlan.reduce((total, plan) => total + plan.mrrPaise, 0)).toBe(snapshot.mrrPaise);
  });

  it('knows every plan it could be handed', () => {
    for (const plan of PLANS) {
      if (plan.period === null) continue;
      const snapshot = summariseSubscriptions([sub(plan.key, 'active')]);
      expect(snapshot.mrrPaise, plan.key).toBe(plan.perMonthPaise);
    }
  });
});

const event = (
  model: string,
  source: string,
  cost: number | string | null,
  kind = 'generation',
) => ({ model, key_source: source, cost_usd: cost, event_type: kind });

describe('what the spend page adds up', () => {
  /**
   * The distinction the whole screen exists for: spend on Lumen's key is a
   * cost, and spend on somebody's own key is not. Getting it backwards would
   * make the founder think they were losing money they never spent.
   */
  it('separates what Lumen paid for from what it did not', () => {
    const spend = summariseUsage([
      event('gpt-5.6', 'platform', 0.5),
      event('gpt-5.6', 'user', 2),
      event('gpt-image-2', 'platform', 0.25),
    ]);
    expect(spend.platformUsd).toBeCloseTo(0.75, 6);
    expect(spend.byokUsd).toBeCloseTo(2, 6);
  });

  it('groups by what the call was for as well as by model', () => {
    const spend = summariseUsage([
      event('gpt-image-2', 'platform', 0.2, 'image'),
      event('gpt-image-2', 'platform', 0.2, 'image'),
      event('gpt-5.6', 'platform', 0.01, 'generation'),
    ]);
    // Images are the expensive calls and a 3D build makes a dozen of them, so
    // the kind is the first question, not the model.
    expect(spend.byKind[0].kind).toBe('image');
    expect(spend.byKind[0].calls).toBe(2);
    expect(spend.byKind[0].usd).toBeCloseTo(0.4, 6);
    expect(spend.byModel[0].model).toBe('gpt-image-2');
  });

  it('ranks both tables by cost, not by how many calls there were', () => {
    const spend = summariseUsage([
      event('cheap', 'platform', 0.001, 'a'),
      event('cheap', 'platform', 0.001, 'a'),
      event('cheap', 'platform', 0.001, 'a'),
      event('dear', 'platform', 5, 'b'),
    ]);
    expect(spend.byModel.map((row) => row.model)).toEqual(['dear', 'cheap']);
    expect(spend.byKind.map((row) => row.kind)).toEqual(['b', 'a']);
  });

  /**
   * A cost that arrives as a string or a null must not turn a total into NaN,
   * which renders as "$NaN" and makes the whole page look broken.
   */
  it('never produces NaN from a missing or stringy cost', () => {
    const spend = summariseUsage([
      event('a', 'platform', null),
      event('b', 'platform', '0.25'),
      { model: null, key_source: null, cost_usd: undefined as never, event_type: null },
    ]);
    expect(Number.isFinite(spend.platformUsd)).toBe(true);
    expect(spend.platformUsd).toBeCloseTo(0.25, 6);
    expect(spend.byModel.every((row) => Number.isFinite(row.usd))).toBe(true);
    // An event with no model still has to be counted somewhere.
    expect(spend.byModel.some((row) => row.model === 'unknown')).toBe(true);
  });

  it('is honest about an empty window', () => {
    const spend = summariseUsage([], 7);
    expect(spend.days).toBe(7);
    expect(spend.byModel).toEqual([]);
    expect(spend.truncated).toBe(false);
  });

  /**
   * The page reads at most a fixed number of events so one busy month cannot
   * time it out, which means a full page is a floor rather than the figure —
   * and it has to say so.
   */
  it('says when the totals are only a floor', () => {
    const many = Array.from({ length: 5000 }, () => event('a', 'platform', 0.01));
    expect(summariseUsage(many).truncated).toBe(true);
    expect(summariseUsage(many.slice(0, 4999)).truncated).toBe(false);
  });
});

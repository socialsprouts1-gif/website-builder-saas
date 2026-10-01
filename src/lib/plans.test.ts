import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CREDIT_COST, FREE_CREDITS } from '@/lib/env';
import {
  FEATURES,
  FREE_PLAN,
  PLANS,
  availableFeatures,
  formatInr,
  paidPlans,
  planAllows,
  planByKey,
  planFor,
  priceLabel,
  savingLabel,
  tierFor,
  type Feature,
} from './plans';

describe('the catalogue', () => {
  it('has a monthly and a yearly version of every paid tier', () => {
    for (const tier of ['pro', 'premium'] as const) {
      expect(planFor(tier, 'monthly'), `${tier} monthly`).toBeDefined();
      expect(planFor(tier, 'yearly'), `${tier} yearly`).toBeDefined();
    }
    expect(paidPlans('monthly')).toHaveLength(2);
    expect(paidPlans('yearly')).toHaveLength(2);
  });

  it('charges what the founder said: ₹500 Pro, ₹2,000 Premium', () => {
    expect(planFor('pro', 'monthly')!.pricePaise).toBe(50_000);
    expect(planFor('premium', 'monthly')!.pricePaise).toBe(200_000);
    expect(priceLabel(planFor('pro', 'monthly')!)).toBe('₹500 / month');
    expect(priceLabel(planFor('premium', 'monthly')!)).toBe('₹2,000 / month');
  });

  it('prices a year below twelve months, and says by how much', () => {
    for (const tier of ['pro', 'premium'] as const) {
      const monthly = planFor(tier, 'monthly')!;
      const yearly = planFor(tier, 'yearly')!;
      expect(yearly.pricePaise).toBeLessThan(monthly.pricePaise * 12);
      expect(yearly.perMonthPaise).toBeLessThan(monthly.perMonthPaise);
      const saving = savingLabel(yearly);
      expect(saving).toContain(formatInr(monthly.pricePaise * 12 - yearly.pricePaise));
    }
    expect(savingLabel(planFor('pro', 'monthly')!)).toBeNull();
  });

  it('gives a dearer plan more, never less', () => {
    const pro = planFor('pro', 'monthly')!;
    const premium = planFor('premium', 'monthly')!;
    expect(premium.dailyCredits).toBeGreaterThan(pro.dailyCredits);
    for (const feature of pro.features) expect(premium.features).toContain(feature);
  });

  it('is cheaper per month on the yearly plan but buys the same thing', () => {
    for (const tier of ['pro', 'premium'] as const) {
      const monthly = planFor(tier, 'monthly')!;
      const yearly = planFor(tier, 'yearly')!;
      expect(yearly.dailyCredits).toBe(monthly.dailyCredits);
      expect(yearly.features).toEqual(monthly.features);
    }
  });

  it('buys whole websites with a day of credits', () => {
    for (const plan of paidPlans('monthly')) {
      expect(plan.dailyCredits % CREDIT_COST.generation).toBe(0);
    }
    expect(FREE_CREDITS % CREDIT_COST.generation).toBe(0);
  });
});

describe('what a plan unlocks', () => {
  it('keeps the Google listing importer for Premium, as asked', () => {
    expect(planAllows('free', 'google_import')).toBe(false);
    expect(planAllows('pro', 'google_import')).toBe(false);
    expect(planAllows('premium', 'google_import')).toBe(true);
    expect(tierFor('google_import')).toBe('premium');
  });

  it('gives Pro a custom domain', () => {
    expect(planAllows('free', 'custom_domain')).toBe(false);
    expect(planAllows('pro', 'custom_domain')).toBe(true);
    expect(tierFor('custom_domain')).toBe('pro');
  });

  it('never locks the founder out of their own product', () => {
    for (const feature of Object.keys(FEATURES) as Feature[]) {
      expect(planAllows('admin', feature), feature).toBe(true);
    }
  });

  /**
   * The one that matters commercially. 3D sites are on the premium card
   * because that is where they will land — but they do not exist, so nothing
   * may behave as though they do, and the label has to say so.
   */
  it('refuses a feature that is only a promise', () => {
    expect(FEATURES.three_d.soon).toBe(true);
    expect(planAllows('premium', 'three_d')).toBe(false);
    expect(availableFeatures(planFor('premium', 'monthly')!)).not.toContain('three_d');
    expect(planFor('premium', 'monthly')!.features).toContain('three_d');
  });

  it('counts only real features as what a plan is worth today', () => {
    for (const plan of PLANS) {
      for (const feature of availableFeatures(plan)) {
        expect(FEATURES[feature].soon).toBeFalsy();
      }
    }
  });
});

describe('the free plan', () => {
  it('has no daily credits and no gated features', () => {
    expect(FREE_PLAN.dailyCredits).toBe(0);
    expect(FREE_PLAN.features).toEqual([]);
    expect(FREE_PLAN.pricePaise).toBe(0);
    expect(FREE_PLAN.envVar).toBeNull();
  });

  it('is what an unknown plan key falls back to, never a paid tier', () => {
    expect(planByKey('lumen_monthly_inr')).toBeUndefined();
    expect(planByKey(null)).toBeUndefined();
    expect(planByKey('free')).toBe(FREE_PLAN);
  });
});

describe('the database agrees', () => {
  const sql = readFileSync(join(process.cwd(), 'supabase/setup.sql'), 'utf8');

  /**
   * The old default was 'lumen_monthly_inr', written onto every free row by
   * ensureSubscriptionRow. Reading that as a paid plan would hand a tier to
   * everybody who ever signed up, so the migration remaps it.
   */
  it('defaults a new subscription to the free plan', () => {
    expect(sql).toContain("plan text not null default 'free'");
    expect(sql).toContain('alter column plan set default');
  });

  it('migrates the rows that carry the old default', () => {
    expect(sql).toContain("plan = 'lumen_monthly_inr'");
  });
});

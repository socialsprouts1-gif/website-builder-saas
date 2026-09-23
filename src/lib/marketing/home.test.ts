import { describe, expect, it } from 'vitest';
import { CONNECTORS } from '@/lib/connectors/providers';
import {
  CREDIT_COST,
  DAILY_PLATFORM_CREDITS,
  PLAN_PRICE_LABEL,
  PRO_DAILY_PLATFORM_CREDITS,
  WELCOME_CREDITS,
} from '@/lib/env';
import { INDUSTRIES } from '@/lib/industries';
import { BUILDS, CAPABILITIES, COMPARISON, PLANS, PUBLISH_FEATURES, STEPS } from './home';

/**
 * A landing page is where a product is most tempted to describe itself
 * generously, and the cost of that is paid by somebody who signs up expecting
 * a thing that is not there. Everything the home page promises is checked here
 * against what the code actually has.
 */
describe('the plans', () => {
  it('quote the real prices and allowances, not numbers typed once', () => {
    const free = PLANS.find((plan) => plan.name === 'Free')!;
    const pro = PLANS.find((plan) => plan.name === 'Pro')!;
    expect(free.features.join(' ')).toContain(String(WELCOME_CREDITS));
    expect(free.features.join(' ')).toContain(String(DAILY_PLATFORM_CREDITS));
    expect(free.features.join(' ')).toContain(String(CREDIT_COST.generation));
    expect(pro.price).toContain(PLAN_PRICE_LABEL);
    expect(pro.features.join(' ')).toContain(String(PRO_DAILY_PLATFORM_CREDITS));
  });

  /**
   * Teams, client handover and white-labelling do not exist. A card offering
   * them has to say so and must not send anyone to a checkout.
   */
  it('do not sell anything that is not built', () => {
    const unbuilt = PLANS.filter((plan) => !plan.available);
    expect(unbuilt.length).toBeGreaterThan(0);
    for (const plan of unbuilt) {
      expect(plan.price).not.toMatch(/₹\s*\d/);
      expect(plan.href).not.toBe('/signup');
      expect(plan.note.toLowerCase()).toMatch(/not built|not yet/);
    }
  });

  it('agree with the pricing page that paying buys throughput, not features', () => {
    const pro = PLANS.find((plan) => plan.name === 'Pro')!;
    expect(pro.note.toLowerCase()).toContain('throughput');
  });
});

describe('what the page says Lumen builds', () => {
  it('links every card at a page that exists', () => {
    const slugs = new Set(INDUSTRIES.map((industry) => `/for/${industry.slug}`));
    for (const build of BUILDS) {
      expect(slugs.has(build.href), `${build.title} → ${build.href}`).toBe(true);
    }
  });

  it('names no integration that is not a real connector', () => {
    const names = CONNECTORS.map((connector) => connector.name.toLowerCase());
    const claimed = PUBLISH_FEATURES.find((feature) => feature.title === 'Integrations')!.body;
    const mentioned = claimed
      .replace(/\.$/, '')
      .split(/,|\band\b/)
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
    for (const mention of mentioned) {
      expect(
        names.some((name) => name.includes(mention) || mention.includes(name)),
        `"${mention}" is not a connector Lumen has`,
      ).toBe(true);
    }
  });

  it('claims analytics only because there is an analytics connector', () => {
    const claimsAnalytics = PUBLISH_FEATURES.some((feature) => feature.title === 'Analytics');
    const hasConnector = CONNECTORS.some((connector) =>
      connector.name.toLowerCase().includes('analytics'),
    );
    expect(claimsAnalytics).toBe(hasConnector);
  });
});

describe('the shape of the page', () => {
  it('has three steps, numbered in order', () => {
    expect(STEPS.map((step) => step.number)).toEqual(['01', '02', '03']);
  });

  it('has enough in each list to be worth the section it sits in', () => {
    expect(BUILDS.length).toBeGreaterThanOrEqual(6);
    expect(CAPABILITIES.length).toBeGreaterThanOrEqual(10);
    expect(COMPARISON.length).toBeGreaterThanOrEqual(5);
    expect(PUBLISH_FEATURES.length).toBeGreaterThanOrEqual(6);
  });

  it('says something different on every card', () => {
    const bodies = [...BUILDS, ...CAPABILITIES, ...PUBLISH_FEATURES].map((entry) => entry.body);
    expect(new Set(bodies).size).toBe(bodies.length);
  });
});

import { describe, expect, it } from 'vitest';
import { SECTION_KINDS } from '@/lib/generation/kit/sections';
import { BLUEPRINTS, blueprintById, blueprintSellsThings } from './index';
import { blueprintInterview } from './interview';

describe('blueprintInterview', () => {
  it('names the pages a visitor can reach, and not the basket', () => {
    const shop = BLUEPRINTS.find((blueprint) => blueprintSellsThings(blueprint));
    expect(shop).toBeDefined();

    const context = blueprintInterview(shop!);
    expect(context.pages).toContain('Shop');
    // A basket and a checkout are filled from the database when the page is
    // served. Naming them would have the interview ask what goes on them.
    expect(context.pages).not.toContain('Your basket');
    expect(context.pages).not.toContain('Checkout');
    expect(context.sells).toBe(true);
  });

  it('asks for facts, never for section kinds', () => {
    const kinds = new Set<string>(SECTION_KINDS);
    for (const blueprint of BLUEPRINTS) {
      const context = blueprintInterview(blueprint);
      expect(context.pages.length).toBeGreaterThan(0);
      for (const need of context.needs) {
        // 'split', 'logos' and 'beforeafter' are Lumen's vocabulary. Putting
        // one in front of the model produces a question in front of a shop
        // owner that uses it too.
        expect(kinds.has(need)).toBe(false);
      }
      expect(new Set(context.needs).size).toBe(context.needs.length);
    }
  });

  it('reads the prices band on a template that has one as a question about prices', () => {
    const withPricing = BLUEPRINTS.find((blueprint) =>
      blueprint.pages.some((page) => page.sections.includes('pricing')),
    );
    expect(withPricing).toBeDefined();
    expect(blueprintInterview(withPricing!).needs).toContain('prices');
  });

  it('carries the action the template was built around', () => {
    const blueprint = blueprintById(BLUEPRINTS[0].id)!;
    expect(blueprintInterview(blueprint).action).toBe(blueprint.action);
    expect(blueprintInterview(blueprint).businessTypes).toEqual(blueprint.businessTypes);
  });
});

import { describe, expect, it } from 'vitest';
import { DEMO_PALETTES, INITIAL_SITE, NEON, SCRIPT, siteAfter } from './demo';

/**
 * The demo claims, in writing, that it is the product rather than a recording.
 * That claim is only true while each step actually does what its reply says —
 * so each one is checked against its own promise.
 */
describe('the scripted session', () => {
  it('changes something on every step', () => {
    let site = INITIAL_SITE;
    for (const step of SCRIPT) {
      const next = step.apply(site);
      expect(next, step.id).not.toEqual(site);
      site = next;
    }
  });

  it('never mutates the site it was given', () => {
    const before = JSON.stringify(INITIAL_SITE);
    for (const step of SCRIPT) step.apply(INITIAL_SITE);
    expect(JSON.stringify(INITIAL_SITE)).toBe(before);
  });

  it('gives the hero more air when it says it made it premium', () => {
    const step = SCRIPT.find((entry) => entry.id === 'premium')!;
    const after = step.apply(INITIAL_SITE);
    expect(after.density).toBe('airy');
    expect(after.headlineSize).toBeGreaterThan(INITIAL_SITE.headlineSize);
  });

  it('actually swaps the palette when it says it did', () => {
    const step = SCRIPT.find((entry) => entry.id === 'palette')!;
    expect(step.apply(INITIAL_SITE).palette).toEqual(NEON);
  });

  it('adds the pricing section below the menu, where it says it put it', () => {
    const step = SCRIPT.find((entry) => entry.id === 'pricing')!;
    const ids = step.apply(INITIAL_SITE).sections.map((section) => section.id);
    expect(ids).toContain('pricing');
    expect(ids.indexOf('pricing')).toBe(ids.indexOf('menu') + 1);
  });

  /** A visitor can click the same prompt twice; the rail must not grow twice. */
  it('is idempotent, so replaying a step cannot duplicate a section', () => {
    const step = SCRIPT.find((entry) => entry.id === 'pricing')!;
    const once = step.apply(INITIAL_SITE);
    expect(step.apply(once).sections).toEqual(once.sections);
  });

  it('rewrites the headline when it says it rewrote the headline', () => {
    const step = SCRIPT.find((entry) => entry.id === 'copy')!;
    expect(step.apply(INITIAL_SITE).headline).not.toBe(INITIAL_SITE.headline);
  });

  it('only names sections that exist by the time it touches them', () => {
    SCRIPT.forEach((step, index) => {
      const site = siteAfter(index + 1);
      for (const id of step.touches) {
        expect(site.sections.some((section) => section.id === id), `${step.id} → ${id}`).toBe(true);
      }
    });
  });

  it('ends somewhere different from where it started', () => {
    const end = siteAfter(SCRIPT.length);
    expect(end.palette).not.toEqual(INITIAL_SITE.palette);
    expect(end.sections.length).toBeGreaterThan(INITIAL_SITE.sections.length);
  });
});

describe('the palettes a visitor can pick', () => {
  it('spells every colour as a hex value the preview can use directly', () => {
    for (const option of DEMO_PALETTES) {
      for (const [key, value] of Object.entries(option.palette)) {
        expect(value, `${option.id}.${key}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('has distinct accents, so the chosen one is visibly chosen', () => {
    const accents = DEMO_PALETTES.map((option) => option.palette.accent);
    expect(new Set(accents).size).toBe(accents.length);
  });
});

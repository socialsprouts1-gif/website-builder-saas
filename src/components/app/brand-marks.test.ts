import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONNECTORS } from '@/lib/connectors/providers';
import { BRAND_MARKS } from './brand-marks';

const mark = readFileSync(join(process.cwd(), 'src/components/app/ConnectorMark.tsx'), 'utf8');

/** The providers ConnectorMark draws itself, for the ones with no brand. */
const drawn = [...mark.matchAll(/^ {2}(\w+): \(/gm)].map((match) => match[1]);

describe('every connector has a logo', () => {
  it.each(CONNECTORS.map((connector) => [connector.provider, connector.name]))(
    '%s',
    (provider) => {
      // The fallback is the first letter of the name in a box. It is there so
      // nothing crashes, not so a connector can ship looking unfinished.
      expect(BRAND_MARKS[provider] || drawn.includes(provider)).toBeTruthy();
    },
  );

  it('finds the drawn ones, so the check above cannot pass by reading nothing', () => {
    expect(drawn.length).toBeGreaterThan(0);
    expect(Object.keys(BRAND_MARKS).length).toBeGreaterThan(10);
  });
});

describe('the marks themselves', () => {
  it.each(Object.entries(BRAND_MARKS))('%s is a usable path in a real colour', (_provider, brand) => {
    expect(brand.path.length).toBeGreaterThan(20);
    expect(brand.path).toMatch(/^[Mm]/);
    expect(brand.colour).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  /**
   * The grid sits on a near-black surface, so a mark in a near-black brand
   * colour is an empty box. Those are the ones drawn in white instead — this
   * is what stops a new one being pasted in at #000000 and disappearing.
   */
  it('is readable on the surface it is drawn on', () => {
    for (const [provider, brand] of Object.entries(BRAND_MARKS)) {
      const value = Number.parseInt(brand.colour.slice(1), 16);
      const r = (value >> 16) & 255;
      const g = (value >> 8) & 255;
      const b = value & 255;
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      expect(luminance, `${provider} is too dark to see`).toBeGreaterThan(0.2);
    }
  });
});

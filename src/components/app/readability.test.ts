import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A reviewer said the app was hard to read on a phone. They were right, and
 * both halves of why are checkable: the type was small, and the greys it was
 * set in were below the contrast floor.
 *
 * These are the two floors. Neither is a style opinion — they are the sizes and
 * ratios below which text stops being legible to somebody who is not twenty
 * five with a new screen.
 */

const UI = globSync('src/{app,components}/**/*.tsx', { cwd: process.cwd() }).map((path) =>
  path.replace(/\\/g, '/'),
);

/** Smallest type anywhere in the interface. */
const FLOOR_PX = 11;

describe('nothing in the app is too small to read', () => {
  it('finds the files it is meant to be checking', () => {
    expect(UI.length).toBeGreaterThan(50);
  });

  it('sets no text below the floor', () => {
    const offenders: string[] = [];
    for (const path of UI) {
      const source = readFileSync(join(process.cwd(), path), 'utf8');
      for (const match of source.matchAll(/text-\[([0-9.]+)px\]/g)) {
        if (Number.parseFloat(match[1]) < FLOOR_PX) offenders.push(`${path}: ${match[0]}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  /**
   * Body copy specifically. A 12px label on a chip is fine; a 12px paragraph
   * is the thing somebody squinted at.
   */
  it('keeps ordinary body text at 14px or more', () => {
    const body = UI.filter((path) => !path.includes('/admin/'));
    const small: string[] = [];
    for (const path of body) {
      const source = readFileSync(join(process.cwd(), path), 'utf8');
      for (const match of source.matchAll(/text-\[([0-9.]+)px\][^"'`]*leading-relaxed/g)) {
        if (Number.parseFloat(match[1]) < 14) small.push(`${path}: ${match[0]}`);
      }
    }
    expect(small, small.join('\n')).toEqual([]);
  });
});

describe('the greys it is set in', () => {
  const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

  const token = (name: string) => css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1] ?? '';

  /** WCAG relative luminance, which is what a contrast ratio is built from. */
  function luminance(hex: string): number {
    const channel = (value: number) => {
      const srgb = value / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    };
    const value = Number.parseInt(hex.slice(1), 16);
    return (
      0.2126 * channel((value >> 16) & 255) +
      0.7152 * channel((value >> 8) & 255) +
      0.0722 * channel(value & 255)
    );
  }

  const ratio = (a: string, b: string) => {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
  };

  it('reads the tokens it is checking', () => {
    for (const name of ['--bg-base', '--text-primary', '--text-secondary', '--text-muted']) {
      expect(token(name), name).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('clears AA for every grey text is set in', () => {
    const background = token('--bg-base');
    expect(ratio(token('--text-primary'), background)).toBeGreaterThan(7);
    expect(ratio(token('--text-secondary'), background)).toBeGreaterThan(7);
    // Muted is for labels and asides — AA for normal text, not AAA.
    expect(ratio(token('--text-muted'), background)).toBeGreaterThan(4.5);
  });

  it('keeps them a hierarchy rather than three shades of the same grey', () => {
    const background = token('--bg-base');
    expect(ratio(token('--text-primary'), background)).toBeGreaterThan(
      ratio(token('--text-secondary'), background),
    );
    expect(ratio(token('--text-secondary'), background)).toBeGreaterThan(
      ratio(token('--text-muted'), background),
    );
  });
});

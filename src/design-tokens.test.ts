import { describe, expect, it } from 'vitest';
import defaultTheme from 'tailwindcss/defaultTheme';
import config from '../tailwind.config';

/**
 * A colour named the same as a font size silently eats it.
 *
 * Tailwind registers textColor after fontSize, so when both plugins can make a
 * `text-<name>` utility the colour wins. Naming the page background `base` in
 * `colors` therefore turned every `text-base` into `color: var(--bg-base)` —
 * the exact colour of the page — and the home page's hero paragraph was
 * invisible above 640px for it. Nothing catches that on its own: it type
 * checks, it lints, it builds, and it looks correct on a phone, because the
 * class was written `sm:text-base`.
 */
const fontSizes = Object.keys(defaultTheme.fontSize ?? {});

describe('the colour tokens', () => {
  const colors = (config.theme?.extend?.colors ?? {}) as Record<string, unknown>;

  it('found the font sizes to compare against', () => {
    expect(fontSizes).toContain('base');
    expect(fontSizes.length).toBeGreaterThan(5);
  });

  it.each(fontSizes.map((name) => [name]))(
    'does not name a colour "%s", which is already a font size',
    (name) => {
      expect(Object.keys(colors)).not.toContain(name);
    },
  );

  it('keeps the page background reachable as a background utility', () => {
    const backgrounds = (config.theme?.extend?.backgroundColor ?? {}) as Record<string, unknown>;
    expect(backgrounds.base).toBe('var(--bg-base)');
  });
});

import { describe, expect, it } from 'vitest';
import { designVariants, luminance, mix, parseHex, readableInk, variantById } from './variants';
import { FALLBACK_TOKENS } from './tokens';

describe('parseHex', () => {
  it('reads both lengths', () => {
    expect(parseHex('#ffffff')).toEqual([255, 255, 255]);
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('#D7FF3E')).toEqual([215, 255, 62]);
  });

  it('refuses what is not a hex colour', () => {
    expect(parseHex('rgba(0,0,0,0.1)')).toBeNull();
    expect(parseHex('red')).toBeNull();
    expect(parseHex('')).toBeNull();
  });
});

describe('readableInk', () => {
  // The failure this prevents is dark text on a dark button: legible in the
  // designer's head, unreadable on the page, and nobody reports it.
  it.each([
    ['white', '#FFFFFF', '#111111'],
    ['a pale cream', '#FBFAF8', '#111111'],
    ['lime, which is brighter than it looks', '#D7FF3E', '#111111'],
    ['black', '#000000', '#FFFFFF'],
    ['a deep navy', '#0B1F3A', '#FFFFFF'],
    ['a strong red', '#B3261E', '#FFFFFF'],
  ])('puts readable ink on %s', (_label, background, expected) => {
    expect(readableInk(background)).toBe(expected);
  });

  // Green carries most of what the eye reads as brightness, so an average of
  // the channels puts black text on a mid-green button.
  it('is not fooled by green', () => {
    expect(readableInk('#00A550')).toBe('#FFFFFF');
    expect(readableInk('#7BE495')).toBe('#111111');
  });

  it('has an answer for a colour it cannot parse', () => {
    expect(['#111111', '#FFFFFF']).toContain(readableInk('rgba(1,2,3,0.4)'));
  });
});

describe('luminance', () => {
  it('runs from black to white', () => {
    expect(luminance('#000000')).toBeCloseTo(0, 3);
    expect(luminance('#FFFFFF')).toBeCloseTo(1, 3);
  });

  it('orders colours the way an eye does', () => {
    expect(luminance('#FFFF00')).toBeGreaterThan(luminance('#0000FF'));
  });
});

describe('mix', () => {
  it('moves a colour towards another', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 1)).toBe('#ffffff');
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });

  it('clamps rather than overshooting', () => {
    expect(mix('#000000', '#FFFFFF', 5)).toBe('#ffffff');
    expect(mix('#000000', '#FFFFFF', -5)).toBe('#000000');
  });

  it('gives back what it was given when it cannot parse', () => {
    expect(mix('rgba(0,0,0,1)', '#FFFFFF', 0.5)).toBe('rgba(0,0,0,1)');
  });
});

describe('designVariants', () => {
  const base = FALLBACK_TOKENS;
  const variants = designVariants(base);

  it('offers three, each with a name and a reason', () => {
    expect(variants).toHaveLength(3);
    expect(variants.map((variant) => variant.id)).toEqual(['soft', 'sharp', 'warm']);
    for (const variant of variants) {
      expect(variant.name).toBeTruthy();
      expect(variant.note.length).toBeGreaterThan(20);
    }
  });

  // The accent is the one thing that belongs to the business. Everything else
  // is treatment, and a "variant" that repainted their brand colour would be a
  // different business's website.
  it('keeps the business’s accent in every one', () => {
    for (const variant of variants) {
      expect(variant.tokens.palette.accent).toBe(base.palette.accent);
    }
  });

  it('gives every variant readable ink on its own ground', () => {
    for (const variant of variants) {
      const { bg, ink, accent, accentInk } = variant.tokens.palette;
      // Not merely different — far enough apart to read.
      expect(Math.abs(luminance(bg) - luminance(ink))).toBeGreaterThan(0.4);
      expect(accentInk).toBe(readableInk(accent));
    }
  });

  it('makes three looks that are actually different', () => {
    const grounds = new Set(variants.map((variant) => variant.tokens.palette.bg));
    const corners = new Set(variants.map((variant) => variant.tokens.radius));
    const rhythms = new Set(variants.map((variant) => variant.tokens.density));
    expect(grounds.size).toBe(3);
    expect(corners.size).toBe(3);
    expect(rhythms.size).toBe(3);
  });

  it('carries the site’s fonts through rather than reinventing them', () => {
    const custom = {
      ...base,
      fonts: { display: 'Fraunces', body: 'Inter', googleHref: 'https://fonts.googleapis.com/css2?family=Inter' },
    };
    for (const variant of designVariants(custom)) {
      expect(variant.tokens.fonts.display).toBe('Fraunces');
      expect(variant.tokens.fonts.googleHref).toBe(custom.fonts.googleHref);
    }
  });

  it('builds the warm ground from the accent, so it belongs to the brand', () => {
    const green = { ...base, palette: { ...base.palette, accent: '#0F7B4A' } };
    const red = { ...base, palette: { ...base.palette, accent: '#B3261E' } };
    const warmGreen = designVariants(green).find((variant) => variant.id === 'warm')!;
    const warmRed = designVariants(red).find((variant) => variant.id === 'warm')!;
    expect(warmGreen.tokens.palette.bg).not.toBe(warmRed.tokens.palette.bg);
  });

  it('survives tokens with nothing usable in them', () => {
    const empty = { ...base, palette: { ...base.palette, accent: '' } };
    for (const variant of designVariants(empty)) {
      expect(variant.tokens.palette.accent).toBeTruthy();
    }
  });
});

describe('variantById', () => {
  it('finds one by name', () => {
    expect(variantById(FALLBACK_TOKENS, 'warm')?.name).toBe('Warm');
  });

  it('has nothing for a name it does not know', () => {
    expect(variantById(FALLBACK_TOKENS, 'neon')).toBeNull();
  });
});

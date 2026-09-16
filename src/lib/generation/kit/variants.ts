import { FALLBACK_TOKENS, type DesignTokens } from './tokens';

/**
 * Three looks for the same site.
 *
 * The single most asked-for thing in any builder, and it turns out to be
 * nearly free here: a site's design lives entirely in its tokens, and the
 * words live in the sections. So a variant is a token set, not a second
 * generation — no extra model call, no waiting, and switching is one file
 * rewritten. What someone is choosing between is genuinely the same site,
 * which is what they want to be choosing between.
 *
 * All three keep the business's accent colour. That is the one thing that is
 * theirs; the rest is treatment.
 */

export interface DesignVariant {
  id: 'soft' | 'sharp' | 'warm';
  name: string;
  /** What it is for, in the terms a shop owner would use. */
  note: string;
  tokens: DesignTokens;
}

// ---------------------------------------------------------------- colour --

/** A hex colour as its three channels, or null if it is not one. */
export function parseHex(value: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;

  const digits = match[1];
  const full = digits.length === 3 ? digits.replace(/./g, (c) => c + c) : digits;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/**
 * Relative luminance, the way the contrast standard defines it.
 *
 * Not the average of the channels: green carries most of what the eye reads as
 * brightness, and a naive average puts black text on a mid-green button.
 */
export function luminance(value: string): number {
  const rgb = parseHex(value);
  if (!rgb) return 0.5;

  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Black or white, whichever can actually be read on this colour. */
export function readableInk(background: string, dark = '#111111', light = '#FFFFFF'): string {
  return luminance(background) > 0.45 ? dark : light;
}

/** Moves a colour towards black or white, for surfaces built from the accent. */
export function mix(value: string, towards: string, amount: number): string {
  const from = parseHex(value);
  const to = parseHex(towards);
  if (!from || !to) return value;

  const blend = (a: number, b: number) => Math.round(a + (b - a) * Math.min(1, Math.max(0, amount)));
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(blend(from[0], to[0]))}${hex(blend(from[1], to[1]))}${hex(blend(from[2], to[2]))}`;
}

// -------------------------------------------------------------- variants --

const BLACK = '#0B0B0C';
const WHITE = '#FFFFFF';

/**
 * Builds the three looks from whatever the site already has.
 *
 * The accent is carried through unchanged. Everything else — the ground, the
 * ink, the corners, the rhythm — is what makes the three feel different, and
 * each one is a coherent set rather than a slider moved.
 */
export function designVariants(base: DesignTokens): DesignVariant[] {
  const accent = base.palette.accent || FALLBACK_TOKENS.palette.accent;
  const onAccent = readableInk(accent);
  const display = base.fonts.display || FALLBACK_TOKENS.fonts.display;
  const body = base.fonts.body || FALLBACK_TOKENS.fonts.body;

  return [
    {
      id: 'soft',
      name: 'Soft',
      note: 'Light and roomy. Reads calm — good for clinics, salons and studios.',
      tokens: {
        ...base,
        palette: {
          bg: '#FBFAF8',
          surface: WHITE,
          surfaceAlt: '#F3F1EC',
          ink: '#1A1A17',
          inkMuted: '#6B6A63',
          accent,
          accentInk: onAccent,
          border: 'rgba(0,0,0,0.10)',
        },
        fonts: { display, body, googleHref: base.fonts.googleHref },
        radius: '14px',
        radiusLarge: '28px',
        density: 'airy',
        texture: 'gradient',
        mood: 'Light, calm, generous',
      },
    },
    {
      id: 'sharp',
      name: 'Sharp',
      note: 'Dark and high contrast. Confident — good for gyms, trades and tech.',
      tokens: {
        ...base,
        palette: {
          bg: BLACK,
          surface: '#141416',
          surfaceAlt: '#1C1C20',
          ink: '#F6F6F4',
          inkMuted: '#9C9CA2',
          accent,
          accentInk: onAccent,
          border: 'rgba(255,255,255,0.12)',
        },
        fonts: { display, body, googleHref: base.fonts.googleHref },
        radius: '2px',
        radiusLarge: '4px',
        density: 'tight',
        texture: 'flat',
        mood: 'Dark, sharp, confident',
      },
    },
    {
      id: 'warm',
      name: 'Warm',
      note: 'Sand and ink. Feels established — good for restaurants, shops and family businesses.',
      tokens: {
        ...base,
        palette: {
          // Built from the accent rather than a fixed cream, so a green
          // business gets a warm green ground and a red one a warm red.
          bg: mix(accent, '#FFFDF7', 0.92),
          surface: mix(accent, WHITE, 0.96),
          surfaceAlt: mix(accent, '#FFFDF7', 0.84),
          ink: '#241F1A',
          inkMuted: '#6E6459',
          accent,
          accentInk: onAccent,
          border: 'rgba(36,31,26,0.14)',
        },
        fonts: { display, body, googleHref: base.fonts.googleHref },
        radius: '10px',
        radiusLarge: '20px',
        density: 'regular',
        texture: 'grain',
        mood: 'Warm, grounded, established',
      },
    },
  ];
}

export function variantById(base: DesignTokens, id: string): DesignVariant | null {
  return designVariants(base).find((variant) => variant.id === id) ?? null;
}

/**
 * The design tokens every generated site is built from.
 *
 * One flat, closed set. The model chooses the values; nothing else in the
 * pipeline invents a colour or a size, so two sites differ by their tokens
 * rather than by one having reinvented what a card is.
 */

export interface DesignTokens {
  palette: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    ink: string;
    inkMuted: string;
    accent: string;
    accentInk: string;
    border: string;
  };
  fonts: {
    display: string;
    body: string;
    /** Google Fonts stylesheet, or null for system fonts only. */
    googleHref: string | null;
  };
  radius: string;
  radiusLarge: string;
  /** Which of the built-in section rhythms this site uses. */
  density: 'tight' | 'regular' | 'airy';
  /** The decorative treatment behind hero and band sections. */
  texture: 'flat' | 'gradient' | 'grain' | 'rings';
  mood: string;
}

export const FALLBACK_TOKENS: DesignTokens = {
  palette: {
    bg: '#0B0B0C',
    surface: '#141416',
    surfaceAlt: '#1B1B1F',
    ink: '#F5F5F4',
    inkMuted: '#9A9A9E',
    accent: '#D7FF3E',
    accentInk: '#0B0B0C',
    border: 'rgba(255,255,255,0.10)',
  },
  fonts: {
    display: 'Georgia, "Times New Roman", serif',
    body: 'system-ui, "Segoe UI", Helvetica, Arial, sans-serif',
    googleHref: null,
  },
  radius: '10px',
  radiusLarge: '20px',
  density: 'regular',
  texture: 'gradient',
  mood: 'Confident and clean',
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const CSS_COLOUR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\)|hsla?\([\d\s.,%/deg]+\))$/i;

/**
 * A model's JSON is not trusted to be CSS. Anything unusable falls back to the
 * matching default rather than reaching a stylesheet, where one bad value can
 * break every page at once.
 */
export function normaliseTokens(raw: unknown): DesignTokens {
  const input = (raw ?? {}) as Record<string, never>;
  const palette = (input.palette ?? {}) as Record<string, unknown>;
  const fonts = (input.fonts ?? {}) as Record<string, unknown>;

  const colour = (value: unknown, fallback: string): string => {
    const text = typeof value === 'string' ? value.trim() : '';
    return CSS_COLOUR.test(text) ? text : fallback;
  };

  const font = (value: unknown, fallback: string): string => {
    const text = typeof value === 'string' ? value.trim() : '';
    // A font stack is names, quotes, commas and spaces. Nothing else belongs
    // in one, and a stray brace would close the rule it sits in.
    return text && /^[-\w\s,'"]+$/.test(text) && text.length < 200 ? text : fallback;
  };

  const size = (value: unknown, fallback: string): string => {
    const text = typeof value === 'string' ? value.trim() : '';
    return /^[\d.]+(px|rem|em|%)$/.test(text) ? text : fallback;
  };

  const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback;

  return {
    palette: {
      bg: colour(palette.bg, FALLBACK_TOKENS.palette.bg),
      surface: colour(palette.surface, FALLBACK_TOKENS.palette.surface),
      surfaceAlt: colour(palette.surfaceAlt, FALLBACK_TOKENS.palette.surfaceAlt),
      ink: colour(palette.ink, FALLBACK_TOKENS.palette.ink),
      inkMuted: colour(palette.inkMuted, FALLBACK_TOKENS.palette.inkMuted),
      accent: colour(palette.accent, FALLBACK_TOKENS.palette.accent),
      accentInk: colour(palette.accentInk, FALLBACK_TOKENS.palette.accentInk),
      border: colour(palette.border, FALLBACK_TOKENS.palette.border),
    },
    fonts: {
      display: font(fonts.display, FALLBACK_TOKENS.fonts.display),
      body: font(fonts.body, FALLBACK_TOKENS.fonts.body),
      googleHref: googleFontsHref(fonts.googleHref),
    },
    radius: size(input.radius, FALLBACK_TOKENS.radius),
    radiusLarge: size(input.radiusLarge, FALLBACK_TOKENS.radiusLarge),
    density: oneOf(input.density, ['tight', 'regular', 'airy'] as const, FALLBACK_TOKENS.density),
    texture: oneOf(input.texture, ['flat', 'gradient', 'grain', 'rings'] as const, FALLBACK_TOKENS.texture),
    mood: typeof input.mood === 'string' ? String(input.mood).slice(0, 120) : FALLBACK_TOKENS.mood,
  };
}

/** Only a real Google Fonts stylesheet is allowed into a page's <head>. */
function googleFontsHref(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:') return null;
    if (url.host !== 'fonts.googleapis.com') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const isHex = (value: string): boolean => HEX.test(value);

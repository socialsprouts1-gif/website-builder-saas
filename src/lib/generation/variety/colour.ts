/**
 * Palettes that are generated rather than chosen from a list.
 *
 * A fixed list of palettes is a fixed number of looks, and people notice the
 * repeat faster than anyone expects — about the fourth site. This builds one
 * from a hue and a recipe, so the space is continuous and two builds are
 * different without being random mush.
 *
 * In OKLCH rather than HSL, and that is the whole reason this file is longer
 * than a one-liner. HSL's lightness is a lie: `hsl(60 100% 50%)` (yellow) and
 * `hsl(240 100% 50%)` (blue) claim the same lightness and one of them is
 * nearly white while the other is nearly black. Pick text and background from
 * HSL at fixed lightness and half your palettes are unreadable. OKLCH's L is
 * perceptual, so "L 0.22 background, L 0.95 text" is a real contrast ratio at
 * every hue, and the check at the end almost never has to correct anything.
 */

export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  inkMuted: string;
  accent: string;
  accentInk: string;
  border: string;
}

/** Linear-light sRGB to gamma-encoded, per the sRGB transfer function. */
function encode(channel: number): number {
  const clamped = Math.max(0, Math.min(1, channel));
  return clamped <= 0.003_130_8
    ? clamped * 12.92
    : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

function decode(channel: number): number {
  return channel <= 0.040_45 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

/**
 * OKLCH to a hex colour.
 *
 * Björn Ottosson's Oklab, with the standard matrices. Out-of-gamut colours are
 * clamped per channel rather than desaturated properly — which is a real
 * approximation, but at the chroma this file asks for (never above 0.19) it
 * only bites in the far corners of the space, and the alternative is a gamut
 * mapping routine nobody here will ever read.
 */
export function oklchToHex(lightness: number, chroma: number, hueDegrees: number): string {
  const hue = (hueDegrees * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);

  const l = (lightness + 0.396_337_777_4 * a + 0.215_803_757_3 * b) ** 3;
  const m = (lightness - 0.105_561_345_8 * a - 0.063_854_172_8 * b) ** 3;
  const s = (lightness - 0.089_484_177_5 * a - 1.291_485_548 * b) ** 3;

  const red = encode(4.076_741_662_1 * l - 3.307_711_591_3 * m + 0.230_969_929_2 * s);
  const green = encode(-1.268_438_004_6 * l + 2.609_757_401_1 * m - 0.341_319_396_5 * s);
  const blue = encode(-0.004_196_086_3 * l - 0.703_418_614_7 * m + 1.707_614_701 * s);

  const byte = (channel: number) =>
    Math.round(Math.max(0, Math.min(1, channel)) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${byte(red)}${byte(green)}${byte(blue)}`;
}

/** Relative luminance, as WCAG defines it. */
export function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((character) => character + character)
          .join('')
      : value;
  const [red, green, blue] = [0, 2, 4].map((offset) =>
    decode(Number.parseInt(full.slice(offset, offset + 2), 16) / 255),
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** The WCAG contrast ratio between two colours, 1 to 21. */
export function contrast(first: string, second: string): number {
  const a = luminance(first);
  const b = luminance(second);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/** The AA threshold for body text. Large text is 3, and this does not use it. */
export const AA = 4.5;

export type Mood = 'dark' | 'light' | 'warm' | 'cool' | 'mono';

export interface PaletteRecipe {
  /** Where the background sits on the lightness axis, 0 to 1. */
  bgL: number;
  /** How much colour is in the background. Zero is a true neutral. */
  bgC: number;
  /** The accent's lightness and chroma. */
  accentL: number;
  accentC: number;
  /** How far the accent's hue is from the background's. */
  accentShift: number;
  /** Whether the ink is light on dark or the other way round. */
  dark: boolean;
}

export const RECIPES: Record<string, PaletteRecipe> = {
  // Near-black with one luminous accent. The look everything 3D defaults to,
  // kept because it is right for a lot of things — just no longer the only one.
  midnight: { bgL: 0.17, bgC: 0.03, accentL: 0.78, accentC: 0.17, accentShift: 0, dark: true },
  // Gallery white. Almost no colour anywhere, one deep accent.
  gallery: { bgL: 0.97, bgC: 0.006, accentL: 0.48, accentC: 0.14, accentShift: 0, dark: false },
  // Paper and ink, warmed. An editorial look.
  paper: { bgL: 0.94, bgC: 0.02, accentL: 0.42, accentC: 0.11, accentShift: 20, dark: false },
  // Deep colour rather than black: the background is the brand.
  saturated: { bgL: 0.26, bgC: 0.08, accentL: 0.84, accentC: 0.16, accentShift: 150, dark: true },
  // Two colours a long way apart, both strong.
  duotone: { bgL: 0.21, bgC: 0.06, accentL: 0.8, accentC: 0.19, accentShift: 180, dark: true },
  // Warm neutrals, low contrast between surfaces, one quiet accent.
  sand: { bgL: 0.91, bgC: 0.025, accentL: 0.45, accentC: 0.09, accentShift: -30, dark: false },
  // Almost monochrome, the accent barely raising its voice.
  slate: { bgL: 0.3, bgC: 0.015, accentL: 0.72, accentC: 0.07, accentShift: 0, dark: true },
};

export type RecipeName = keyof typeof RECIPES;

/**
 * A palette from a hue and a recipe, guaranteed readable.
 *
 * The contrast check at the end is not decoration. A generated palette that is
 * merely usually readable is a product that ships unreadable sites at some
 * rate — and nobody finds out until a customer's site is already live. So the
 * ink is pushed toward its extreme until it passes AA against both the
 * background and the surface, and the accent's text colour is chosen by
 * measurement rather than by assumption about whether the accent is "dark".
 */
export function buildPalette(hue: number, recipeName: RecipeName): Palette {
  const recipe = RECIPES[recipeName] ?? RECIPES.midnight;
  const wrap = (value: number) => ((value % 360) + 360) % 360;

  const bg = oklchToHex(recipe.bgL, recipe.bgC, hue);
  // Surfaces step toward the ink, so cards lift off the page rather than
  // needing a border to be visible at all.
  const step = recipe.dark ? 0.045 : -0.035;
  const surface = oklchToHex(recipe.bgL + step, recipe.bgC, hue);
  const surfaceAlt = oklchToHex(recipe.bgL + step * 2, recipe.bgC, hue);

  const accentHue = wrap(hue + recipe.accentShift);
  const accent = oklchToHex(recipe.accentL, recipe.accentC, accentHue);

  // Ink, pushed until it passes against the lightest surface it sits on —
  // which is the surface, not the background, and is the one people get wrong.
  let inkL = recipe.dark ? 0.95 : 0.2;
  let ink = oklchToHex(inkL, recipe.bgC * 0.5, hue);
  for (let attempt = 0; attempt < 24; attempt += 1) {
    if (contrast(ink, surfaceAlt) >= AA && contrast(ink, bg) >= AA) break;
    inkL = recipe.dark ? Math.min(1, inkL + 0.02) : Math.max(0, inkL - 0.02);
    ink = oklchToHex(inkL, recipe.bgC * 0.5, hue);
  }

  // Muted ink has to clear AA too. "Secondary text" is still text, and this is
  // the token that fails on real sites while nobody is looking.
  let mutedL = recipe.dark ? inkL - 0.22 : inkL + 0.26;
  let inkMuted = oklchToHex(mutedL, recipe.bgC * 0.5, hue);
  for (let attempt = 0; attempt < 24; attempt += 1) {
    if (contrast(inkMuted, surfaceAlt) >= AA && contrast(inkMuted, bg) >= AA) break;
    mutedL = recipe.dark ? Math.min(1, mutedL + 0.02) : Math.max(0, mutedL - 0.02);
    inkMuted = oklchToHex(mutedL, recipe.bgC * 0.5, hue);
  }

  // Measured, not assumed: a mid-lightness accent can go either way, and
  // guessing gets white text on yellow.
  const accentInk =
    contrast('#ffffff', accent) >= contrast('#000000', accent) ? '#ffffff' : '#111111';

  const border = oklchToHex(
    recipe.dark ? recipe.bgL + 0.12 : recipe.bgL - 0.1,
    recipe.bgC,
    hue,
  );

  return { bg, surface, surfaceAlt, ink, inkMuted, accent, accentInk, border };
}

/** How far apart two hues are, 0 to 180 — for the similarity check. */
export function hueDistance(first: number, second: number): number {
  const raw = Math.abs(((first % 360) + 360) % 360 - (((second % 360) + 360) % 360));
  return raw > 180 ? 360 - raw : raw;
}

/**
 * The type pairings a generated site can be set in.
 *
 * A pool rather than one pairing per design template, because the typeface is
 * the single loudest thing about a page: two sites in the same colours with
 * different type read as two sites, and two sites in different colours with
 * the same type read as the same site wearing a different shirt. That was the
 * complaint.
 *
 * All Google Fonts, because the generated site loads them from the Google
 * stylesheet already named in its CSP. Tagged by mood so the archetype can
 * draw from the right end of the pool rather than at random — a brutalist
 * site and a wellness site should never swap type, however much variety is
 * wanted.
 */

export type FontMood =
  | 'editorial'
  | 'grotesk'
  | 'brutal'
  | 'organic'
  | 'technical'
  | 'playful'
  | 'luxury'
  | 'classical';

export interface FontPair {
  id: string;
  display: string;
  body: string;
  /** The family list for the Google stylesheet, weights included. */
  href: string;
  moods: FontMood[];
}

const g = (families: string) =>
  `https://fonts.googleapis.com/css2?${families}&display=swap`;

export const FONT_PAIRS: FontPair[] = [
  { id: 'fraunces-inter', display: '"Fraunces", Georgia, serif', body: '"Inter", system-ui, sans-serif', href: g('family=Fraunces:opsz,wght@9..144,400..800&family=Inter:wght@300..600'), moods: ['editorial', 'organic', 'luxury'] },
  { id: 'playfair-inter', display: '"Playfair Display", Georgia, serif', body: '"Inter", system-ui, sans-serif', href: g('family=Playfair+Display:wght@400..800&family=Inter:wght@300..600'), moods: ['editorial', 'luxury', 'classical'] },
  { id: 'dmserif-dmsans', display: '"DM Serif Display", Georgia, serif', body: '"DM Sans", system-ui, sans-serif', href: g('family=DM+Serif+Display&family=DM+Sans:wght@300..700'), moods: ['editorial', 'luxury'] },
  { id: 'cormorant-jost', display: '"Cormorant Garamond", Georgia, serif', body: '"Jost", system-ui, sans-serif', href: g('family=Cormorant+Garamond:wght@300..700&family=Jost:wght@300..600'), moods: ['luxury', 'classical', 'editorial'] },
  { id: 'spacegrotesk-inter', display: '"Space Grotesk", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif', href: g('family=Space+Grotesk:wght@400..700&family=Inter:wght@300..600'), moods: ['technical', 'grotesk'] },
  { id: 'archivo-archivo', display: '"Archivo Black", system-ui, sans-serif', body: '"Archivo", system-ui, sans-serif', href: g('family=Archivo+Black&family=Archivo:wght@300..700'), moods: ['brutal', 'grotesk'] },
  { id: 'anton-inter', display: '"Anton", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif', href: g('family=Anton&family=Inter:wght@300..600'), moods: ['brutal', 'playful'] },
  { id: 'bebas-karla', display: '"Bebas Neue", system-ui, sans-serif', body: '"Karla", system-ui, sans-serif', href: g('family=Bebas+Neue&family=Karla:wght@300..700'), moods: ['brutal', 'technical'] },
  { id: 'syne-inter', display: '"Syne", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif', href: g('family=Syne:wght@400..800&family=Inter:wght@300..600'), moods: ['playful', 'technical', 'grotesk'] },
  { id: 'outfit-outfit', display: '"Outfit", system-ui, sans-serif', body: '"Outfit", system-ui, sans-serif', href: g('family=Outfit:wght@200..800'), moods: ['grotesk', 'technical'] },
  { id: 'sora-inter', display: '"Sora", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif', href: g('family=Sora:wght@300..700&family=Inter:wght@300..600'), moods: ['technical', 'grotesk'] },
  { id: 'manrope-manrope', display: '"Manrope", system-ui, sans-serif', body: '"Manrope", system-ui, sans-serif', href: g('family=Manrope:wght@300..800'), moods: ['grotesk', 'technical'] },
  { id: 'bitter-nunito', display: '"Bitter", Georgia, serif', body: '"Nunito Sans", system-ui, sans-serif', href: g('family=Bitter:wght@400..700&family=Nunito+Sans:wght@300..600'), moods: ['organic', 'editorial'] },
  { id: 'lora-lato', display: '"Lora", Georgia, serif', body: '"Lato", system-ui, sans-serif', href: g('family=Lora:wght@400..700&family=Lato:wght@300;400;700'), moods: ['organic', 'classical'] },
  { id: 'poppins-poppins', display: '"Poppins", system-ui, sans-serif', body: '"Poppins", system-ui, sans-serif', href: g('family=Poppins:wght@300..700'), moods: ['playful', 'grotesk'] },
  { id: 'fredoka-nunito', display: '"Fredoka", system-ui, sans-serif', body: '"Nunito", system-ui, sans-serif', href: g('family=Fredoka:wght@400..600&family=Nunito:wght@300..700'), moods: ['playful', 'organic'] },
  { id: 'librebaskerville-inter', display: '"Libre Baskerville", Georgia, serif', body: '"Inter", system-ui, sans-serif', href: g('family=Libre+Baskerville:wght@400;700&family=Inter:wght@300..600'), moods: ['classical', 'editorial'] },
  { id: 'spectral-worksans', display: '"Spectral", Georgia, serif', body: '"Work Sans", system-ui, sans-serif', href: g('family=Spectral:wght@300..700&family=Work+Sans:wght@300..600'), moods: ['classical', 'editorial', 'organic'] },
  { id: 'chivo-chivo', display: '"Chivo", system-ui, sans-serif', body: '"Chivo", system-ui, sans-serif', href: g('family=Chivo:wght@300..800'), moods: ['grotesk', 'brutal'] },
  { id: 'unbounded-inter', display: '"Unbounded", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif', href: g('family=Unbounded:wght@300..700&family=Inter:wght@300..600'), moods: ['playful', 'brutal', 'technical'] },
  { id: 'instrument-inter', display: '"Instrument Serif", Georgia, serif', body: '"Inter", system-ui, sans-serif', href: g('family=Instrument+Serif:ital@0;1&family=Inter:wght@300..600'), moods: ['editorial', 'luxury'] },
  { id: 'ibmplex-ibmplex', display: '"IBM Plex Sans", system-ui, sans-serif', body: '"IBM Plex Sans", system-ui, sans-serif', href: g('family=IBM+Plex+Sans:wght@300..700'), moods: ['technical'] },
  { id: 'epilogue-inter', display: '"Epilogue", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif', href: g('family=Epilogue:wght@300..800&family=Inter:wght@300..600'), moods: ['grotesk', 'playful'] },
  { id: 'crimson-worksans', display: '"Crimson Pro", Georgia, serif', body: '"Work Sans", system-ui, sans-serif', href: g('family=Crimson+Pro:wght@300..700&family=Work+Sans:wght@300..600'), moods: ['classical', 'organic'] },
];

export function fontsForMood(moods: FontMood[]): FontPair[] {
  const matching = FONT_PAIRS.filter((pair) => pair.moods.some((mood) => moods.includes(mood)));
  // Never an empty pool: a mood nothing matches would otherwise crash a build
  // rather than fall back to type that merely is not the first choice.
  return matching.length > 0 ? matching : FONT_PAIRS;
}

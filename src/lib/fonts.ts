/**
 * The typefaces a site can be set in.
 *
 * A curated list rather than a font browser: every one is a pairing that works
 * at both ends of a page, and every one names the exact Google Fonts URL that
 * loads it — changing the family without changing the link is how you get a
 * site that silently falls back to Times.
 *
 * The system stack needs no link at all, which makes it the honest choice for
 * anyone who cares more about the page loading fast than about the letterforms.
 */

export interface FontChoice {
  id: string;
  label: string;
  /** The CSS font-family value written into the token. */
  family: string;
  /** The Google Fonts stylesheet that loads it, or null for system fonts. */
  googleHref: string | null;
  /** Which half of the pairing it suits. */
  roles: ('display' | 'body')[];
}

const google = (families: string) =>
  `https://fonts.googleapis.com/css2?${families}&display=swap`;

export const FONTS: FontChoice[] = [
  {
    id: 'system',
    label: 'System',
    family:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    googleHref: null,
    roles: ['display', 'body'],
  },
  {
    id: 'inter',
    label: 'Inter',
    family: '"Inter", ui-sans-serif, system-ui, sans-serif',
    googleHref: google('family=Inter:wght@400;500;600;700'),
    roles: ['display', 'body'],
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    family: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    googleHref: google('family=DM+Sans:wght@400;500;700'),
    roles: ['display', 'body'],
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    family: '"Playfair Display", Georgia, "Times New Roman", serif',
    googleHref: google('family=Playfair+Display:wght@500;600;700'),
    roles: ['display'],
  },
  {
    id: 'fraunces',
    label: 'Fraunces',
    family: '"Fraunces", Georgia, serif',
    googleHref: google('family=Fraunces:opsz,wght@9..144,500;9..144,700'),
    roles: ['display'],
  },
  {
    id: 'bricolage',
    label: 'Bricolage Grotesque',
    family: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
    googleHref: google('family=Bricolage+Grotesque:wght@500;700;800'),
    roles: ['display'],
  },
  {
    id: 'space-grotesk',
    label: 'Space Grotesk',
    family: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    googleHref: google('family=Space+Grotesk:wght@400;500;700'),
    roles: ['display', 'body'],
  },
  {
    id: 'source-serif',
    label: 'Source Serif',
    family: '"Source Serif 4", Georgia, serif',
    googleHref: google('family=Source+Serif+4:opsz,wght@8..60,400;8..60,600'),
    roles: ['body', 'display'],
  },
  {
    id: 'georgia',
    label: 'Georgia',
    family: 'Georgia, "Times New Roman", serif',
    googleHref: null,
    roles: ['display', 'body'],
  },
];

export function fontsFor(role: 'display' | 'body'): FontChoice[] {
  return FONTS.filter((font) => font.roles.includes(role));
}

export function findFont(id: string): FontChoice | undefined {
  return FONTS.find((font) => font.id === id);
}

/** Server-side guard: only a link we ourselves published may be written in. */
export function isKnownFontHref(href: string): boolean {
  return FONTS.some((font) => font.googleHref === href);
}

import type { DesignTokens } from './tokens';
import type { SectionKind } from './sections';

/**
 * The premium templates, one look per kind of business.
 *
 * A template is not a colour scheme. It decides the arrangement of every
 * section, the type pairing, the corner radius, the rhythm of the page, how
 * much the page moves, and how much depth it has. Those choices are made
 * together here, by hand, because that is what makes a design coherent — a
 * model picking a hex value cannot make a serif display face and a tight grid
 * agree with each other.
 *
 * This is the thing that was missing. Every site had the same skeleton and
 * differed only in its palette, so everything Lumen built looked like the same
 * site in a different shirt. A template changes the shape.
 */

export type Motion = 'none' | 'subtle' | 'lively';
export type Depth = 'flat' | 'raised' | 'dimensional';

export interface Template {
  id: string;
  name: string;
  /** What it feels like, in the words a designer would use. */
  note: string;
  /** Vertical slugs this suits. Empty means it suits anything. */
  verticals: string[];
  /** The arrangement of each section kind. Anything unnamed takes its default. */
  layouts: Partial<Record<SectionKind, string>>;
  /** Everything except the palette, which the model chooses for the business. */
  shape: Pick<DesignTokens, 'radius' | 'radiusLarge' | 'density' | 'texture'> & {
    fonts: DesignTokens['fonts'];
  };
  motion: Motion;
  depth: Depth;
  /** Steers the palette the model writes, so it agrees with the shape. */
  paletteBrief: string;
}

const GOOGLE = (families: string) =>
  `https://fonts.googleapis.com/css2?${families}&display=swap`;

export const TEMPLATES: Template[] = [
  {
    id: 'atelier',
    name: 'Atelier',
    note: 'Editorial and unhurried. Oversized type, generous white space, photography given room.',
    verticals: ['salon', 'retail', 'photography', 'interiors'],
    layouts: {
      hero: 'editorial',
      about: 'offset',
      features: 'numbered',
      services: 'index',
      gallery: 'stack',
      testimonials: 'feature',
      stats: 'inline',
      steps: 'timeline',
      cta: 'panel',
      contact: 'stacked',
    },
    shape: {
      fonts: {
        display: '"Fraunces", Georgia, serif',
        body: '"Inter", system-ui, sans-serif',
        googleHref: GOOGLE('family=Fraunces:opsz,wght@9..144,300..700&family=Inter:wght@300..600'),
      },
      radius: '2px',
      radiusLarge: '4px',
      density: 'airy',
      texture: 'grain',
    },
    motion: 'subtle',
    depth: 'flat',
    paletteBrief: 'Warm off-whites and deep ink, with one muted accent. Print, not screen.',
  },
  {
    id: 'vitrine',
    name: 'Vitrine',
    note: 'Product-first retail. A tilted showcase, a dense bento of categories, quiet chrome.',
    verticals: ['retail'],
    layouts: {
      hero: 'showcase',
      about: 'split',
      features: 'bento',
      services: 'cards',
      gallery: 'mosaic',
      testimonials: 'ticker',
      stats: 'band',
      pricing: 'cards',
      cta: 'full',
    },
    shape: {
      fonts: {
        display: '"Manrope", system-ui, sans-serif',
        body: '"Manrope", system-ui, sans-serif',
        googleHref: GOOGLE('family=Manrope:wght@300..800'),
      },
      radius: '16px',
      radiusLarge: '28px',
      density: 'regular',
      texture: 'gradient',
    },
    motion: 'lively',
    depth: 'dimensional',
    paletteBrief: 'Bright, clean and modern. A confident accent that works on a Buy button.',
  },
  {
    id: 'clinic',
    name: 'Calm',
    note: 'Light, spacious and reassuring. Nothing shouts; everything is easy to find.',
    verticals: ['clinic', 'legal', 'finance'],
    layouts: {
      hero: 'split',
      about: 'split',
      features: 'cards',
      services: 'rows',
      steps: 'timeline',
      gallery: 'grid',
      testimonials: 'cards',
      stats: 'inline',
      faq: 'split',
      cta: 'panel',
    },
    shape: {
      fonts: {
        display: '"Source Serif 4", Georgia, serif',
        body: '"Source Sans 3", system-ui, sans-serif',
        googleHref: GOOGLE('family=Source+Serif+4:opsz,wght@8..60,300..600&family=Source+Sans+3:wght@300..600'),
      },
      radius: '12px',
      radiusLarge: '20px',
      density: 'airy',
      texture: 'flat',
    },
    motion: 'subtle',
    depth: 'raised',
    paletteBrief: 'Light background, high contrast text, one calm accent — teal, sage or soft blue. No black.',
  },
  {
    id: 'kiln',
    name: 'Kiln',
    note: 'Warm, appetising and close. Dark surfaces, food given the whole width.',
    verticals: ['restaurant'],
    layouts: {
      hero: 'fullbleed',
      about: 'statement',
      features: 'cards',
      menu: 'index',
      services: 'index',
      gallery: 'mosaic',
      testimonials: 'feature',
      hours: 'inline',
      stats: 'inline',
      cta: 'full',
    },
    shape: {
      fonts: {
        display: '"Playfair Display", Georgia, serif',
        body: '"Karla", system-ui, sans-serif',
        googleHref: GOOGLE('family=Playfair+Display:wght@400..700&family=Karla:wght@300..600'),
      },
      radius: '4px',
      radiusLarge: '10px',
      density: 'regular',
      texture: 'grain',
    },
    motion: 'subtle',
    depth: 'raised',
    paletteBrief: 'Dark and warm — charcoal, ember, cream. Candlelight rather than daylight.',
  },
  {
    id: 'forge',
    name: 'Forge',
    note: 'Loud and high-contrast. Heavy type, a running ticker, built to be read on a phone.',
    verticals: ['gym', 'automotive'],
    layouts: {
      hero: 'fullbleed',
      about: 'statement',
      features: 'ticker',
      services: 'numbered',
      steps: 'numbered',
      gallery: 'rail',
      testimonials: 'ticker',
      stats: 'band',
      pricing: 'cards',
      cta: 'full',
    },
    shape: {
      fonts: {
        display: '"Archivo", system-ui, sans-serif',
        body: '"Archivo", system-ui, sans-serif',
        googleHref: GOOGLE('family=Archivo:wght@400..900'),
      },
      radius: '2px',
      radiusLarge: '4px',
      density: 'tight',
      texture: 'gradient',
    },
    motion: 'lively',
    depth: 'flat',
    paletteBrief: 'Near-black with one electric accent. Maximum contrast, no pastels.',
  },
  {
    id: 'lyceum',
    name: 'Lyceum',
    note: 'Serious and results-first. Figures up front, courses as an index, nothing decorative.',
    verticals: ['coaching'],
    layouts: {
      hero: 'split',
      about: 'split',
      features: 'numbered',
      services: 'index',
      steps: 'timeline',
      testimonials: 'cards',
      stats: 'band',
      pricing: 'table',
      faq: 'split',
      cta: 'panel',
    },
    shape: {
      fonts: {
        display: '"Lora", Georgia, serif',
        body: '"IBM Plex Sans", system-ui, sans-serif',
        googleHref: GOOGLE('family=Lora:wght@400..700&family=IBM+Plex+Sans:wght@300..600'),
      },
      radius: '8px',
      radiusLarge: '14px',
      density: 'regular',
      texture: 'flat',
    },
    motion: 'subtle',
    depth: 'raised',
    paletteBrief: 'Trustworthy and institutional — deep blue or maroon, cream paper, gold or amber accent.',
  },
  {
    id: 'estate',
    name: 'Estate',
    note: 'Print-catalogue calm. Large photography, a measured index, restrained chrome.',
    verticals: ['real-estate', 'travel'],
    layouts: {
      hero: 'editorial',
      about: 'offset',
      features: 'bento',
      services: 'index',
      gallery: 'stack',
      testimonials: 'feature',
      stats: 'inline',
      steps: 'timeline',
      cta: 'panel',
    },
    shape: {
      fonts: {
        display: '"Cormorant Garamond", Georgia, serif',
        body: '"Jost", system-ui, sans-serif',
        googleHref: GOOGLE('family=Cormorant+Garamond:wght@300..700&family=Jost:wght@300..600'),
      },
      radius: '0px',
      radiusLarge: '0px',
      density: 'airy',
      texture: 'flat',
    },
    motion: 'subtle',
    depth: 'flat',
    paletteBrief: 'Stone, sand and ink. Expensive and quiet. The accent barely raises its voice.',
  },
  {
    id: 'circuit',
    name: 'Circuit',
    note: 'Technical and dimensional. Glassy panels, a gradient mesh, depth on hover.',
    verticals: ['agency', 'general'],
    layouts: {
      hero: 'showcase',
      about: 'split',
      features: 'bento',
      services: 'cards',
      steps: 'numbered',
      gallery: 'rail',
      testimonials: 'ticker',
      stats: 'cards',
      pricing: 'cards',
      cta: 'full',
    },
    shape: {
      fonts: {
        display: '"Space Grotesk", system-ui, sans-serif',
        body: '"Inter", system-ui, sans-serif',
        googleHref: GOOGLE('family=Space+Grotesk:wght@400..700&family=Inter:wght@300..600'),
      },
      radius: '14px',
      radiusLarge: '24px',
      density: 'regular',
      texture: 'rings',
    },
    motion: 'lively',
    depth: 'dimensional',
    paletteBrief: 'Deep near-black, a luminous accent, and surfaces a shade lighter than the background.',
  },
  {
    id: 'harvest',
    name: 'Harvest',
    note: 'Earthy and hand-made. Soft corners, natural colour, photography of real things.',
    verticals: ['agriculture', 'retail', 'restaurant'],
    layouts: {
      hero: 'split',
      about: 'offset',
      features: 'cards',
      services: 'rows',
      gallery: 'mosaic',
      testimonials: 'cards',
      stats: 'inline',
      steps: 'timeline',
      cta: 'panel',
    },
    shape: {
      fonts: {
        display: '"Bitter", Georgia, serif',
        body: '"Nunito Sans", system-ui, sans-serif',
        googleHref: GOOGLE('family=Bitter:wght@400..700&family=Nunito+Sans:wght@300..600'),
      },
      radius: '18px',
      radiusLarge: '30px',
      density: 'regular',
      texture: 'grain',
    },
    motion: 'subtle',
    depth: 'raised',
    paletteBrief: 'Cream, clay, olive and terracotta. Warm and grown rather than manufactured.',
  },
  {
    id: 'lumen',
    name: 'Lumen',
    note: 'The house style. Balanced, modern and safe for any trade.',
    verticals: [],
    layouts: {
      hero: 'split',
      about: 'split',
      features: 'cards',
      services: 'rows',
      steps: 'cards',
      gallery: 'grid',
      testimonials: 'cards',
      stats: 'band',
      pricing: 'cards',
      cta: 'band',
    },
    shape: {
      fonts: {
        display: '"Outfit", system-ui, sans-serif',
        body: '"Inter", system-ui, sans-serif',
        googleHref: GOOGLE('family=Outfit:wght@300..700&family=Inter:wght@300..600'),
      },
      radius: '10px',
      radiusLarge: '20px',
      density: 'regular',
      texture: 'gradient',
    },
    motion: 'subtle',
    depth: 'raised',
    paletteBrief: 'Whatever suits the business. Commit to a point of view rather than defaulting to grey.',
  },
];

export const DEFAULT_TEMPLATE = TEMPLATES[TEMPLATES.length - 1];

export function templateById(id: string | null | undefined): Template {
  return TEMPLATES.find((template) => template.id === id) ?? DEFAULT_TEMPLATE;
}

/** The templates that suit a vertical, best first, always ending in the house style. */
export function templatesFor(verticalSlug: string): Template[] {
  const matched = TEMPLATES.filter((template) => template.verticals.includes(verticalSlug));
  const rest = TEMPLATES.filter((template) => !matched.includes(template));
  return [...matched, ...rest];
}

/**
 * The template a build uses, given the vertical and what the owner asked for.
 *
 * The vertical narrows it; words in the brief choose between the candidates.
 * Deterministic on purpose — the same brief should not produce a different
 * look each time somebody presses the button, because "build it again" is how
 * people recover from a failure, not how they shop for a design.
 */
export function chooseTemplate(verticalSlug: string, brief: string): Template {
  const candidates = templatesFor(verticalSlug);
  const words = ` ${brief.toLowerCase()} `;

  const asked: [RegExp, string][] = [
    [/\b(luxur\w*|premium|high[- ]end|elegant|boutique|expensive)\b/, 'estate'],
    [/\b(editorial|magazine|minimal\w*|understated|gallery)\b/, 'atelier'],
    [/\b(bold|loud|energetic|powerful|strong|intense)\b/, 'forge'],
    [/\b(tech\w*|startup|saas|software|app|ai|digital|3d|futuristic)\b/, 'circuit'],
    [/\b(organic|natural|handmade|artisan\w*|farm|fresh|eco)\b/, 'harvest'],
    [/\b(calm|gentle|caring|friendly|welcoming|family)\b/, 'clinic'],
  ];

  for (const [pattern, id] of asked) {
    if (!pattern.test(words)) continue;
    const wanted = candidates.find((template) => template.id === id);
    if (wanted) return wanted;
  }

  return candidates[0] ?? DEFAULT_TEMPLATE;
}

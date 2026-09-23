/**
 * The scripted session behind the product demo on the home page.
 *
 * It is a demo and it says so on the page — nothing here calls a model. But
 * every step is a pure function from one site to the next, which means the
 * thing a visitor watches is a real state machine rather than a video: the
 * preview is rendered from `DemoSite`, so if a step claims to change the
 * palette then the palette changes, and a test can say so.
 *
 * The temptation with a section like this is a looping screen recording. That
 * ages the moment the product moves and nobody notices. This cannot: it is
 * built from the same kind of data the generator works in.
 */

export interface DemoPalette {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
}

export type DemoSectionKind = 'hero' | 'menu' | 'gallery' | 'pricing' | 'contact';

export interface DemoSection {
  id: string;
  label: string;
  kind: DemoSectionKind;
}

export interface DemoSite {
  name: string;
  headline: string;
  tagline: string;
  cta: string;
  palette: DemoPalette;
  display: string;
  /** How much air the layout has. The "more premium" step moves this. */
  density: 'tight' | 'airy';
  /** Headline size in the preview, in px at the preview's own scale. */
  headlineSize: number;
  sections: DemoSection[];
  published: boolean;
}

const CANDLELIT: DemoPalette = {
  bg: '#141110',
  surface: '#1e1917',
  ink: '#f4efe8',
  muted: '#a2968a',
  accent: '#d9a05b',
  accentInk: '#221a12',
};

export const NEON: DemoPalette = {
  bg: '#080808',
  surface: '#111210',
  ink: '#f2f5ea',
  muted: '#8b8f83',
  accent: '#c9f227',
  accentInk: '#0b0d06',
};

export const INITIAL_SITE: DemoSite = {
  name: 'Bistro Lunaire',
  headline: 'Dinner by candlelight',
  tagline: 'A twelve-table room in Bandra. A short seasonal menu, six nights a week.',
  cta: 'Book a table',
  palette: CANDLELIT,
  display: '"Fraunces", Georgia, serif',
  density: 'tight',
  headlineSize: 34,
  sections: [
    { id: 'hero', label: 'Hero', kind: 'hero' },
    { id: 'menu', label: 'Menu', kind: 'menu' },
    { id: 'room', label: 'The room', kind: 'gallery' },
    { id: 'find', label: 'Find us', kind: 'contact' },
  ],
  published: false,
};

export interface DemoStep {
  id: string;
  /** What the visitor sees themselves typing. */
  prompt: string;
  /** What Lumen answers. Written the way the real assistant answers: what it did. */
  reply: string;
  /** Which rail entries to light up while this step lands. */
  touches: string[];
  apply: (site: DemoSite) => DemoSite;
}

export const SCRIPT: DemoStep[] = [
  {
    id: 'premium',
    prompt: 'Make the hero section more premium.',
    reply: "Done — larger display type, more air around it, and the tagline pulled back so the headline carries the section on its own.",
    touches: ['hero'],
    apply: (site) => ({
      ...site,
      density: 'airy',
      headlineSize: 46,
      headline: 'Dinner by candlelight',
      tagline: 'Twelve tables in Bandra. A short seasonal menu, six nights a week.',
    }),
  },
  {
    id: 'palette',
    prompt: 'Change the colours to black and neon green.',
    reply: 'Swapped the palette and rechecked the contrast — the body text is still readable against the new background.',
    touches: ['hero', 'menu', 'room', 'find'],
    apply: (site) => ({ ...site, palette: NEON }),
  },
  {
    id: 'pricing',
    prompt: 'Add a set-menu pricing section.',
    reply: 'Added it below the menu, with three tiers and the same type scale as the rest of the page.',
    touches: ['pricing'],
    apply: (site) => ({
      ...site,
      sections: insertAfter(site.sections, 'menu', {
        id: 'pricing',
        label: 'Set menus',
        kind: 'pricing',
      }),
    }),
  },
  {
    id: 'copy',
    prompt: 'Rewrite the headline for a younger crowd.',
    reply: 'Rewritten — shorter, and it leads with the thing people actually come for.',
    touches: ['hero'],
    apply: (site) => ({
      ...site,
      headline: 'Late plates, small room',
      tagline: 'Twelve tables in Bandra. Kitchen open until midnight, six nights a week.',
      cta: 'Get a table',
    }),
  },
];

/** Idempotent, so replaying a step cannot add the same section twice. */
function insertAfter(sections: DemoSection[], afterId: string, section: DemoSection): DemoSection[] {
  if (sections.some((entry) => entry.id === section.id)) return sections;
  const at = sections.findIndex((entry) => entry.id === afterId);
  const index = at === -1 ? sections.length : at + 1;
  return [...sections.slice(0, index), section, ...sections.slice(index)];
}

/** The site as it stands after the first `count` steps of the script. */
export function siteAfter(count: number): DemoSite {
  return SCRIPT.slice(0, count).reduce((site, step) => step.apply(site), INITIAL_SITE);
}

/** The palettes a visitor can try from the theme control. */
export const DEMO_PALETTES: Array<{ id: string; label: string; palette: DemoPalette }> = [
  { id: 'candlelit', label: 'Candlelit', palette: CANDLELIT },
  { id: 'neon', label: 'Neon', palette: NEON },
  {
    id: 'paper',
    label: 'Paper',
    palette: {
      bg: '#f6f4ee',
      surface: '#ffffff',
      ink: '#181713',
      muted: '#6f6a5f',
      accent: '#1f4d3d',
      accentInk: '#f6f4ee',
    },
  },
  {
    id: 'cobalt',
    label: 'Cobalt',
    palette: {
      bg: '#0b1020',
      surface: '#141b31',
      ink: '#eef1fb',
      muted: '#8e97b5',
      accent: '#5b8cff',
      accentInk: '#060a16',
    },
  },
];

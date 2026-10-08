/**
 * Lumen 3D Studio, as data.
 *
 * The screen is long — five things you can build, eight categories, six worked
 * examples, eleven editor panels, thirteen controls, six animation tracks,
 * eight showcase projects — and a page that holds all of that inline is a page
 * nobody can check. Here it can be: that every kind has its own miniature in
 * its own colour, that each one names a blueprint that exists, that the copy
 * and the catalogue cannot drift apart.
 *
 * Two things this file is careful about.
 *
 * It builds. Studio was a showcase for an unbuilt feature; it is now the front
 * of a real path — every `StudioKind` names a blueprint in the library, and
 * pressing Build goes through the same pipeline as every other site Lumen makes.
 * So nothing here may say "coming soon" any more, and a test holds it to that.
 *
 * And it is not green. Every scene, every card and every palette carries its
 * own two colours. Lumen's own accent is one option among several rather than
 * the colour of everything three-dimensional, because a product whose every
 * illustration is the same lime is a product that looks like one screenshot.
 */

export const STUDIO_NAME = 'Lumen 3D Studio';
export const STUDIO_TAGLINE =
  'Build websites that don’t just look good. They interact, move, and feel alive.';
export const STUDIO_BLURB =
  'Create immersive 3D websites, interactive product experiences, animated landing pages, 3D mockups and game-inspired web experiences — without starting from scratch.';

/** Said wherever somebody needs to know which plan this is on. */
export const STUDIO_STATUS = 'Premium';

/** The three things the hero preview invites somebody to try. */
export const STUDIO_HINTS = ['Drag to explore', 'Scroll to interact', 'Click to animate'] as const;

/**
 * What a scene is made of, as a miniature.
 *
 * Each category draws a different arrangement of the same primitives — a few
 * planes, a solid, a horizon — so eight cards read as eight kinds of work
 * rather than eight copies of one illustration.
 */
export type SceneShape =
  | 'stack'
  | 'product'
  | 'device'
  | 'ribbon'
  | 'grid'
  | 'room'
  | 'terrain'
  | 'orbit';

export interface StudioCategory {
  id: string;
  label: string;
  blurb: string;
  shape: SceneShape;
  /** Its own two colours. Eight cards in one accent read as one card. */
  tint: [string, string];
}

export const STUDIO_CATEGORIES: StudioCategory[] = [
  {
    id: 'websites',
    label: '3D Websites',
    blurb: 'A whole site built in space — sections that move as you scroll through them.',
    shape: 'stack',
    tint: ['#8fd0ff', '#2b5f93'],
  },
  {
    id: 'product-pages',
    label: '3D Product Pages',
    blurb: 'One object, lit properly, that a customer can turn over in their hands.',
    shape: 'product',
    tint: ['#ffd9a0', '#8f6228'],
  },
  {
    id: 'mockups',
    label: '3D Mockups',
    blurb: 'Your work on a device, at an angle, in a room — rendered rather than photographed.',
    shape: 'device',
    tint: ['#b9f2e2', '#2c7566'],
  },
  {
    id: 'landing',
    label: 'Interactive Landing Pages',
    blurb: 'A page that answers the cursor: parallax, reveals, motion that follows the reader.',
    shape: 'ribbon',
    tint: ['#d8c0ff', '#53389c'],
  },
  {
    id: 'portfolios',
    label: '3D Portfolios',
    blurb: 'A body of work laid out in depth, walked through rather than scrolled past.',
    shape: 'grid',
    tint: ['#ffb3c7', '#8d3a55'],
  },
  {
    id: 'showrooms',
    label: 'Virtual Showrooms',
    blurb: 'A floor somebody can move around, with the stock standing on it.',
    shape: 'room',
    tint: ['#e6e2d4', '#6b6554'],
  },
  {
    id: 'games',
    label: 'Game Websites',
    blurb: 'Environment, characters, particles — a landing page with a world behind it.',
    shape: 'terrain',
    tint: ['#ff9f7a', '#9c3f22'],
  },
  {
    id: 'experiences',
    label: 'Interactive Experiences',
    blurb: 'Anything with a camera path: a story told by moving through it.',
    shape: 'orbit',
    tint: ['#d7ff3e', '#63801b'],
  },
];

export interface StudioExample {
  id: string;
  label: string;
  title: string;
  blurb: string;
  shape: SceneShape;
  /** Two accent stops the miniature is drawn with, so six cards look like six. */
  tint: [string, string];
}

export const STUDIO_EXAMPLES: StudioExample[] = [
  {
    id: 'fashion',
    label: 'Luxury Fashion',
    title: 'Pieces that float',
    blurb:
      'An immersive fashion site with floating products, cinematic transitions between looks, and garments you can turn in 3D.',
    shape: 'orbit',
    tint: ['#e8d5c4', '#8c6a52'],
  },
  {
    id: 'automotive',
    label: 'Automotive',
    title: 'Walk around it first',
    blurb:
      'Rotate the car, change its colour, open the features, and move through a cinematic landing page that follows the scroll.',
    shape: 'product',
    tint: ['#9fd6ff', '#2f6ea8'],
  },
  {
    id: 'architecture',
    label: 'Architecture',
    title: 'Floor by floor',
    blurb:
      'A building you can move the camera through — explore a floor, strip back a wall, see the light at different hours.',
    shape: 'room',
    tint: ['#d9e2d2', '#5c7256'],
  },
  {
    id: 'gaming',
    label: 'Gaming',
    title: 'The world before the download',
    blurb:
      'A game-style landing page with an animated environment, characters, particles, and sections that play as you reach them.',
    shape: 'terrain',
    tint: ['#c9a6ff', '#5b3fa8'],
  },
  {
    id: 'tech',
    label: 'Tech Product',
    title: 'Taken apart in mid-air',
    blurb:
      'A rotating device, an exploded view of what is inside it, hotspots on every component, and transitions that cut like film.',
    shape: 'device',
    tint: ['#d7ff3e', '#6f8a1e'],
  },
  {
    id: 'property',
    label: 'Real Estate',
    title: 'The viewing, before the viewing',
    blurb:
      'An interactive property: the building in 3D, a floor you can explore, and a walkthrough that runs on a phone.',
    shape: 'grid',
    tint: ['#ffd5a8', '#a8713a'],
  },
];

/** The prompt shown in the box, as the example of what a good one looks like. */
export const STUDIO_PROMPT_EXAMPLE =
  'Create a futuristic 3D website for a premium sneaker brand. Show a floating sneaker in the centre, let people rotate it, change its colours, and reveal the product details as they scroll.';

export const STUDIO_QUICK_PROMPTS = [
  '3D product',
  'Interactive portfolio',
  'Game landing page',
  'Virtual showroom',
  'Cinematic hero',
  '3D product mockup',
] as const;

/** The panels down the side of the editor. */
export const STUDIO_EDITOR_PANELS = [
  'Scene',
  'Models',
  'Camera',
  'Lighting',
  'Materials',
  'Animation',
  'Interactions',
  'Environment',
  'Effects',
  'Responsive',
  'Code',
] as const;

export interface StudioControl {
  label: string;
  /** Which group it belongs to, so the row reads as three jobs not thirteen. */
  group: 'View' | 'Scene' | 'Interaction';
}

export const STUDIO_CONTROLS: StudioControl[] = [
  { label: 'Rotate', group: 'View' },
  { label: 'Zoom', group: 'View' },
  { label: 'Pan', group: 'View' },
  { label: 'Camera', group: 'View' },
  { label: 'Lighting', group: 'Scene' },
  { label: 'Shadows', group: 'Scene' },
  { label: 'Environment', group: 'Scene' },
  { label: 'Materials', group: 'Scene' },
  { label: 'Animation', group: 'Scene' },
  { label: 'Motion', group: 'Scene' },
  { label: 'Scroll effects', group: 'Interaction' },
  { label: 'Hover effects', group: 'Interaction' },
  { label: 'Click interactions', group: 'Interaction' },
];

export interface TimelineTrack {
  label: string;
  /** Clips as [start, end] in seconds, on a five second timeline. */
  clips: [number, number][];
}

export const STUDIO_TIMELINE: TimelineTrack[] = [
  { label: 'Camera', clips: [[0, 2.4], [3.1, 4.6]] },
  { label: 'Object', clips: [[0.4, 3.2]] },
  { label: 'Text', clips: [[1.2, 2.1], [2.8, 4]] },
  { label: 'Particles', clips: [[0, 4.8]] },
  { label: 'Lighting', clips: [[0.8, 2.6]] },
  { label: 'Scroll', clips: [[2, 5]] },
];

export const STUDIO_TIMELINE_SECONDS = 5;

export interface StudioStep {
  number: string;
  title: string;
  blurb: string;
}

export const STUDIO_STEPS: StudioStep[] = [
  { number: '01', title: 'Describe', blurb: 'Tell Lumen what you want.' },
  {
    number: '02',
    title: 'Generate',
    blurb: 'Lumen builds the structure, the visuals, the interactions and the 3D scene.',
  },
  {
    number: '03',
    title: 'Customise',
    blurb: 'Edit the scenes, models, animation, lighting and interactions.',
  },
  {
    number: '04',
    title: 'Publish',
    blurb: 'Deploy it as a responsive, production-ready website.',
  },
];

export const SHOWCASE_TITLE = 'Websites beyond the screen';
export const SHOWCASE_BLURB = 'Turn your website into an experience.';

export interface ShowcaseProject {
  id: string;
  category: string;
  title: string;
  blurb: string;
  shape: SceneShape;
  tint: [string, string];
  /** How many columns it takes on a wide screen, so the grid has a rhythm. */
  wide?: boolean;
}

export const STUDIO_SHOWCASE: ShowcaseProject[] = [
  {
    id: 'commerce',
    category: '3D Commerce',
    title: 'A shop you can walk through',
    blurb: 'Stock standing on a floor, picked up and turned over before it is bought.',
    shape: 'room',
    tint: ['#d7ff3e', '#55691a'],
    wide: true,
  },
  {
    id: 'art',
    category: 'Digital Art',
    title: 'A gallery with walls',
    blurb: 'Work hung in space, lit, and approached rather than scrolled past.',
    shape: 'grid',
    tint: ['#e0c3ff', '#5c3f8c'],
  },
  {
    id: 'automotive',
    category: 'Automotive',
    title: 'Configured in the browser',
    blurb: 'Paint, wheels, trim — changed live, under real reflections.',
    shape: 'product',
    tint: ['#a8d8ff', '#2d5f8f'],
  },
  {
    id: 'gaming',
    category: 'Gaming',
    title: 'A trailer you can steer',
    blurb: 'An environment that plays around the copy instead of behind it.',
    shape: 'terrain',
    tint: ['#ffb0c8', '#8c3a56'],
  },
  {
    id: 'architecture',
    category: 'Architecture',
    title: 'The model, not the render',
    blurb: 'A building explored floor by floor, at any hour of the day.',
    shape: 'stack',
    tint: ['#cfe3cf', '#4d6b4d'],
    wide: true,
  },
  {
    id: 'luxury',
    category: 'Luxury',
    title: 'Slow, and lit like a film',
    blurb: 'One object, one light, and a camera that takes its time.',
    shape: 'orbit',
    tint: ['#f0dcc0', '#8a6a3f'],
  },
  {
    id: 'technology',
    category: 'Technology',
    title: 'Inside the thing',
    blurb: 'An exploded view with a hotspot on every part that matters.',
    shape: 'device',
    tint: ['#b8f0e0', '#2f7a66'],
  },
  {
    id: 'entertainment',
    category: 'Entertainment',
    title: 'A stage, not a page',
    blurb: 'Motion, depth and sound cues, on something that still loads on a phone.',
    shape: 'ribbon',
    tint: ['#ffc98a', '#9c5a1e'],
  },
];

// --------------------------------------------------------- what it builds --

/**
 * The five things Studio can actually make.
 *
 * Each `id` is a blueprint id in the template library. That is the whole
 * mechanism: choosing "3D portfolio" here sends `blueprint: 'parallax'` to the
 * same endpoint the rest of the product uses, and the site that comes back is
 * built by the same pipeline as a dental clinic's — with a `scene3d` section in
 * it, because the blueprint's pages say so.
 *
 * Which means there is nothing here that can claim to work and not work. If a
 * blueprint is deleted the test below fails, and if the pipeline breaks, every
 * site breaks with it rather than just this corner.
 */
export interface StudioKind {
  /** The blueprint this builds. Must exist in the template library. */
  id: string;
  label: string;
  blurb: string;
  /** What the owner gets, in the plainest words available. */
  makes: string;
  shape: SceneShape;
  tint: [string, string];
  /** Shown in the box when this kind is picked, as the example of a good brief. */
  example: string;
}

export const STUDIO_KINDS: StudioKind[] = [
  {
    id: 'parallax',
    label: '3D portfolio',
    blurb: 'Your work standing in space, turned rather than scrolled past.',
    makes: 'Four pages, with your work on a turntable on the first two.',
    shape: 'grid',
    tint: ['#8fb4ff', '#2b3f93'],
    example:
      'A 3D portfolio for a product photographer in Jaipur. Eight recent shoots on a turntable, a page about how I work, and a way to enquire about a shoot.',
  },
  {
    id: 'orbit',
    label: '3D product page',
    blurb: 'One object, lit properly, that a customer can turn over before buying.',
    makes: 'A product site with the thing itself in 3D, its details, and the price.',
    shape: 'product',
    tint: ['#ffd9a0', '#8f6228'],
    example:
      'A 3D product page for a handmade leather bag, ₹4,800. Show it from every angle, point out the stitching, the brass clasp and the lining, and let people buy it.',
  },
  {
    id: 'arcade',
    label: '3D game landing page',
    blurb: 'A landing page with a world behind it — environment, characters, a release date.',
    makes: 'A launch page with the world in 3D, the trailer, and a wait list.',
    shape: 'terrain',
    tint: ['#d8a0ff', '#5a2d99'],
    example:
      'A landing page for an indie mobile game set in a desert. Show the world in 3D, the three characters, what makes it different, and collect sign-ups for the beta.',
  },
  {
    id: 'pavilion',
    label: 'Virtual showroom',
    blurb: 'A floor somebody can move around, with your stock standing on it.',
    makes: 'A showroom site with the floor in 3D, the collection, and your address.',
    shape: 'room',
    tint: ['#e6ded0', '#7a6a52'],
    example:
      'A virtual showroom for a furniture shop in Pune. Three pieces standing on the floor, the full collection, our opening hours and how to book a viewing.',
  },
  {
    id: 'vitrine3d',
    label: '3D e-commerce',
    blurb: 'A real shop — catalogue, basket and checkout — with the stock turning above it.',
    makes: 'A storefront that takes orders, with your products in 3D on the way in.',
    shape: 'room',
    tint: ['#e8c98a', '#8a6a2f'],
    example:
      'A 3D online store for a jewellery brand in Jaipur. Twelve pieces people can turn and look at closely, a basket, and delivery across India.',
  },
  {
    id: 'prism',
    label: '3D product demo',
    blurb: 'The product on a screen, at an angle, taken apart in mid-air.',
    makes: 'A product site with the app in 3D, what it does, and the pricing.',
    shape: 'device',
    tint: ['#8ae3ff', '#1f6a85'],
    example:
      'A site for a billing app for small shops. Show the app on a phone in 3D, point out the GST invoice, the stock count and the WhatsApp receipts, and book demos.',
  },
];

export const studioKindById = (id: string | null | undefined): StudioKind | undefined =>
  STUDIO_KINDS.find((kind) => kind.id === id);

/**
 * The colour the site comes out.
 *
 * Here because of a complaint, and it is a fair one: everything Lumen drew in
 * 3D was the same electric lime, so five different businesses previewed as five
 * copies of Lumen. The palette is a real instruction to the generator — it goes
 * into the brief, the model writes the tokens from it, and the 3D section draws
 * itself from those tokens. Pick violet and the scene is violet, including the
 * floor, the light and the glow under it.
 */
export interface StudioPalette {
  id: string;
  label: string;
  /** The sentence handed to the generator. */
  brief: string;
  /** Near and far, for the swatch and the preview scene. */
  tint: [string, string];
}

export const STUDIO_PALETTES: StudioPalette[] = [
  {
    id: 'midnight',
    label: 'Midnight blue',
    brief: 'Deep indigo and near-black, with a cold electric blue accent. No green anywhere.',
    tint: ['#8fb4ff', '#1e2f6b'],
  },
  {
    id: 'gold',
    label: 'Champagne gold',
    brief: 'Warm champagne and bone on charcoal, with a brushed-gold accent. Expensive and quiet.',
    tint: ['#f0d9a8', '#8a6a2f'],
  },
  {
    id: 'violet',
    label: 'Hot violet',
    brief: 'Near-black with a hot violet accent and a magenta edge light. Loud and saturated.',
    tint: ['#d8a0ff', '#5a2d99'],
  },
  {
    id: 'gallery',
    label: 'Gallery white',
    brief: 'Gallery white and pale concrete with one deep oxblood accent. Light, airy, almost no colour.',
    tint: ['#efece4', '#8c4a44'],
  },
  {
    id: 'cyan',
    label: 'Cool cyan',
    brief: 'Slate and graphite with a cool cyan accent and a thin coral highlight. Technical, not neon.',
    tint: ['#8ae3ff', '#1f6a85'],
  },
  {
    id: 'terracotta',
    label: 'Clay and terracotta',
    brief: 'Cream, clay and terracotta, warm and hand-made rather than manufactured.',
    tint: ['#f0b48c', '#9c5230'],
  },
  {
    id: 'forest',
    label: 'Deep forest',
    brief: 'Deep forest green and moss on warm off-white, with a brass accent.',
    tint: ['#a8d6a0', '#2e5c38'],
  },
  {
    id: 'lumen',
    label: 'Electric lime',
    brief: 'Near-black with a bright electric lime accent. High contrast and modern.',
    tint: ['#d7ff3e', '#63801b'],
  },
];

export const studioPaletteById = (id: string | null | undefined): StudioPalette | undefined =>
  STUDIO_PALETTES.find((palette) => palette.id === id);

/**
 * The brief that is actually sent.
 *
 * The chosen kind and palette are folded into the owner's own words rather
 * than sent as separate fields, because every downstream stage — the planner,
 * the section writers, the palette — reads the brief and nothing else. The
 * owner's sentence goes first: it is the part that is about their business, and
 * what comes first is what the model weights.
 */
export function studioBrief(params: {
  kind: StudioKind;
  palette?: StudioPalette | null;
  brief: string;
}): string {
  const lines = [
    params.brief.trim(),
    '',
    `This is a 3D website — a ${params.kind.label.toLowerCase()}, built in Lumen 3D Studio. It has an interactive 3D scene on its main pages that a visitor can turn, move through and tap to look closer at.`,
  ];
  if (params.palette) lines.push(`Colours: ${params.palette.brief}`);
  return lines.join('\n');
}

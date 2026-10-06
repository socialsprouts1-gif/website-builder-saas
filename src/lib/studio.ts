/**
 * Lumen 3D Studio, as data.
 *
 * The showcase is long — eight categories, six worked examples, eleven editor
 * panels, thirteen controls, six animation tracks, eight showcase projects —
 * and a page that holds all of that inline is a page nobody can check. Here it
 * can be: that every category has a distinct miniature, that nothing claims to
 * ship before it does, that the copy and the roadmap cannot drift apart.
 *
 * One thing this file is careful about. 3D Studio is not built. It is on the
 * Premium plan as a promise, marked `soon` in the plan catalogue, and every
 * surface that describes it has to read as a preview of what is coming rather
 * than as a button somebody can press today. The words here are written that
 * way, and a test holds them to it.
 */

export const STUDIO_NAME = 'Lumen 3D Studio';
export const STUDIO_TAGLINE =
  'Build websites that don’t just look good. They interact, move, and feel alive.';
export const STUDIO_BLURB =
  'Create immersive 3D websites, interactive product experiences, animated landing pages, 3D mockups and game-inspired web experiences — without starting from scratch.';

/** Said wherever somebody could mistake the showcase for a working tool. */
export const STUDIO_STATUS = 'In development · Premium';

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
}

export const STUDIO_CATEGORIES: StudioCategory[] = [
  {
    id: 'websites',
    label: '3D Websites',
    blurb: 'A whole site built in space — sections that move as you scroll through them.',
    shape: 'stack',
  },
  {
    id: 'product-pages',
    label: '3D Product Pages',
    blurb: 'One object, lit properly, that a customer can turn over in their hands.',
    shape: 'product',
  },
  {
    id: 'mockups',
    label: '3D Mockups',
    blurb: 'Your work on a device, at an angle, in a room — rendered rather than photographed.',
    shape: 'device',
  },
  {
    id: 'landing',
    label: 'Interactive Landing Pages',
    blurb: 'A page that answers the cursor: parallax, reveals, motion that follows the reader.',
    shape: 'ribbon',
  },
  {
    id: 'portfolios',
    label: '3D Portfolios',
    blurb: 'A body of work laid out in depth, walked through rather than scrolled past.',
    shape: 'grid',
  },
  {
    id: 'showrooms',
    label: 'Virtual Showrooms',
    blurb: 'A floor somebody can move around, with the stock standing on it.',
    shape: 'room',
  },
  {
    id: 'games',
    label: 'Game Websites',
    blurb: 'Environment, characters, particles — a landing page with a world behind it.',
    shape: 'terrain',
  },
  {
    id: 'experiences',
    label: 'Interactive Experiences',
    blurb: 'Anything with a camera path: a story told by moving through it.',
    shape: 'orbit',
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

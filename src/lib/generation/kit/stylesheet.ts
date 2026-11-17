import type { DesignTokens } from './tokens';
import { premiumCss } from './premium';
import { scene3dCss } from './scene3d';
import { turntableCss } from './turntable';
import { dimensionalCss } from './dimensional';
import { DEFAULT_TEMPLATE, type Template } from './templates';

/**
 * The component library, as one stylesheet.
 *
 * Every generated site gets this exact CSS, differing only in the token values
 * at the top. That is the whole point: the model used to write a bespoke
 * stylesheet per site, which was the slowest call in the build and the reason
 * two sites were never built the same way twice. Here the primitives are fixed
 * and maintainable — fix a responsive bug once and every site gets the fix.
 */

const DENSITY = {
  tight: { section: '3.5rem', gap: '1.25rem' },
  regular: { section: '5.5rem', gap: '1.75rem' },
  airy: { section: '7.5rem', gap: '2.25rem' },
} as const;

/**
 * `dimensional` adds the whole-site 3D treatment: reveals on every band,
 * parallax between them, grain, kinetic type, depth on the cards. It is a
 * different design language rather than a better default — a plumber's site
 * put through a scrollytelling treatment is a worse plumber's site — so only a
 * site built from a 3D blueprint gets it.
 */
export function renderStylesheet(
  tokens: DesignTokens,
  template: Template = DEFAULT_TEMPLATE,
  dimensional = false,
): string {
  const { palette: p, fonts } = tokens;
  const density = DENSITY[tokens.density];

  return `/* Lumen component library. Tokens at the top; primitives below. */
:root {
  --bg: ${p.bg};
  --surface: ${p.surface};
  --surface-alt: ${p.surfaceAlt};
  --ink: ${p.ink};
  --ink-muted: ${p.inkMuted};
  --accent: ${p.accent};
  --accent-ink: ${p.accentInk};
  --border: ${p.border};

  --font-display: ${fonts.display};
  --font-body: ${fonts.body};

  --radius: ${tokens.radius};
  --radius-lg: ${tokens.radiusLarge};

  --section-y: ${density.section};
  --gap: ${density.gap};
  --shell: 1140px;

  --shadow-sm: 0 1px 2px rgba(0,0,0,.18);
  --shadow-md: 0 12px 32px -12px rgba(0,0,0,.45);
  --shadow-lg: 0 40px 80px -32px rgba(0,0,0,.6);
}

*, *::before, *::after { box-sizing: border-box; }

html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

img, svg, video { max-width: 100%; height: auto; display: block; }
a { color: inherit; }

h1, h2, h3, h4 {
  font-family: var(--font-display);
  line-height: 1.08;
  letter-spacing: -0.02em;
  margin: 0 0 .5em;
  font-weight: 600;
}
h1 { font-size: clamp(2.6rem, 6vw, 4.6rem); }
h2 { font-size: clamp(1.9rem, 3.6vw, 2.9rem); }
h3 { font-size: clamp(1.15rem, 1.7vw, 1.4rem); }
p  { margin: 0 0 1em; }
p:last-child { margin-bottom: 0; }

.muted { color: var(--ink-muted); }
.lead { font-size: clamp(1.05rem, 1.5vw, 1.25rem); color: var(--ink-muted); max-width: 62ch; }
.eyebrow {
  font-size: .75rem; letter-spacing: .18em; text-transform: uppercase;
  color: var(--accent); margin: 0 0 1rem; font-family: var(--font-body);
}

/* ---------------------------------------------------------------- layout -- */
.shell { width: 100%; max-width: var(--shell); margin-inline: auto; padding-inline: 1.25rem; }
.section { padding-block: var(--section-y); position: relative; }
.section--alt { background: var(--surface-alt); }
.section--surface { background: var(--surface); }
.section__head { max-width: 46rem; margin-bottom: calc(var(--gap) * 1.5); }
.section__head--center { margin-inline: auto; text-align: center; }

.stack > * + * { margin-top: var(--gap); }
.cluster { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; }
.split { display: grid; gap: calc(var(--gap) * 1.5); align-items: center; }
@media (min-width: 860px) { .split { grid-template-columns: 1fr 1fr; } }
.split--wide { grid-template-columns: 1fr; }
@media (min-width: 860px) { .split--wide { grid-template-columns: 1.15fr .85fr; } }

.grid { display: grid; gap: var(--gap); grid-template-columns: 1fr; }
@media (min-width: 640px) { .grid--2, .grid--3, .grid--4 { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 960px) { .grid--3 { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 960px) { .grid--4 { grid-template-columns: repeat(4, 1fr); } }

/* ------------------------------------------------------------ primitives -- */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.6rem;
  box-shadow: var(--shadow-sm);
}
.card__title { margin-bottom: .35rem; }
.card__meta { color: var(--accent); font-size: .95rem; }

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
  padding: .85rem 1.6rem;
  border-radius: 999px;
  border: 1px solid transparent;
  background: var(--accent);
  color: var(--accent-ink);
  font: inherit; font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: filter .15s ease, transform .15s ease;
}
.btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
.btn--ghost { background: transparent; color: var(--ink); border-color: var(--border); }
.btn--ghost:hover { background: color-mix(in srgb, var(--ink) 8%, transparent); }

.badge {
  display: inline-flex; align-items: center; gap: .4rem;
  padding: .3rem .75rem; border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--accent);
  font-size: .8rem;
}

.media {
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface-alt);
  aspect-ratio: 4 / 3;
}
.media img { width: 100%; height: 100%; object-fit: cover; }
.media--empty {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent) 9%, var(--surface-alt)), var(--surface-alt) 65%);
}
.media--tall { aspect-ratio: 3 / 4; }
.media--wide { aspect-ratio: 16 / 9; }

.stat__value { font-family: var(--font-display); font-size: clamp(2rem,4vw,3rem); color: var(--accent); line-height: 1; }
.stat__label { color: var(--ink-muted); font-size: .95rem; margin-top: .4rem; }

.quote { border-left: 2px solid var(--accent); padding-left: 1.25rem; }
.quote__text { font-size: 1.05rem; }
.quote__author { color: var(--ink-muted); font-size: .9rem; margin-top: .75rem; }
.stars { color: var(--accent); letter-spacing: .1em; }

.rows { border-top: 1px solid var(--border); }
.row {
  display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; justify-content: space-between;
  padding: 1.1rem 0; border-bottom: 1px solid var(--border);
}
.row__label { font-weight: 500; }
.row__value { color: var(--accent); white-space: nowrap; }

details.faq { border-bottom: 1px solid var(--border); padding: 1.1rem 0; }
details.faq summary { cursor: pointer; font-weight: 500; list-style: none; }
details.faq summary::-webkit-details-marker { display: none; }
details.faq summary::after { content: '+'; float: right; color: var(--accent); }
details.faq[open] summary::after { content: '–'; }
details.faq p { margin-top: .75rem; color: var(--ink-muted); }

.field { display: block; margin-bottom: 1rem; }
.field span { display: block; font-size: .85rem; color: var(--ink-muted); margin-bottom: .35rem; }
.field input, .field textarea, .field select {
  width: 100%; padding: .8rem 1rem;
  background: var(--bg); color: var(--ink);
  border: 1px solid var(--border); border-radius: var(--radius);
  font: inherit;
}
.field textarea { min-height: 7rem; resize: vertical; }
.field :is(input, textarea, select):focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

/* ------------------------------------------------------ nav and footer --- */
.nav {
  position: sticky; top: 0; z-index: 20;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}
.nav__inner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-block: .9rem; }
.nav__brand { font-family: var(--font-display); font-size: 1.2rem; text-decoration: none; }
.nav__links { display: none; gap: 1.6rem; align-items: center; }
.nav__links a { text-decoration: none; color: var(--ink-muted); font-size: .95rem; }
.nav__links a:hover, .nav__links a[aria-current='page'] { color: var(--ink); }
.nav__toggle { display: inline-flex; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--ink); padding: .5rem .7rem; cursor: pointer; }
@media (min-width: 780px) {
  .nav__links { display: flex; }
  .nav__toggle { display: none; }
}
.nav__links.is-open { display: flex; flex-direction: column; align-items: flex-start; padding-bottom: 1rem; }

.footer { border-top: 1px solid var(--border); padding-block: 3rem; color: var(--ink-muted); font-size: .92rem; }
.footer a { color: var(--ink-muted); }
.footer__grid { display: grid; gap: var(--gap); grid-template-columns: 1fr; }
@media (min-width: 720px) { .footer__grid { grid-template-columns: 1.3fr 1fr 1fr; } }

/* ------------------------------------------------------------ the hero --- */
.hero { position: relative; overflow: hidden; padding-block: clamp(4rem, 10vw, 8rem); }
.hero__inner { position: relative; z-index: 1; }
.hero p.lead { margin-top: 1.25rem; }
.hero .cluster { margin-top: 2rem; }
.hero--center { text-align: center; }
.hero--center .lead { margin-inline: auto; }
.hero--center .cluster { justify-content: center; }

/* ------------------------------------------------------- announcement bar - */
.announce {
  background: var(--accent); color: var(--accent-ink);
  font-size: .9rem; letter-spacing: .01em;
}
.announce__inner {
  display: flex; align-items: center; gap: .9rem;
  padding-block: .55rem; flex-wrap: wrap;
}
.announce--centred .announce__inner { justify-content: center; text-align: center; }
.announce p { margin: 0; }
.announce a { color: inherit; text-underline-offset: .2em; font-weight: 500; }

/* ------------------------------------------------------------ trust marks - */
.marks { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--gap); }
.marks--row { align-items: center; justify-content: space-between; }
.marks--band { justify-content: center; text-align: center; }
.marks--grid { display: grid; grid-template-columns: repeat(2, 1fr); }
@media (min-width: 52rem) { .marks--grid { grid-template-columns: repeat(4, 1fr); } }
.mark { display: flex; flex-direction: column; gap: .2rem; min-width: 8rem; }
.mark__name {
  font-family: var(--font-display); font-size: 1.05rem; line-height: 1.2;
}
.mark__meta { color: var(--ink-muted); font-size: .8rem; text-transform: uppercase; letter-spacing: .1em; }

/* ------------------------------------------------- claim and its specifics - */
.split__claim { min-width: 0; }
.split__claim .btn { margin-top: 1.5rem; }
.points { list-style: none; margin: 0; padding: 0; display: grid; gap: calc(var(--gap) * .85); }
.points > li { border-top: 1px solid var(--border); padding-top: .9rem; }
.points--columns { grid-template-columns: 1fr; }
@media (min-width: 46rem) { .points--columns { grid-template-columns: 1fr 1fr; } }

/* ------------------------------------------------------- before and after - */
.pairs { display: grid; gap: calc(var(--gap) * 1.2); grid-template-columns: 1fr; }
@media (min-width: 60rem) { .pairs--pairs { grid-template-columns: repeat(3, 1fr); } }
.pair { margin: 0; }
.pair__frames { display: grid; grid-template-columns: 1fr 1fr; gap: .4rem; }
.pair__frame { position: relative; }
.pair__frame .media { margin: 0; }
.pair__tag {
  position: absolute; left: .5rem; bottom: .5rem;
  background: color-mix(in srgb, var(--bg) 78%, transparent); color: var(--ink);
  font-size: .7rem; text-transform: uppercase; letter-spacing: .12em;
  padding: .2rem .5rem; border-radius: calc(var(--radius) / 2);
}
.pair__tag--after { background: var(--accent); color: var(--accent-ink); }
.pair figcaption { margin-top: .9rem; }

/* ------------------------------------------------------------------ video - */
.video { display: grid; gap: var(--gap); }
.video--split { align-items: center; }
@media (min-width: 56rem) { .video--split { grid-template-columns: 1fr 1.2fr; } }
.video--feature { grid-template-columns: 1fr; }
.video--band { justify-items: center; text-align: center; }
/* The one that plays by itself. It is muted and looping, so it reads as a
   moving picture rather than something to sit through: wider than it is tall
   and with no controls to invite a click. */
.video--showreel { justify-items: center; text-align: center; }
.video--showreel .video__frame, .video--showreel .video__frame video { aspect-ratio: 21 / 9; }
.video__frame { margin: 0; overflow: hidden; border-radius: var(--radius); background: var(--surface-alt); }
/* The frame keeps its proportions before the file has said what shape it is.
   Without this the band is one height while the video loads and another once
   it has, which on a slow connection is the page moving under a thumb. */
.video__frame, .video__frame video { aspect-ratio: 16 / 9; }
.video__frame video { width: 100%; height: 100%; object-fit: cover; display: block; }
.video__copy { display: grid; gap: .9rem; align-content: start; }

/* -------------------------------------------------------------- where we are - */
.where { display: grid; gap: var(--gap); }
@media (min-width: 52rem) { .where--split { grid-template-columns: 1.1fr 1fr; } }
.where--band { text-align: center; justify-items: center; }
.where__panel {
  display: grid; gap: 1rem; align-content: start; align-self: start;
  border: 1px solid var(--line); border-radius: var(--radius);
  padding: calc(var(--gap) * .8); background: var(--surface);
}
.where__address { margin: 0; font-size: 1.05rem; line-height: 1.6; }
.where__notes { display: grid; gap: .9rem; align-content: start; }
@media (min-width: 40rem) { .where--card .where__notes, .where--band .where__notes { grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); } }
.where__note { border-top: 1px solid var(--line); padding-top: .7rem; }

/* ------------------------------------------------------------------ story - */
.story { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--gap); counter-reset: none; }
@media (min-width: 60rem) { .story--rail { grid-auto-flow: column; grid-auto-columns: 1fr; } }
.story--stack { grid-template-columns: 1fr; }
.story__point { position: relative; padding-top: 1.4rem; border-top: 2px solid var(--line); }
.story__point::before {
  content: ""; position: absolute; top: -5px; left: 0;
  width: 8px; height: 8px; border-radius: 999px; background: var(--accent);
}
.story__when { display: block; font-size: .78rem; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); margin-bottom: .35rem; }

/* ----------------------------------------------------------------- offers - */
.offers { display: grid; gap: var(--gap); }
@media (min-width: 46rem) { .offers--cards { grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); } }
.offers--strip { justify-items: center; text-align: center; }
.offer {
  border: 1px dashed var(--accent); border-radius: var(--radius);
  padding: calc(var(--gap) * .7); background: var(--surface);
  display: grid; gap: .5rem; align-content: start;
}
.offer__title { margin: 0; font-size: 1.15rem; }
/* The part people photograph. Monospaced so a 0 is not an O at the till. */
.offer__code {
  margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .9rem; letter-spacing: .06em;
  color: var(--accent-ink); background: var(--accent);
  padding: .3rem .65rem; border-radius: calc(var(--radius) / 2); justify-self: start;
}
.offers--strip .offer__code { justify-self: center; }

/* --------------------------------------------- extra layouts on old kinds - */
.checks { list-style: none; margin: 0; padding: 0; display: grid; gap: .8rem; }
@media (min-width: 46rem) { .checks { grid-template-columns: 1fr 1fr; column-gap: var(--gap); } }
.checks > li { display: flex; gap: .7rem; align-items: flex-start; }
.checks .check__tick { color: var(--accent); line-height: 1.4; }
.feed { display: grid; grid-template-columns: repeat(3, 1fr); gap: .5rem; }
@media (min-width: 46rem) { .feed { grid-template-columns: repeat(6, 1fr); } }
.feed .media { aspect-ratio: 1 / 1; margin: 0; }
.where { display: grid; gap: var(--gap); }
@media (min-width: 52rem) { .where { grid-template-columns: 1fr 1fr; } }

${textureCss(tokens)}

/* --------------------------------------------------------- accessibility - */
.skip { position: absolute; left: -9999px; }
.skip:focus { left: 1rem; top: 1rem; z-index: 50; background: var(--accent); color: var(--accent-ink); padding: .6rem 1rem; border-radius: var(--radius); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
${premiumCss(template.motion, template.depth)}
${scene3dCss()}
${turntableCss()}
${dimensional ? dimensionalCss() : ''}
`;
}

/** The one decorative flourish, chosen by token rather than improvised. */
function textureCss(tokens: DesignTokens): string {
  if (tokens.texture === 'flat') return '';

  if (tokens.texture === 'grain') {
    return `.hero::before {
  content: ''; position: absolute; inset: 0; opacity: .5; pointer-events: none;
  background:
    radial-gradient(90rem 40rem at 50% -20%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%),
    repeating-linear-gradient(0deg, rgba(255,255,255,.025) 0 1px, transparent 1px 3px);
}`;
  }

  if (tokens.texture === 'rings') {
    return `.hero::before {
  content: ''; position: absolute; inset: -30% -10% auto; height: 120%; pointer-events: none; opacity: .5;
  background:
    radial-gradient(closest-side, transparent 62%, color-mix(in srgb, var(--accent) 22%, transparent) 63%, transparent 66%),
    radial-gradient(closest-side, transparent 76%, color-mix(in srgb, var(--accent) 14%, transparent) 77%, transparent 80%);
  background-repeat: no-repeat;
  background-position: 75% 10%, 70% 20%;
  background-size: 46rem 46rem, 66rem 66rem;
}`;
  }

  return `.hero::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(70rem 34rem at 18% -10%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 70%),
    radial-gradient(50rem 30rem at 92% 4%, color-mix(in srgb, var(--surface-alt) 92%, transparent), transparent 72%);
}`;
}

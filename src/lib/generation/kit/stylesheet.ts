import type { DesignTokens } from './tokens';

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

export function renderStylesheet(tokens: DesignTokens): string {
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

${textureCss(tokens)}

/* --------------------------------------------------------- accessibility - */
.skip { position: absolute; left: -9999px; }
.skip:focus { left: 1rem; top: 1rem; z-index: 50; background: var(--accent); color: var(--accent-ink); padding: .6rem 1rem; border-radius: var(--radius); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
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

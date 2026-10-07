/**
 * The 3D section: a real, interactive scene inside a generated website.
 *
 * Everything here is CSS 3D transforms and about four kilobytes of plain
 * JavaScript. Not a taste decision — a published site runs under
 * `script-src 'self'`, so a CDN copy of three.js is blocked outright, and a
 * self-hosted WebGL renderer would be half a megabyte that a ₹6,000 Android
 * phone has to download before it sees a word of the page. `transform-style:
 * preserve-3d` has been in every browser for a decade, is composited on the
 * GPU, and degrades to a flat, still, perfectly readable section when anything
 * about it is unsupported.
 *
 * The same inversion as the rest of the kit: the model never writes markup. It
 * writes what the objects *are* — the shoe, the floor it stands on, the three
 * things worth pointing at — and the geometry is fixed here, so a scene cannot
 * come back inside out.
 *
 * Colour comes from the site's own tokens. A 3D section on a jeweller's site is
 * gold on cream and on a gaming site is violet on near-black, because both read
 * `--accent` and neither has a colour of its own.
 */

import type { Section, SectionItem } from './sections';
import { escapeHtml, safeHref } from './html';

/**
 * The scene forms. Each is a different arrangement of the same primitives —
 * panels, a solid, a floor, a horizon — because five names for one illustration
 * would be the cardboard version of this feature.
 */
export const SCENE3D_FORMS = ['product', 'carousel', 'showroom', 'world', 'device'] as const;
export type Scene3dForm = (typeof SCENE3D_FORMS)[number];

export function scene3dForm(wanted: string | undefined): Scene3dForm {
  return (SCENE3D_FORMS as readonly string[]).includes(wanted ?? '')
    ? (wanted as Scene3dForm)
    : 'product';
}

/** How many panels each ring form draws, so the geometry below can be exact. */
const RING = 7;

/**
 * A six-faced solid.
 *
 * Every face is pushed out by exactly half the side length, which is the one
 * thing a hand-written cube gets wrong: get it wrong and the faces meet in a
 * star rather than a box. `--d` is that half, set once in the CSS.
 */
function solid(): string {
  const faces = [
    ['translateZ(var(--d))', 'a'],
    ['rotateY(180deg) translateZ(var(--d))', 'b'],
    ['rotateY(90deg) translateZ(var(--d))', 'c'],
    ['rotateY(-90deg) translateZ(var(--d))', 'd'],
    ['rotateX(90deg) translateZ(var(--d))', 'e'],
    ['rotateX(-90deg) translateZ(var(--d))', 'f'],
  ];
  return `<div class="s3d__solid">${faces
    .map(([transform, shade]) => `<span class="s3d__face s3d__face--${shade}" style="transform:${transform}"></span>`)
    .join('')}</div>`;
}

/** The ground. One plane, laid flat, with a grid ruled on it in the accent. */
const floor = `<div class="s3d__floor" aria-hidden></div>`;

/** Specks of light that drift. Decoration, and the first thing motion sickness turns off. */
function motes(count: number): string {
  let out = '';
  for (let index = 0; index < count; index += 1) {
    // Deterministic rather than random: the same site rebuilt twice should
    // produce byte-identical HTML, or every regeneration is a spurious diff.
    const x = (index * 37) % 100;
    const y = (index * 61) % 100;
    const z = ((index * 53) % 80) - 40;
    const delay = ((index * 7) % 40) / 10;
    out += `<span class="s3d__mote" style="left:${x}%;top:${y}%;--mz:${z}px;animation-delay:-${delay}s"></span>`;
  }
  return `<div class="s3d__motes" aria-hidden>${out}</div>`;
}

/**
 * Panels standing in a ring, facing outwards.
 *
 * Each is turned by its share of the circle and then pushed out along its own
 * new z-axis, which is what puts them on a circle rather than in a fan.
 */
function ring(entries: SectionItem[], sectionId: string): string {
  const panels = Array.from({ length: RING }, (_, index) => {
    const item = entries[index % Math.max(entries.length, 1)];
    const angle = (360 / RING) * index;
    const label = item?.title ? escapeHtml(item.title) : '';
    return `<figure class="s3d__panel" style="transform:rotateY(${angle}deg) translateZ(var(--r))">
      <span class="s3d__panel-face" aria-hidden></span>
      ${label ? `<figcaption class="s3d__panel-label">${label}</figcaption>` : ''}
    </figure>`;
  });
  return `<div class="s3d__ring" data-s3d-ring="${escapeHtml(sectionId)}">${panels.join('')}</div>`;
}

/**
 * Plinths on a floor, with stock standing on them.
 *
 * The plinth is a cube rather than a rectangle, for the same reason the solid
 * is: a single plane facing the camera stays a flat card however far the scene
 * is turned, so three of them read as three stickers over a grid rather than
 * as objects in a room. A cube is the cheapest shape that survives rotation,
 * and its faces close exactly because the side is the same in all three axes.
 */
function plinths(entries: SectionItem[]): string {
  const spots = [
    { x: -150, z: -40 },
    { x: 0, z: 60 },
    { x: 150, z: -40 },
  ];
  const sides = [
    'translateZ(var(--p))',
    'rotateY(180deg) translateZ(var(--p))',
    'rotateY(90deg) translateZ(var(--p))',
    'rotateY(-90deg) translateZ(var(--p))',
    'rotateX(90deg) translateZ(var(--p))',
  ];
  return spots
    .map((spot, index) => {
      const item = entries[index];
      const label = item?.title ? escapeHtml(item.title) : '';
      const faces = (extra: string) =>
        sides
          .map((transform, face) => `<span class="s3d__plinth-face s3d__plinth-face--${face}${extra}" style="transform:${transform}"></span>`)
          .join('');
      return `<div class="s3d__plinth" style="transform:translate3d(${spot.x}px,0,${spot.z}px)">
        <span class="s3d__plinth-top" aria-hidden>${faces('')}</span>
        <span class="s3d__plinth-box" aria-hidden>${faces('')}</span>
        ${label ? `<span class="s3d__plinth-label">${label}</span>` : ''}
      </div>`;
    })
    .join('');
}

/** Ridges receding to a horizon — terrain, for a game landing page. */
function terrain(): string {
  const ridges = Array.from(
    { length: 5 },
    (_, index) =>
      `<span class="s3d__ridge" style="transform:translate3d(0,${index * 14}px,${-index * 110}px) rotateX(78deg);opacity:${(1 - index * 0.16).toFixed(2)}"></span>`,
  ).join('');
  return `<div class="s3d__terrain" aria-hidden>${ridges}</div>`;
}

/** A screen, tilted, with the glare across it. */
const device = `<div class="s3d__device" aria-hidden>
  <span class="s3d__device-screen"></span>
  <span class="s3d__device-glare"></span>
  <span class="s3d__device-base"></span>
</div>`;

function stageFor(form: Scene3dForm, section: Section): string {
  const entries = section.items ?? [];
  switch (form) {
    case 'carousel':
      return `${floor}${ring(entries, section.id)}${motes(10)}`;
    case 'showroom':
      return `${floor}<div class="s3d__plinths">${plinths(entries)}</div>${motes(8)}`;
    case 'world':
      return `${terrain()}${solid()}${motes(18)}`;
    case 'device':
      return `${floor}${device}${motes(8)}`;
    default:
      return `${floor}${solid()}<span class="s3d__orbit" aria-hidden></span>${motes(12)}`;
  }
}

/**
 * The things worth pointing at, as a list.
 *
 * Written as a real list with real text rather than as dots on the scene, and
 * then placed onto the scene by CSS. A screen reader, a printer and a browser
 * with transforms disabled all get the content; nobody gets a paragraph that
 * says "hover the glowing dot".
 */
function hotspots(section: Section): string {
  const entries = (section.items ?? []).slice(0, 6);
  if (entries.length === 0) return '';
  const rows = entries
    .map((item, index) => {
      const title = escapeHtml(item.title ?? '');
      const body = item.body ? `<p>${escapeHtml(item.body)}</p>` : '';
      const meta = item.meta ? `<span class="s3d__spot-meta">${escapeHtml(item.meta)}</span>` : '';
      return `<li class="s3d__spot">
        <button type="button" class="s3d__spot-pin" data-s3d-spot="${index}" aria-label="Show ${title}"><span aria-hidden>${index + 1}</span></button>
        <div class="s3d__spot-copy"><h3>${title}</h3>${body}${meta}</div>
      </li>`;
    })
    .join('');
  return `<ul class="s3d__spots">${rows}</ul>`;
}

const HINTS = ['Drag to turn it', 'Scroll to move through it', 'Tap a point to look closer'];

/**
 * The whole section.
 *
 * `data-s3d` is what the script looks for; everything inside it is already
 * laid out and readable before the script runs, and stays readable if it never
 * does.
 */
export function renderScene3d(section: Section): string {
  const form = scene3dForm(section.layout);
  const tone =
    section.tone === 'surface' ? ' section--surface' : section.tone === 'alt' ? ' section--alt' : '';

  const eyebrow = section.eyebrow
    ? `<p class="eyebrow" data-lumen-id="${escapeHtml(section.id)}-eyebrow">${escapeHtml(section.eyebrow)}</p>`
    : '';
  const title = section.heading
    ? `<h2 data-lumen-id="${escapeHtml(section.id)}-heading">${escapeHtml(section.heading)}</h2>`
    : '';
  const lead = section.subheading
    ? `<p class="lead" data-lumen-id="${escapeHtml(section.id)}-sub">${escapeHtml(section.subheading)}</p>`
    : '';
  const body = section.body
    ? `<p data-lumen-id="${escapeHtml(section.id)}-body">${escapeHtml(section.body)}</p>`
    : '';
  const cta = section.primaryCta?.label
    ? `<a class="btn" href="${safeHref(section.primaryCta.href)}">${escapeHtml(section.primaryCta.label)}</a>`
    : '';

  return `<section id="${escapeHtml(section.id)}" class="section s3d s3d--${form}${tone}" data-section="scene3d" data-lumen-id="${escapeHtml(section.id)}">
  <div class="shell">
    <div class="section__head">${eyebrow}${title}${lead}</div>
    <div class="s3d__layout">
      <div class="s3d__stage" data-s3d="${form}" tabindex="0" role="img" aria-label="${escapeHtml(section.heading ?? 'An interactive 3D scene')}. Use the arrow keys to turn it.">
        <div class="s3d__world">${stageFor(form, section)}</div>
        <div class="s3d__glow" aria-hidden></div>
      </div>
      <div class="s3d__side">
        ${body}
        ${hotspots(section)}
        <div class="s3d__controls">
          <button type="button" class="s3d__btn" data-s3d-act="spin" aria-pressed="false">Play</button>
          <button type="button" class="s3d__btn" data-s3d-act="in" aria-label="Move closer">+</button>
          <button type="button" class="s3d__btn" data-s3d-act="out" aria-label="Move away">−</button>
          <button type="button" class="s3d__btn" data-s3d-act="reset">Reset</button>
        </div>
        <p class="s3d__hint">${HINTS.join(' · ')}</p>
        ${cta}
      </div>
    </div>
  </div>
</section>`;
}

/**
 * The stylesheet for every scene.
 *
 * Shipped on every site rather than only the 3D ones: it is under 4kB
 * compressed, and a section added later from the editor would otherwise land on
 * a page with no rules for it.
 */
export function scene3dCss(): string {
  return `
/* ----------------------------------------------------------------- 3D scenes */
.s3d__layout { display: grid; gap: 2.5rem; grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); align-items: center; }
@media (max-width: 900px) { .s3d__layout { grid-template-columns: minmax(0, 1fr); } }

.s3d__stage {
  position: relative; min-width: 0;
  aspect-ratio: 4 / 3; max-height: 560px;
  perspective: 1200px; perspective-origin: 50% 45%;
  border-radius: var(--radius-lg, 22px);
  overflow: hidden; cursor: grab; touch-action: pan-y;
  background:
    radial-gradient(120% 90% at 50% 15%, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 62%),
    linear-gradient(170deg, color-mix(in srgb, var(--surface-alt, var(--surface)) 92%, var(--ink)) 0%, color-mix(in srgb, var(--surface) 86%, var(--ink)) 100%);
  border: 1px solid var(--border);
  --rx: -14deg; --ry: -28deg; --zoom: 1; --r: 230px; --d: 58px;
}
.s3d__stage:active { cursor: grabbing; }
.s3d__stage:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
@media (max-width: 600px) { .s3d__stage { aspect-ratio: 1 / 1; --r: 150px; --d: 42px; } }

.s3d__world {
  position: absolute; inset: 0;
  transform-style: preserve-3d;
  transform: scale(var(--zoom)) rotateX(var(--rx)) rotateY(var(--ry));
  transition: transform .45s cubic-bezier(.2,.7,.3,1);
}
.s3d__stage[data-s3d-dragging] .s3d__world { transition: none; }

/* The light the scene sits in, over everything, never catching a pointer. */
.s3d__glow {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(60% 40% at 50% 100%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%);
  mix-blend-mode: screen;
}

/* ---- the ground */
.s3d__floor {
  position: absolute; left: 50%; top: 50%; width: 1400px; height: 1400px;
  margin: -700px 0 0 -700px;
  transform: rotateX(90deg) translateZ(-150px);
  background:
    linear-gradient(color-mix(in srgb, var(--accent) 26%, transparent) 1px, transparent 1px) 0 0 / 70px 70px,
    linear-gradient(90deg, color-mix(in srgb, var(--accent) 26%, transparent) 1px, transparent 1px) 0 0 / 70px 70px;
  -webkit-mask-image: radial-gradient(circle at 50% 50%, #000 0%, transparent 62%);
  mask-image: radial-gradient(circle at 50% 50%, #000 0%, transparent 62%);
}

/* ---- the solid */
.s3d__solid {
  position: absolute; left: 50%; top: 50%;
  width: calc(var(--d) * 2); height: calc(var(--d) * 2);
  margin: calc(var(--d) * -1) 0 0 calc(var(--d) * -1);
  transform-style: preserve-3d;
  animation: s3d-float 7s ease-in-out infinite;
}
.s3d__face {
  position: absolute; inset: 0;
  border: 1px solid color-mix(in srgb, var(--accent) 60%, transparent);
  background: color-mix(in srgb, var(--accent) 24%, transparent);
  backdrop-filter: blur(2px);
}
/* Each face catches the light differently, or the solid reads as a flat badge. */
.s3d__face--a { background: color-mix(in srgb, var(--accent) 46%, transparent); }
.s3d__face--b { background: color-mix(in srgb, var(--accent) 14%, transparent); }
.s3d__face--c { background: color-mix(in srgb, var(--accent) 32%, transparent); }
.s3d__face--d { background: color-mix(in srgb, var(--accent-soft, var(--accent)) 30%, transparent); }
.s3d__face--e { background: color-mix(in srgb, var(--accent) 55%, transparent); }
.s3d__face--f { background: color-mix(in srgb, var(--ink) 22%, transparent); }

.s3d__orbit {
  position: absolute; left: 50%; top: 50%; width: 380px; height: 380px; margin: -190px 0 0 -190px;
  border: 1px dashed color-mix(in srgb, var(--accent) 45%, transparent);
  border-radius: 50%; transform: rotateX(78deg);
  animation: s3d-orbit 18s linear infinite;
}

/* ---- panels in a ring */
.s3d__ring { position: absolute; left: 50%; top: 50%; transform-style: preserve-3d; animation: s3d-turn 34s linear infinite; }
/* Hidden from behind. A panel on the far side of the ring is being viewed from
   its back, so its caption renders mirrored — "RED MESA" reading backwards
   through the front of the ring. Hiding the backface shows the near half only,
   which is also what a carousel is supposed to look like. */
.s3d__panel { position: absolute; margin: 0; width: 190px; height: 250px; left: -95px; top: -125px; transform-style: preserve-3d; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.s3d__panel-face {
  position: absolute; inset: 0; border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent);
  background: linear-gradient(150deg, color-mix(in srgb, var(--accent) 34%, transparent), color-mix(in srgb, var(--accent-soft, var(--accent)) 10%, transparent));
  box-shadow: 0 18px 50px -20px color-mix(in srgb, var(--accent) 60%, transparent);
}
.s3d__panel-label {
  position: absolute; left: 0; right: 0; bottom: 10px; text-align: center;
  font-size: .85rem; letter-spacing: .04em; text-transform: uppercase;
  color: var(--ink); opacity: .85;
}
@media (max-width: 600px) { .s3d__panel { width: 124px; height: 166px; left: -62px; top: -83px; } }

/* ---- plinths */
.s3d__plinths { position: absolute; left: 50%; top: 50%; transform-style: preserve-3d; }
.s3d__plinth { position: absolute; transform-style: preserve-3d; }
/* The floor is at translateZ(-150px) under a rotateX(90deg), so it is 150px
   below the centre of the stage. The plinth is a cube of side 2 x --p standing
   ON it: its centre sits at 150 - --p, which puts its base exactly on the
   floor rather than hovering near it. */
.s3d__plinth-box {
  position: absolute; --p: 42px;
  left: calc(var(--p) * -1); top: calc(150px - var(--p) * 2);
  width: calc(var(--p) * 2); height: calc(var(--p) * 2);
  transform-style: preserve-3d;
}
.s3d__plinth-face {
  position: absolute; inset: 0;
  border: 1px solid color-mix(in srgb, var(--accent) 42%, transparent);
  background: color-mix(in srgb, var(--accent) 20%, transparent);
}
/* Five faces, five exposures. A cube whose sides are all one value is a
   silhouette rather than a solid. */
.s3d__plinth-face--0 { background: color-mix(in srgb, var(--accent) 26%, transparent); }
.s3d__plinth-face--1 { background: color-mix(in srgb, var(--ink) 20%, transparent); }
.s3d__plinth-face--2 { background: color-mix(in srgb, var(--accent) 16%, transparent); }
.s3d__plinth-face--3 { background: color-mix(in srgb, var(--accent-soft, var(--accent)) 18%, transparent); }
.s3d__plinth-face--4 { background: color-mix(in srgb, var(--accent) 40%, transparent); }
/* And the stock sits just above the plinth it belongs to: the float carries it
   between 20px and 40px clear, close enough to read as resting on that plinth
   rather than as an unrelated object further back. */
/* The stock itself: a smaller cube, hovering just clear of the plinth's top
   face at y = 150 - 2 x --p. A plane here stayed a plane when the scene turned
   and read as a card leaning behind the plinth rather than an object on it. */
.s3d__plinth-top {
  position: absolute; --p: 30px;
  left: calc(var(--p) * -1); top: calc(6px - var(--p) * 2);
  width: calc(var(--p) * 2); height: calc(var(--p) * 2);
  /* No filter here, however much it wants a drop-shadow: a filter forces the
     element to render as a single flattened layer, which kills preserve-3d on
     everything inside it. The cube collapsed to one quad until this came off. */
  transform-style: preserve-3d;
  /* The tilt lives in the keyframes rather than beside them. An animation that
     sets transform replaces the whole property, so a static rotateX declared
     here would simply vanish on the first frame. */
  transform: rotateX(-12deg);
  animation: s3d-float-tilt 6s ease-in-out infinite;
}
.s3d__plinth-label {
  position: absolute; left: -70px; top: 162px; width: 140px; text-align: center;
  font-size: .8rem; color: var(--ink); opacity: .8;
}

/* ---- terrain */
.s3d__terrain { position: absolute; left: 50%; top: 58%; transform-style: preserve-3d; }
.s3d__ridge {
  position: absolute; left: -400px; width: 800px; height: 300px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 38%, transparent), transparent 70%);
  -webkit-mask-image: repeating-linear-gradient(90deg, #000 0 26px, transparent 26px 52px);
  mask-image: repeating-linear-gradient(90deg, #000 0 26px, transparent 26px 52px);
}

/* ---- a device */
/* Zero-sized: it is a point at the centre that its parts hang off, so there is
   no translate to centre and the turn can live in the keyframes with the drift. */
.s3d__device { position: absolute; left: 50%; top: 50%; transform-style: preserve-3d; transform: rotateY(-18deg); animation: s3d-float-turn 8s ease-in-out infinite; }
.s3d__device-screen {
  position: absolute; left: -170px; top: -112px; width: 340px; height: 224px; border-radius: 12px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--accent) 40%, transparent), color-mix(in srgb, var(--ink) 30%, transparent));
  border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
  box-shadow: 0 40px 80px -30px color-mix(in srgb, var(--accent) 70%, transparent);
}
.s3d__device-glare {
  position: absolute; left: -170px; top: -112px; width: 340px; height: 224px; border-radius: 12px;
  background: linear-gradient(115deg, transparent 30%, color-mix(in srgb, #fff 26%, transparent) 46%, transparent 58%);
  transform: translateZ(1px);
}
.s3d__device-base {
  position: absolute; left: -60px; top: 112px; width: 120px; height: 10px; border-radius: 4px;
  background: color-mix(in srgb, var(--accent) 36%, transparent); transform: rotateX(70deg);
}
@media (max-width: 600px) {
  .s3d__device-screen, .s3d__device-glare { left: -115px; top: -76px; width: 230px; height: 152px; }
}

/* ---- motes */
.s3d__motes { position: absolute; inset: 0; transform-style: preserve-3d; }
.s3d__mote {
  position: absolute; width: 4px; height: 4px; border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 80%, transparent);
  transform: translateZ(var(--mz));
  animation: s3d-drift 9s ease-in-out infinite;
}

/* ---- the words beside it */
.s3d__side { min-width: 0; display: grid; gap: 1.25rem; }
.s3d__spots { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; }
.s3d__spot { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .9rem; align-items: start; }
.s3d__spot-pin {
  width: 2.1rem; height: 2.1rem; border-radius: 50%; cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--ink); font: inherit; font-size: .92rem; font-weight: 600;
  display: grid; place-items: center;
  transition: background .2s ease, transform .2s ease;
}
.s3d__spot-pin:hover, .s3d__spot[data-s3d-active] .s3d__spot-pin { background: var(--accent); color: var(--accent-ink, var(--surface)); transform: scale(1.08); }
.s3d__spot-copy h3 { margin: 0 0 .25rem; font-size: 1.05rem; }
.s3d__spot-copy p { margin: 0; color: var(--ink-muted); }
.s3d__spot-meta { display: inline-block; margin-top: .3rem; font-size: .82rem; color: var(--accent); }

.s3d__controls { display: flex; flex-wrap: wrap; gap: .5rem; }
.s3d__btn {
  min-width: 2.6rem; padding: .5rem .95rem; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--border); background: transparent; color: var(--ink);
  font: inherit; font-size: .92rem; transition: border-color .2s ease, color .2s ease;
}
.s3d__btn:hover { border-color: var(--accent); color: var(--accent); }
.s3d__btn[aria-pressed="true"] { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, transparent); }
.s3d__hint { margin: 0; font-size: .85rem; color: var(--ink-muted); }

@keyframes s3d-float { 0%, 100% { transform: translateY(-10px); } 50% { transform: translateY(10px); } }
@keyframes s3d-float-tilt { 0%, 100% { transform: rotateX(-12deg) translateY(-10px); } 50% { transform: rotateX(-12deg) translateY(10px); } }
@keyframes s3d-float-turn { 0%, 100% { transform: rotateY(-18deg) translateY(-10px); } 50% { transform: rotateY(-18deg) translateY(10px); } }
@keyframes s3d-turn { to { transform: rotateY(360deg); } }
@keyframes s3d-orbit { to { transform: rotateX(78deg) rotateZ(360deg); } }
@keyframes s3d-drift { 0%, 100% { opacity: .25; } 50% { opacity: .9; } }

/* The scene is the one part of the page that moves on its own. For anyone who
   has asked their system for less motion it stops dead — still legible, still
   three-dimensional, still draggable if they want it. */
@media (prefers-reduced-motion: reduce) {
  .s3d__solid, .s3d__ring, .s3d__orbit, .s3d__mote, .s3d__plinth-top, .s3d__device { animation: none !important; }
  .s3d__world { transition: none; }
}
`;
}

/**
 * The scene's behaviour.
 *
 * Appended to every site's script and does nothing at all on a page with no
 * scene. Three rules it follows, each of which was a bug somewhere else first:
 * the wheel is never hijacked (the page must still scroll), the drag is on
 * pointer events (so it works with a finger), and the idle spin stops the
 * moment somebody touches it — a scene that keeps turning while you are trying
 * to look at one side of it is worse than one that never turns.
 */
export const SCENE3D_SCRIPT = `(function () {
  var stages = document.querySelectorAll('[data-s3d]');
  if (!stages.length) return;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  stages.forEach(function (stage) {
    var world = stage.querySelector('.s3d__world');
    if (!world) return;
    var section = stage.closest('.s3d');
    var rx = -14, ry = -28, zoom = 1, touched = false;

    function draw() {
      stage.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      stage.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      stage.style.setProperty('--zoom', zoom.toFixed(3));
    }

    // Any deliberate input stops the idle animation, so the thing holds still
    // while it is being looked at.
    function hold() {
      if (touched) return;
      touched = true;
      stage.querySelectorAll('.s3d__ring, .s3d__solid, .s3d__orbit, .s3d__device, .s3d__plinth-top').forEach(function (node) {
        node.style.animationPlayState = 'paused';
      });
      var play = stage.parentNode.parentNode.querySelector('[data-s3d-act="spin"]');
      if (play) play.setAttribute('aria-pressed', 'false');
    }

    var dragging = false, lastX = 0, lastY = 0, pointer = null;

    stage.addEventListener('pointerdown', function (event) {
      dragging = true; pointer = event.pointerId;
      lastX = event.clientX; lastY = event.clientY;
      stage.setAttribute('data-s3d-dragging', '');
      hold();
      if (stage.setPointerCapture) { try { stage.setPointerCapture(event.pointerId); } catch (error) {} }
    });

    stage.addEventListener('pointermove', function (event) {
      if (!dragging || event.pointerId !== pointer) return;
      ry += (event.clientX - lastX) * 0.4;
      // Clamped so the scene cannot be turned upside down and left there.
      rx = Math.max(-72, Math.min(42, rx - (event.clientY - lastY) * 0.3));
      lastX = event.clientX; lastY = event.clientY;
      draw();
    });

    function release() {
      dragging = false; pointer = null;
      stage.removeAttribute('data-s3d-dragging');
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('pointerleave', release);

    // Arrow keys, because a scene you can only turn with a mouse is a scene
    // some people cannot turn at all.
    stage.addEventListener('keydown', function (event) {
      var step = event.shiftKey ? 15 : 6;
      if (event.key === 'ArrowLeft') ry -= step;
      else if (event.key === 'ArrowRight') ry += step;
      else if (event.key === 'ArrowUp') rx = Math.max(-72, rx - step);
      else if (event.key === 'ArrowDown') rx = Math.min(42, rx + step);
      else if (event.key === '+' || event.key === '=') zoom = Math.min(1.8, zoom + 0.12);
      else if (event.key === '-') zoom = Math.max(0.6, zoom - 0.12);
      else return;
      event.preventDefault();
      hold();
      draw();
    });

    if (section) {
      section.querySelectorAll('[data-s3d-act]').forEach(function (button) {
        button.addEventListener('click', function () {
          var act = button.getAttribute('data-s3d-act');
          if (act === 'in') { zoom = Math.min(1.8, zoom + 0.15); hold(); }
          else if (act === 'out') { zoom = Math.max(0.6, zoom - 0.15); hold(); }
          else if (act === 'reset') { rx = -14; ry = -28; zoom = 1; hold(); }
          else if (act === 'spin') {
            var running = button.getAttribute('aria-pressed') === 'true';
            button.setAttribute('aria-pressed', String(!running));
            stage.querySelectorAll('.s3d__ring, .s3d__solid, .s3d__orbit, .s3d__device, .s3d__plinth-top').forEach(function (node) {
              node.style.animationPlayState = running ? 'paused' : 'running';
            });
            touched = running;
          }
          draw();
        });
      });

      // A point on the list turns the scene to face it. Seven panels, so the
      // nth is 360/7 degrees round; for the other forms it is a nudge rather
      // than an exact bearing, which is all "look closer" needs to mean.
      var spots = section.querySelectorAll('.s3d__spot');
      spots.forEach(function (spot, index) {
        var pin = spot.querySelector('[data-s3d-spot]');
        if (!pin) return;
        pin.addEventListener('click', function () {
          spots.forEach(function (other) { other.removeAttribute('data-s3d-active'); });
          spot.setAttribute('data-s3d-active', '');
          hold();
          ry = -(360 / 7) * index - 28;
          rx = -10;
          zoom = 1.18;
          draw();
        });
      });
    }

    // Scroll moves through the scene rather than scrolling it: the page keeps
    // its own scrolling, and the camera leans as the section passes.
    if (!still && 'IntersectionObserver' in window) {
      var near = false;
      new IntersectionObserver(function (entries) {
        near = entries[0].isIntersecting;
      }, { threshold: 0 }).observe(stage);

      var ticking = false;
      window.addEventListener('scroll', function () {
        if (!near || touched || ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          var box = stage.getBoundingClientRect();
          var height = window.innerHeight || 1;
          // -1 below the fold, 0 centred, 1 above it.
          var progress = Math.max(-1, Math.min(1, 1 - (box.top + box.height / 2) / (height / 2)));
          rx = -14 + progress * 10;
          zoom = 1 + progress * 0.06;
          draw();
        });
      }, { passive: true });
    }

    draw();
  });
})();`;

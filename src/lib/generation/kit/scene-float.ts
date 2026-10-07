/**
 * The scene that actually looks like the reference.
 *
 * The first version of this drew cubes and panels, and the verdict was fair:
 * it did not read as 3D. Looking at what the sites people mean by "a 3D site"
 * actually do — agrumeafarm.it is the one that was handed over — none of them
 * is WebGL. They are real product photographs, cut out, arranged at different
 * depths, and moved against each other. The depth cues are the ordinary ones a
 * camera gives you:
 *
 *   scale      — a jar nearer the lens is bigger
 *   blur       — everything off the focal plane is soft, and this is the one
 *                that does most of the work; a sharp object at every depth
 *                reads as a collage, not a photograph
 *   occlusion  — the near jar passes in front of the far one
 *   parallax   — they move at different rates, so the arrangement has volume
 *                rather than being a picture of volume
 *   shadow     — each one sits on something
 *
 * All five are cheap in CSS and none of them needs a renderer. What they do
 * need is the photographs, which is why a 3D build now makes them — a scene
 * full of grey rectangles is exactly the "too basic" this replaces.
 *
 * The geometric shapes in `scene3d.ts` stay as the fallback. A site whose
 * images failed, or that has not been photographed yet, still gets a scene.
 */

import type { Section, SectionItem } from './sections';
import { escapeHtml, safeHref } from './html';

/** A photograph placed in the scene, with everything depth decides about it. */
export interface FloatLayer {
  src: string;
  alt: string;
  /** Across the stage, as a percentage. May sit outside 0–100 to bleed off. */
  x: number;
  /** Down the stage, as a percentage. */
  y: number;
  /** 0 is furthest, 1 is nearest. Scale, blur, opacity and order come off it. */
  depth: number;
  /** Degrees. Nothing in the reference hangs straight. */
  tilt: number;
}

/**
 * Where the photographs go.
 *
 * Hand-placed rather than computed from an index, because an even spread reads
 * as a row of products and the whole effect depends on it not being one: one
 * hero near the lens and slightly off-centre, two mid-ground on either side,
 * and the rest far back and bleeding off the edges so the arrangement carries
 * on past the frame. The order is the order they are filled, so a scene with
 * two photographs gets the hero and one mid-ground rather than two stragglers
 * in the corner.
 */
const PLACES: Omit<FloatLayer, 'src' | 'alt'>[] = [
  { x: 50, y: 73, depth: 1, tilt: -4 },
  { x: 18, y: 62, depth: 0.62, tilt: -14 },
  { x: 82, y: 67, depth: 0.55, tilt: 10 },
  { x: 3, y: 80, depth: 0.3, tilt: -21 },
  { x: 97, y: 52, depth: 0.26, tilt: 15 },
  { x: 31, y: 36, depth: 0.16, tilt: 8 },
];

/** Only images we put there. A model-chosen scheme never reaches a src. */
function safeImage(value: string | undefined): string | null {
  const text = (value ?? '').trim();
  if (!text) return null;
  return /^(https?:\/\/|\/)/i.test(text) ? escapeHtml(text) : null;
}

/**
 * The photographs this section has, in the order they should be placed.
 *
 * The section's own image is the hero when there is one, because that is the
 * one the planner chose as the subject; the items' images fill in behind it.
 */
export function floatLayers(section: Section): FloatLayer[] {
  const sources: { src: string; alt: string }[] = [];

  const hero = safeImage(section.image);
  if (hero) sources.push({ src: hero, alt: section.heading ?? 'Product' });

  for (const item of section.items ?? []) {
    const src = safeImage(item.image);
    if (src) sources.push({ src, alt: item.title ?? 'Product' });
  }

  return sources.slice(0, PLACES.length).map((source, index) => ({
    ...PLACES[index],
    ...source,
  }));
}

/**
 * The organic colour shape behind everything.
 *
 * A border-radius with eight different values, which is the cheapest way to
 * get a shape that is clearly drawn rather than clearly a div. It is the one
 * element that carries the site's accent at full strength, so the scene has a
 * colour rather than a tint.
 */
const blob = `<span class="s3d__blob" aria-hidden></span>`;

/**
 * Text bent around a circle, turning slowly.
 *
 * In the reference this is what tells you the page is not a grid — a word
 * curving behind the product at an angle nothing else on the page sits at.
 * SVG `textPath` rather than one span per letter: a word split into characters
 * is read out letter by letter by a screen reader, and this is decoration.
 */
function arc(text: string, id: string): string {
  const words = text.trim().toUpperCase();
  if (!words) return '';
  // Repeated so the ring is full however short the word is.
  const ring = `${words} ◆ ${words} ◆ ${words} ◆ `;
  return `<svg class="s3d__arc" viewBox="0 0 400 400" aria-hidden focusable="false">
    <defs><path id="arc-${escapeHtml(id)}" d="M 200,200 m -150,0 a 150,150 0 1,1 300,0 a 150,150 0 1,1 -300,0" /></defs>
    <text><textPath href="#arc-${escapeHtml(id)}" startOffset="0">${escapeHtml(ring)}</textPath></text>
  </svg>`;
}

/**
 * One photograph at its depth.
 *
 * Everything that depth decides is written as a custom property and resolved
 * in the stylesheet, so the arithmetic lives in one place and a layer is four
 * numbers rather than a style attribute nobody can read.
 */
function layer(entry: FloatLayer, index: number): string {
  return `<figure class="s3d__layer" style="--x:${entry.x}%;--y:${entry.y}%;--d:${entry.depth};--tilt:${entry.tilt}deg;--n:${index}">
    <img src="${entry.src}" alt="${escapeHtml(entry.alt)}" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async" />
    <span class="s3d__cast" aria-hidden></span>
  </figure>`;
}

/**
 * The whole section.
 *
 * The words sit over the arrangement rather than beside it, which is the other
 * thing the reference does: the product is the hero and the copy is laid on
 * top of it, so the section reads as a photograph with a headline rather than
 * as a column of text next to a picture.
 */
export function renderFloatScene(section: Section, layers: FloatLayer[]): string {
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
  const cta = section.primaryCta?.label
    ? `<a class="btn s3d__pill" href="${safeHref(section.primaryCta.href)}">${escapeHtml(section.primaryCta.label)}</a>`
    : '';

  // The points worth making, under the scene, as real text. Same reasoning as
  // everywhere else in the kit: the scene is decoration and the words are the
  // page, so the words exist without it.
  const notes = (section.items ?? [])
    .filter((item) => item.title)
    .slice(0, 4)
    .map(
      (item: SectionItem) => `<li>
        <h3>${escapeHtml(item.title ?? '')}</h3>
        ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ''}
        ${item.meta ? `<span class="s3d__note-meta">${escapeHtml(item.meta)}</span>` : ''}
      </li>`,
    )
    .join('');

  return `<section id="${escapeHtml(section.id)}" class="section s3d s3d--float${tone}" data-section="scene3d" data-lumen-id="${escapeHtml(section.id)}">
  <div class="s3d__stage s3d__stage--float" data-s3d="float" data-s3d-depth>
    ${blob}
    ${arc(section.eyebrow || section.heading || 'Discover', section.id)}
    <div class="s3d__field">${layers.map(layer).join('')}</div>
    <div class="shell s3d__over">
      <div class="s3d__copy">${eyebrow}${title}${lead}${cta}</div>
    </div>
  </div>
  ${notes ? `<div class="shell"><ul class="s3d__notes">${notes}</ul></div>` : ''}
</section>`;
}

/**
 * The stylesheet for the floating scene.
 *
 * The depth arithmetic is all here. `--d` runs 0 to 1 and everything else is
 * derived from it, so a layer's markup carries position and depth and nothing
 * else, and changing how depth reads is one edit rather than six.
 */
export function floatCss(): string {
  return `
/* ------------------------------------------------- the floating-product scene */
.s3d--float { padding-top: 0; padding-bottom: 0; overflow: clip; }
.s3d__stage--float {
  position: relative; isolation: isolate;
  /* Explicitly undoing the base stage's 4:3 box. Sharing that class brought
     its aspect-ratio along, and an aspect-ratio plus a min-height computes a
     WIDTH — the full-bleed scene was silently 1104px wide inside a 1440px
     page, with the rest of the section showing through beside it. */
  aspect-ratio: auto; max-height: none; width: 100%;
  min-height: min(94vh, 900px);
  /* Copy at the top, products below it. Centring both put the headline
     directly over the hero product, where neither could be read. */
  display: grid; grid-template-rows: auto 1fr; justify-items: center;
  overflow: clip; border: 0; border-radius: 0; cursor: auto;
  /* Perspective so the tilts have somewhere to lean, and a flat backdrop so
     the photographs are the only thing with depth in the frame. */
  perspective: 1400px;
  padding: clamp(3rem, 7vh, 6rem) 1.5rem clamp(3rem, 8vh, 7rem);
}
@media (max-width: 760px) { .s3d__stage--float { min-height: 78vh; padding: 5rem 1rem 3.5rem; } }

/* The colour shape behind everything. Eight radii, so it is drawn rather than
   boxed, and slowly turning so the silhouette never settles. */
.s3d__blob {
  position: absolute; z-index: 0;
  left: 50%; top: 74%; translate: -50% -50%;
  width: min(86vw, 1020px); aspect-ratio: 2.15;
  border-radius: 42% 58% 38% 62% / 55% 36% 64% 45%;
  background: var(--accent);
  opacity: .9;
  animation: s3d-blob 26s ease-in-out infinite;
}

/* Decoration, and never in front of a word or a photograph. */
.s3d__arc {
  position: absolute; z-index: 1;
  left: 50%; top: 74%; translate: -50% -50%;
  width: min(58vw, 540px); aspect-ratio: 1;
  fill: var(--accent-ink, var(--surface));
  opacity: .62;
  animation: s3d-arc 44s linear infinite;
  pointer-events: none;
}
.s3d__arc text {
  font-family: var(--font-display, inherit);
  font-size: 26px; letter-spacing: .2em;
}

.s3d__field { position: absolute; inset: 0; z-index: 2; transform-style: preserve-3d; }

/**
 * One photograph.
 *
 * Scale, blur, order and opacity all come off --d. The parallax offsets --px
 * and --py are written by the script and are zero until it runs, so the scene
 * is correct before and without it.
 */
.s3d__layer {
  position: absolute; margin: 0;
  left: var(--x); top: var(--y);
  width: calc(clamp(118px, 19vw, 266px) * (0.42 + var(--d) * 0.82));
  /* The translate centres it on its own point; everything after is depth. */
  transform:
    translate(-50%, -50%)
    translate3d(calc(var(--px, 0px) * var(--d)), calc(var(--py, 0px) * var(--d)), 0)
    rotate(calc(var(--tilt) + var(--spin, 0deg)));
  /* Off the focal plane is soft. This is the cue that does most of the work:
     without it the arrangement is a collage of cut-outs at different sizes. */
  filter: blur(calc((1 - var(--d)) * 7px));
  opacity: calc(0.45 + var(--d) * 0.55);
  z-index: calc(var(--d) * 10);
  transition: transform .9s cubic-bezier(.2,.7,.3,1);
  will-change: transform;
  animation: s3d-bob calc(7s + var(--n) * 1.4s) ease-in-out infinite;
  animation-delay: calc(var(--n) * -1.1s);
}
.s3d__layer img {
  display: block; width: 100%; height: auto;
  /* The photographs are cut-outs on transparency; this is the shadow that puts
     them back on a surface. */
  filter: drop-shadow(0 calc(16px + var(--d) * 36px) calc(20px + var(--d) * 40px) rgba(0,0,0,calc(.18 + var(--d) * .3)));
}
/* The ground each one stands on, so a floating object is not floating in a
   void. Scaled and faded by depth like everything else. */
.s3d__cast {
  position: absolute; left: 50%; bottom: -6%;
  width: 70%; aspect-ratio: 3.4;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(0,0,0,.34), transparent 72%);
  opacity: calc(var(--d) * .7);
  z-index: -1;
}

/* The words, over the arrangement rather than beside it. */
.s3d__over { position: relative; z-index: 11; pointer-events: none; grid-row: 1; width: 100%; }
.s3d__copy {
  max-width: 38rem; text-align: center; margin-inline: auto;
  position: relative; padding: 1rem 1.25rem 0;
}
.s3d__copy::before {
  content: ''; position: absolute; inset: -18% -14% -22%;
  z-index: -1; pointer-events: none;
  background: radial-gradient(60% 56% at 50% 46%, color-mix(in srgb, var(--bg) 78%, transparent) 0%, transparent 72%);
}
.s3d__copy > * { pointer-events: auto; }
.s3d__copy h2 {
  font-size: clamp(2.3rem, 6.4vw, 4.6rem);
  line-height: 1.02; letter-spacing: -0.02em; text-wrap: balance;
  margin: .4rem 0 0;
}
.s3d__copy .lead { margin: 1rem auto 0; max-width: 32rem; }
.s3d__pill { margin-top: 1.8rem; }

/* The points under the scene. */
.s3d__notes {
  list-style: none; margin: 0; padding: 3.5rem 0 4.5rem;
  display: grid; gap: 1.75rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
}
.s3d__notes h3 { margin: 0 0 .4rem; font-size: 1.1rem; }
.s3d__notes p { margin: 0; color: var(--ink-muted); }
.s3d__note-meta { display: inline-block; margin-top: .4rem; font-size: .85rem; color: var(--accent); }

@keyframes s3d-bob {
  0%, 100% { transform: translate(-50%, -50%) translate3d(calc(var(--px, 0px) * var(--d)), calc(var(--py, 0px) * var(--d) - 10px), 0) rotate(calc(var(--tilt) + var(--spin, 0deg))); }
  50%      { transform: translate(-50%, -50%) translate3d(calc(var(--px, 0px) * var(--d)), calc(var(--py, 0px) * var(--d) + 10px), 0) rotate(calc(var(--tilt) + var(--spin, 0deg) + 1.5deg)); }
}
@keyframes s3d-blob {
  0%, 100% { border-radius: 42% 58% 38% 62% / 55% 36% 64% 45%; transform: rotate(0deg) scale(1); }
  50%      { border-radius: 58% 42% 56% 44% / 38% 58% 42% 62%; transform: rotate(8deg) scale(1.04); }
}
@keyframes s3d-arc { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .s3d__layer, .s3d__blob, .s3d__arc { animation: none !important; }
  .s3d__layer { transition: none; }
}
`;
}

/**
 * The scene's motion.
 *
 * Two inputs, both of which move the layers by an amount proportional to their
 * depth — which is the whole trick: the near jar travels further than the far
 * one, and the brain reads the difference as distance.
 *
 * The scroll handler is passive and the pointer handler is throttled to a
 * frame. Neither ever takes the page's scrolling, because a section that traps
 * the wheel halfway down a website is worse than a section that does not move.
 */
export const FLOAT_SCRIPT = `(function () {
  var stages = document.querySelectorAll('[data-s3d-depth]');
  if (!stages.length) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  stages.forEach(function (stage) {
    var ticking = false;
    var pointer = { x: 0, y: 0 };
    var scrolled = 0;

    function apply() {
      // Scroll leans the whole arrangement; the pointer pushes it sideways.
      // Multiplied by --d per layer in the stylesheet, so one pair of numbers
      // moves six photographs by six different amounts.
      stage.style.setProperty('--px', (pointer.x * 26 + 0).toFixed(1) + 'px');
      stage.style.setProperty('--py', (pointer.y * 18 + scrolled * 46).toFixed(1) + 'px');
      stage.style.setProperty('--spin', (pointer.x * 2.2).toFixed(2) + 'deg');
    }

    function frame() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; apply(); });
    }

    stage.addEventListener('pointermove', function (event) {
      var box = stage.getBoundingClientRect();
      pointer.x = (event.clientX - box.left) / box.width - 0.5;
      pointer.y = (event.clientY - box.top) / box.height - 0.5;
      frame();
    });

    stage.addEventListener('pointerleave', function () {
      pointer.x = 0; pointer.y = 0;
      frame();
    });

    var near = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        near = entries[0].isIntersecting;
        if (near) frame();
      }, { threshold: 0 }).observe(stage);
    } else {
      near = true;
    }

    window.addEventListener('scroll', function () {
      if (!near) return;
      var box = stage.getBoundingClientRect();
      var height = window.innerHeight || 1;
      // -1 well below the fold, 0 centred, 1 well above it.
      scrolled = Math.max(-1, Math.min(1, 1 - (box.top + box.height / 2) / (height / 2)));
      frame();
    }, { passive: true });

    apply();
  });
})();`;

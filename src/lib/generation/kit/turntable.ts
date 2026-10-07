/**
 * The turntable: a product you rotate by scrolling.
 *
 * This is the one that actually reads as 3D, and it is the oldest trick on the
 * web — Apple have shipped it on every product page for a decade. Pre-render
 * the object at N angles, stack the frames, and map the scroll position to the
 * frame index. The page scrolls; the object turns. There is no renderer, no
 * model file, no WebGL, and it works on a phone that would drop to four frames
 * a second under Three.js.
 *
 * It needs two things to not look like a slideshow:
 *
 *   a sticky stage — the object has to stay put while the scroll is spent on
 *                    turning it. A sequence that scrolls past while it plays
 *                    reads as a gif, not as something you are controlling.
 *   every frame decoded up front — swapping to an undecoded image shows a
 *                    blank for a frame, and at scroll speed that is a flicker
 *                    on every step. They are all in the DOM, stacked, and the
 *                    swap is an opacity change between two layers that are
 *                    already painted.
 *
 * The honest limitation, written down because it decides how this is used: the
 * frames are generated from one locked description rather than rendered from
 * one model, so consecutive angles are *similar* rather than *identical*. At
 * twelve frames over a full turn that reads as a hand-turned object with a bit
 * of life in it. It would not survive being scrubbed at sixty frames a second,
 * which is why the stage is paced to the scroll rather than animated.
 */

import type { Section } from './sections';
import { escapeHtml, safeHref } from './html';

/**
 * How many angles make a turn.
 *
 * Twelve is thirty degrees apart — enough that each step is clearly a rotation
 * rather than a jump, and few enough that the images are affordable and the
 * page is not four megabytes. Fewer than eight stops reading as a rotation at
 * all; more than sixteen is paying for frames nobody can distinguish.
 */
export const TURNTABLE_FRAMES = 12;

/** Only images we put there. */
function safeImage(value: string | undefined): string | null {
  const text = (value ?? '').trim();
  if (!text) return null;
  return /^(https?:\/\/|\/)/i.test(text) ? escapeHtml(text) : null;
}

/**
 * The frames, in turn order.
 *
 * Read off the items, because that is where the photography step puts them —
 * one item per angle, in the order they were shot. A section with fewer than
 * three is not a rotation and is rendered as an ordinary picture instead.
 */
export function turntableFrames(section: Section): string[] {
  const frames: string[] = [];
  const hero = safeImage(section.image);
  if (hero) frames.push(hero);
  for (const item of section.items ?? []) {
    const src = safeImage(item.image);
    if (src) frames.push(src);
  }
  return frames;
}

export const MIN_TURNTABLE_FRAMES = 3;

/**
 * The section.
 *
 * The copy sits beside the stage on a wide screen and above it on a narrow
 * one, and the whole thing is a tall scroll container with a sticky child —
 * which is what buys the scroll distance the rotation is spent on.
 */
export function renderTurntable(section: Section, frames: string[]): string {
  const tone =
    section.tone === 'surface' ? ' section--surface' : section.tone === 'alt' ? ' section--alt' : '';

  const eyebrow = section.eyebrow
    ? `<p class="eyebrow">${escapeHtml(section.eyebrow)}</p>`
    : '';
  const title = section.heading
    ? `<h2 data-lumen-id="${escapeHtml(section.id)}-heading">${escapeHtml(section.heading)}</h2>`
    : '';
  const lead = section.subheading ? `<p class="lead">${escapeHtml(section.subheading)}</p>` : '';
  const body = section.body ? `<p>${escapeHtml(section.body)}</p>` : '';
  const cta = section.primaryCta?.label
    ? `<a class="btn" href="${safeHref(section.primaryCta.href)}">${escapeHtml(section.primaryCta.label)}</a>`
    : '';

  const alt = escapeHtml(section.heading ?? 'The product');
  const stack = frames
    .map(
      (src, index) =>
        `<img class="tt__frame${index === 0 ? ' is-on' : ''}" src="${src}" alt="${index === 0 ? alt : ''}" ${
          index === 0 ? 'fetchpriority="high"' : 'aria-hidden="true" loading="lazy"'
        } decoding="async" data-tt-frame="${index}" />`,
    )
    .join('');

  // Every tenth of a turn gets a tick, so the control reads as a dial rather
  // than as a progress bar that happens to be under a picture.
  const ticks = Array.from(
    { length: frames.length },
    (_, index) => `<span style="--i:${index}"></span>`,
  ).join('');

  return `<section id="${escapeHtml(section.id)}" class="section tt${tone}" data-section="turntable" data-lumen-id="${escapeHtml(section.id)}">
  <div class="tt__scroll" data-tt data-tt-count="${frames.length}">
    <div class="tt__sticky">
      <div class="shell tt__grid">
        <div class="tt__copy">${eyebrow}${title}${lead}${body}${cta}</div>
        <div class="tt__stage">
          <div class="tt__stack" role="img" aria-label="${alt}, shown from every angle as you scroll">${stack}</div>
          <div class="tt__dial" aria-hidden style="--last:${Math.max(frames.length - 1, 1)}">${ticks}<span class="tt__needle"></span></div>
          <p class="tt__hint">Scroll to turn it</p>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

/**
 * The stylesheet.
 *
 * The sticky child is the whole mechanism: the outer element is several
 * viewports tall, the inner one sticks to the top of the screen, and the
 * distance between them is the scroll the rotation is spent on.
 */
export function turntableCss(): string {
  return `
/* ------------------------------------------------------------- turntable */
.tt { padding: 0; }
/* Tall enough to spend scroll on, short enough that somebody who does not care
   about the product is not trapped in it. Four screens is about two seconds of
   deliberate scrolling. */
.tt__scroll { position: relative; height: 420vh; }
.tt__sticky { position: sticky; top: 0; height: 100vh; display: grid; align-items: center; overflow: hidden; }
.tt__grid {
  display: grid; gap: 3rem; align-items: center;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
}
@media (max-width: 900px) {
  .tt__grid { grid-template-columns: minmax(0, 1fr); gap: 1.5rem; text-align: center; }
  .tt__scroll { height: 340vh; }
}

.tt__copy { min-width: 0; }
.tt__copy h2 { font-size: clamp(2rem, 4.6vw, 3.4rem); line-height: 1.04; margin: .4rem 0 1rem; text-wrap: balance; }
.tt__copy .btn { margin-top: 1.5rem; }

.tt__stage { position: relative; min-width: 0; display: grid; justify-items: center; }
/* The frames are taken out of flow entirely. Sizing them with height:100%
   inside a grid whose own height came from an aspect-ratio made the track size
   to the image instead of the other way round, and a portrait photograph broke
   out of the top and bottom of the stage. */
.tt__stack { position: relative; width: 100%; max-width: 560px; aspect-ratio: 1; }
/* Every frame is in the DOM and painted. Swapping src at scroll speed shows a
   blank for one frame on each step, which reads as a flicker all the way
   through the turn. */
.tt__frame {
  position: absolute; inset: 0;
  width: 100%; height: 100%; object-fit: contain;
  opacity: 0; transition: opacity .06s linear;
  filter: drop-shadow(0 40px 60px rgba(0,0,0,.28));
}
.tt__frame.is-on { opacity: 1; }

/* The dial. Ticks around a line, with the needle moving along it. */
.tt__dial {
  position: relative; margin-top: 2rem;
  width: min(280px, 70%); height: 2px;
  background: color-mix(in srgb, var(--ink) 16%, transparent);
}
.tt__dial span {
  position: absolute; top: -4px; width: 1px; height: 10px;
  left: calc(var(--i) * (100% / var(--last, ${TURNTABLE_FRAMES - 1})));
  background: color-mix(in srgb, var(--ink) 26%, transparent);
}
.tt__needle {
  position: absolute; top: -7px !important; left: 0; width: 3px !important; height: 16px !important;
  background: var(--accent) !important;
  transform: translateX(calc(var(--tt, 0) * (min(280px, 70vw) - 3px)));
  transition: transform .08s linear;
}
.tt__hint {
  margin: .9rem 0 0; font-size: .85rem; letter-spacing: .1em;
  text-transform: uppercase; color: var(--ink-muted);
}

/* Without a pointer there is no hover and no reason to hide the hint, and on a
   short screen the sticky stage has to give the copy room. */
@media (max-height: 700px) {
  .tt__stack { max-width: 360px; }
  .tt__copy h2 { font-size: clamp(1.6rem, 4vw, 2.2rem); }
}
`;
}

/**
 * The scrubber.
 *
 * One listener, passive, and all it does is work out how far through its own
 * scroll container the page is and turn that into a frame index. It never
 * touches the scroll itself: a section that hijacks the wheel to play an
 * animation is the single most complained-about pattern on the web, and the
 * sticky container gets the same effect by spending real scroll distance.
 */
export const TURNTABLE_SCRIPT = `(function () {
  var stages = document.querySelectorAll('[data-tt]');
  if (!stages.length) return;

  stages.forEach(function (stage) {
    var frames = stage.querySelectorAll('[data-tt-frame]');
    if (frames.length < 2) return;
    var needle = stage.querySelector('.tt__needle');
    var current = 0;
    var ticking = false;

    function draw() {
      var box = stage.getBoundingClientRect();
      var span = box.height - window.innerHeight;
      if (span <= 0) return;
      // 0 when the container's top reaches the viewport top, 1 when its bottom
      // does — which is exactly the distance the sticky child is pinned for.
      var progress = Math.max(0, Math.min(1, -box.top / span));
      var index = Math.min(frames.length - 1, Math.round(progress * (frames.length - 1)));
      if (index !== current) {
        frames[current].classList.remove('is-on');
        frames[index].classList.add('is-on');
        current = index;
      }
      if (needle) needle.style.setProperty('--tt', progress.toFixed(4));
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; draw(); });
    }, { passive: true });

    // Decode every frame before the first scroll, so the first turn is as
    // smooth as the fifth. Without this the first pass stutters while each
    // frame is decoded on the step that needs it.
    frames.forEach(function (frame) {
      if (frame.decode) frame.decode().catch(function () {});
    });

    draw();
  });
})();`;

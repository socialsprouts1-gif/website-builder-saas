/**
 * The treatment that makes the whole site 3D, not one section of it.
 *
 * The complaint that produced this file was "build a full website, not just
 * one part of it", and it was right: a scene section on an otherwise ordinary
 * page is a 3D widget embedded in a flat site. What the sites people point at
 * actually do is apply the depth everywhere — every band moves at its own
 * rate, every heading arrives rather than being there, the product stays
 * pinned while the words scroll past it.
 *
 * Four patterns, all of which came out of looking at what the award sites
 * actually ship rather than at what they are described as using:
 *
 *   reveal   — nothing is simply present. Sections, headings and cards rise
 *              and resolve as they come into view. One IntersectionObserver
 *              for the page, a class per element, all of it in CSS.
 *   parallax — bands move against each other at rates set by a depth
 *              attribute, so scrolling the page is moving through it.
 *   pin      — a band that stays while the content over it scrolls. This is
 *              the sticky-canvas pattern every scrollytelling site is built
 *              on, and it is what makes a page feel directed rather than
 *              scrolled.
 *   kinetic  — type that moves: a marquee that drifts with the scroll, big
 *              display numerals, a grain layer over the whole thing so the
 *              flat colour has a surface.
 *
 * None of it is a library. A published site runs under `script-src 'self'`, so
 * GSAP and Lenis from a CDN are blocked outright — and the whole of this is
 * about three kilobytes, where those two are ninety before a line of the
 * site's own code.
 *
 * Every one of them is off under `prefers-reduced-motion`, and every one of
 * them degrades to "the content is simply there", which is a correct page.
 */

/**
 * The stylesheet.
 *
 * Shipped only on sites built from a 3D blueprint — it is a different design
 * language, not an improvement to the default one, and putting a plumber's
 * site through a scrollytelling treatment would be a worse plumber's site.
 */
export function dimensionalCss(): string {
  return `
/* ===================================================== the 3D site treatment */

/* A surface on the flat colour. Three kilobytes of SVG noise, fixed to the
   viewport so it does not scroll with the content and reads as film grain
   rather than as a texture painted onto the page. */
body::after {
  content: ''; position: fixed; inset: 0; z-index: 9999;
  pointer-events: none; opacity: .035;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* ---- the WebGL canvas ------------------------------------------------- */
/* Fixed, full-viewport and behind the content, which is the whole mechanism:
   the objects are not inside a section, they are behind all of them and travel
   as you scroll. Never catches a pointer — every click belongs to the page. */
.lumen3d__canvas {
  position: fixed; inset: 0;
  width: 100vw; height: 100vh;
  z-index: 0; pointer-events: none;
  opacity: 0; transition: opacity 1.2s ease;
}
.lumen3d__canvas.is-ready { opacity: 1; }

/* Content sits above the canvas by default. A band that wants the object in
   FRONT of its words marks itself, which is the layering the reference site
   gets from its under layer. No backticks in this file: it is one long
   template literal, and a backtick in a comment ends it. */
main > section { position: relative; z-index: 1; }
main > section.section--under { z-index: 0; }

/* The bands have to let the canvas through.
   A 3D site whose alternating bands keep their solid backgrounds is a site
   where the object disappears the moment it crosses a band edge — which is
   what the first build did, cutting the hero off in a straight line. The
   rhythm is kept as a tint over the page rather than a sheet on top of it, so
   the alternation still reads and the object stays visible across it. */
body { background: var(--bg); }
main > section { background: transparent; }
main > section.section--alt {
  background: color-mix(in srgb, var(--surface-alt, var(--surface)) 55%, transparent);
}
main > section.section--surface {
  background: color-mix(in srgb, var(--surface) 55%, transparent);
}

@media (prefers-reduced-motion: reduce) { .lumen3d__canvas { display: none; } }

/* ---- reveal ---------------------------------------------------------- */
/* The initial state is only ever applied by the script. A page whose CSS hides
   its content and whose script failed is a blank page, so the hiding is the
   script's job and the default is visible. */
[data-rise] {
  opacity: 0;
  transform: translate3d(0, var(--rise, 34px), 0) scale(var(--rise-scale, 1));
  transition:
    opacity .9s cubic-bezier(.2,.7,.3,1),
    transform 1.1s cubic-bezier(.2,.7,.3,1);
  transition-delay: var(--rise-delay, 0ms);
  will-change: opacity, transform;
}
[data-rise].is-in { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }

/* Cards and list items arrive one after another rather than as a block. The
   delay is set per child by the script, because a CSS-only stagger needs a
   rule per index and there can be twenty. */
.section--stagger > * { --rise: 26px; }

/* ---- parallax -------------------------------------------------------- */
/* Each band moves against the page at its own rate. --depth is written into
   the markup; --shift is written by the script, once per frame, for all of
   them at once. */
[data-depth] { will-change: transform; }
[data-depth] > .shell { transform: translate3d(0, calc(var(--shift, 0px) * var(--depth, 0)), 0); }

/* A photograph inside a parallax band moves further than the words next to it,
   which is what stops the band reading as one sliding plate. */
[data-depth] .media img, [data-depth] .media--empty {
  transform: translate3d(0, calc(var(--shift, 0px) * var(--depth, 0) * 1.6), 0) scale(1.06);
}

/* ---- pin ------------------------------------------------------------- */
/* The sticky-canvas pattern. The band is taller than the screen, its inner
   layer sticks, and the scroll in between is spent on whatever is pinned. */
.section--pin { position: relative; padding: 0; }
.section--pin .pin__track { height: 220vh; }
.section--pin .pin__stage {
  position: sticky; top: 0; height: 100vh;
  display: grid; align-items: center; overflow: hidden;
}
@media (max-width: 760px) { .section--pin .pin__track { height: 180vh; } }

/* ---- kinetic type ---------------------------------------------------- */
.kinetic {
  overflow: hidden; white-space: nowrap;
  padding: 2.5rem 0; border-block: 1px solid var(--border);
  user-select: none;
}
.kinetic__row {
  display: inline-flex; gap: 2.5rem; align-items: center;
  font-family: var(--font-display, inherit);
  font-size: clamp(2.4rem, 7vw, 5.5rem); line-height: 1;
  letter-spacing: -0.02em; text-transform: uppercase;
  /* Drifts on its own, and the scroll pushes it. Both, because a marquee that
     only moves on scroll is dead on a page nobody is scrolling. */
  animation: kinetic-drift 34s linear infinite;
  transform: translate3d(calc(var(--drift, 0px) * -1), 0, 0);
}
.kinetic__row > span { display: inline-flex; gap: 2.5rem; align-items: center; }
.kinetic em {
  font-style: normal; color: transparent;
  -webkit-text-stroke: 1px color-mix(in srgb, var(--ink) 45%, transparent);
}
.kinetic .dot { color: var(--accent); }

@keyframes kinetic-drift { to { transform: translate3d(-50%, 0, 0); } }

/* ---- depth on the ordinary components -------------------------------- */
/* The cards on a 3D site lift towards the pointer. Small, and on every card,
   which is what makes the whole page feel like it has a surface rather than
   one section having an effect on it. */
.card, .panel {
  transition: transform .45s cubic-bezier(.2,.7,.3,1), box-shadow .45s ease;
  transform-style: preserve-3d;
}
.card:hover, .panel:hover {
  transform: translateY(-6px) rotateX(2deg) rotateY(-2deg);
  box-shadow: var(--shadow-lg);
}

@media (prefers-reduced-motion: reduce) {
  body::after { display: none; }
  [data-rise] { opacity: 1 !important; transform: none !important; transition: none !important; }
  [data-depth] > .shell,
  [data-depth] .media img,
  [data-depth] .media--empty { transform: none !important; }
  .kinetic__row { animation: none !important; transform: none !important; }
  .card:hover, .panel:hover { transform: none; }
}
`;
}

/**
 * The script.
 *
 * One observer and one scroll listener for the whole page, rather than one per
 * element. The naive version — a listener per band — is what makes these sites
 * stutter: twenty handlers each calling getBoundingClientRect on every scroll
 * event is twenty forced layouts a frame.
 */
export const DIMENSIONAL_SCRIPT = `(function () {
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- reveal ---------------------------------------------------------- */
  // Marked up here rather than in the HTML, so a page whose script never runs
  // is a page with all of its content on it rather than a blank one.
  var risers = [];
  document.querySelectorAll('main > section').forEach(function (section) {
    var parts = section.querySelectorAll(':scope > .shell > .section__head, :scope > .shell > * > .card, :scope > .shell > ul > li, :scope > .shell > p, :scope > .shell > h2');
    var targets = parts.length ? parts : [section];
    targets.forEach(function (node, index) {
      node.setAttribute('data-rise', '');
      // Capped, or the twentieth card in a long list arrives two seconds late.
      node.style.setProperty('--rise-delay', Math.min(index * 70, 420) + 'ms');
      risers.push(node);
    });
  });

  if (still) {
    risers.forEach(function (node) { node.classList.add('is-in'); });
  } else if ('IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        seen.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });
    risers.forEach(function (node) { seen.observe(node); });
  } else {
    risers.forEach(function (node) { node.classList.add('is-in'); });
  }

  if (still) return;

  /* ---- parallax and kinetic drift -------------------------------------- */
  var bands = [].slice.call(document.querySelectorAll('[data-depth]'));
  var rows = [].slice.call(document.querySelectorAll('.kinetic__row'));
  if (!bands.length && !rows.length) return;

  var ticking = false;

  function frame() {
    ticking = false;
    var height = window.innerHeight || 1;

    for (var i = 0; i < bands.length; i += 1) {
      var band = bands[i];
      var box = band.getBoundingClientRect();
      // Skip anything off screen: the transform would not be seen and the
      // layout read is the expensive part.
      if (box.bottom < -200 || box.top > height + 200) continue;
      // -1 entering from below, 0 centred, 1 leaving at the top.
      var through = (box.top + box.height / 2 - height / 2) / height;
      band.style.setProperty('--shift', (through * -90).toFixed(1) + 'px');
    }

    var y = window.scrollY || window.pageYOffset || 0;
    for (var r = 0; r < rows.length; r += 1) {
      rows[r].style.setProperty('--drift', (y * 0.18).toFixed(1) + 'px');
    }
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }, { passive: true });

  window.addEventListener('resize', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }, { passive: true });

  frame();
})();`;

/**
 * Depth attributes on the sections of a page.
 *
 * Alternating rather than uniform: every band moving at the same rate is one
 * plate sliding, which is not parallax. The hero stays still because a hero
 * that drifts on load looks like a bug, and the scene sections are left alone
 * because they do their own motion and two systems moving the same element
 * fight each other.
 */
const STILL = new Set(['hero', 'announcement', 'scene3d', 'turntable']);

export function depthFor(kind: string, index: number): number | null {
  if (STILL.has(kind)) return null;
  // A short repeating ladder, so neighbouring bands always differ.
  return [0.35, 0.16, 0.5, 0.24][index % 4];
}

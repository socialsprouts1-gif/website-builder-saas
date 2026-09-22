import type { Depth, Motion } from './templates';

/**
 * The CSS that makes a generated site look built rather than assembled.
 *
 * Everything the new layouts need — bento grids, mosaics, snapping rails,
 * tickers, timelines, oversized numerals, glass panels — plus the two things
 * that separate a premium site from a tidy one: movement that responds to the
 * reader, and depth that responds to the pointer.
 *
 * All of it is plain CSS in the site's own stylesheet and plain JavaScript in
 * the site's own script. Nothing is fetched from anywhere: a published site
 * runs under `script-src 'self'`, and a site that depends on a CDN is a site
 * that breaks when the CDN does.
 *
 * Every animation is off by default for anyone who has asked their system for
 * less motion. That is not a nicety — for some people a page that moves while
 * they read is unusable.
 */
export function premiumCss(motion: Motion, depth: Depth): string {
  return `
/* ---------------------------------------------------------- depth & glass */
${depthCss(depth)}

/* ------------------------------------------------------------- hero shapes */
.hero--editorial .hero__editorial { max-width: 100%; }
.hero--editorial h1 {
  font-size: clamp(2.6rem, 9vw, 7rem);
  line-height: 0.95;
  letter-spacing: -0.03em;
  margin: 0 0 2rem;
  text-wrap: balance;
}
.hero--editorial .hero__editorial-foot {
  display: grid; gap: 1.5rem; align-items: end;
  grid-template-columns: minmax(0, 1fr) auto;
  border-top: 1px solid var(--border); padding-top: 1.5rem; margin-bottom: 2.5rem;
}
@media (max-width: 720px) { .hero--editorial .hero__editorial-foot { grid-template-columns: 1fr; } }

.hero--fullbleed { position: relative; min-height: min(86vh, 760px); display: grid; align-items: end; overflow: hidden; }
.hero--fullbleed .hero__bleed {
  position: absolute; inset: 0; background-size: cover; background-position: center;
  transform: scale(1.06); will-change: transform;
}
.hero--fullbleed .hero__scrim {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg) 55%, transparent) 0%, transparent 35%, color-mix(in srgb, var(--bg) 92%, transparent) 100%);
}
.hero--fullbleed .hero__over { position: relative; padding-bottom: 4rem; }
.hero--fullbleed h1 { font-size: clamp(2.4rem, 7vw, 5.2rem); line-height: 1.02; text-wrap: balance; }

.hero--showcase .hero__showcase { perspective: 1400px; }
.hero--showcase .media--float {
  transform: rotateY(-12deg) rotateX(6deg);
  transition: transform .5s cubic-bezier(.2,.7,.3,1);
  box-shadow: var(--shadow-lg);
}
.media--band img { aspect-ratio: 21 / 9; width: 100%; object-fit: cover; }

/* ------------------------------------------------------------------ bento */
.bento { display: grid; gap: var(--gap); grid-template-columns: repeat(6, 1fr); }
.bento__tile {
  grid-column: span 2; padding: 1.5rem; border-radius: var(--radius-lg);
  background: var(--surface); border: 1px solid var(--border);
  display: flex; flex-direction: column; gap: .6rem;
}
.bento__tile--lead { grid-column: span 4; grid-row: span 2; }
.bento__tile--lead .card__title { font-size: 1.5rem; }
@media (max-width: 900px) { .bento { grid-template-columns: repeat(2, 1fr); } .bento__tile, .bento__tile--lead { grid-column: span 2; grid-row: auto; } }

/* --------------------------------------------------------------- numbered */
.numbered { display: grid; gap: 0; }
.numbered__row {
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 1.5rem; align-items: baseline;
  padding: 1.75rem 0; border-top: 1px solid var(--border);
}
.numbered__row:last-child { border-bottom: 1px solid var(--border); }
.numbered__index {
  font-family: var(--font-display); font-size: clamp(1.6rem, 4vw, 2.8rem);
  color: var(--accent); opacity: .55; margin: 0; line-height: 1; font-variant-numeric: tabular-nums;
}
@media (max-width: 640px) { .numbered__row { grid-template-columns: auto minmax(0, 1fr); } .numbered__row .row__value { grid-column: 2; } }

/* ------------------------------------------------------------------ index */
.index { display: grid; }
.index__row {
  display: grid; grid-template-columns: auto minmax(0, 1fr) minmax(0, 1.2fr) auto;
  gap: 1.25rem; align-items: baseline; padding: 1.15rem 0;
  border-top: 1px solid var(--border); text-decoration: none; color: inherit;
  transition: background .2s, padding-inline .2s;
}
.index__row:last-child { border-bottom: 1px solid var(--border); }
.index__row:hover { background: color-mix(in srgb, var(--accent) 7%, transparent); padding-inline: .75rem; }
.index__num { font-variant-numeric: tabular-nums; color: var(--ink-muted); font-size: .8rem; }
.index__name { font-family: var(--font-display); font-size: 1.15rem; }
.index__meta { white-space: nowrap; color: var(--accent); }
@media (max-width: 720px) {
  .index__row { grid-template-columns: auto minmax(0, 1fr) auto; }
  .index__note { display: none; }
}

/* --------------------------------------------------------------- timeline */
.timeline { list-style: none; margin: 0; padding: 0 0 0 1.75rem; position: relative; }
.timeline::before { content: ''; position: absolute; left: 3px; top: .5rem; bottom: .5rem; width: 1px; background: var(--border); }
.timeline__step { position: relative; padding: 0 0 2rem; }
.timeline__dot {
  position: absolute; left: -1.75rem; top: .45rem; width: 7px; height: 7px; border-radius: 999px;
  background: var(--accent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent);
}

/* ----------------------------------------------------------- rails & grids */
.rail {
  display: grid; grid-auto-flow: column; grid-auto-columns: minmax(260px, 30%);
  gap: var(--gap); overflow-x: auto; scroll-snap-type: x mandatory;
  padding: .25rem 1.5rem 1.25rem; margin-inline: calc(var(--shell-gutter, 1.5rem) * -1);
  scrollbar-width: thin;
}
.rail > * { scroll-snap-align: start; }
@media (max-width: 640px) { .rail { grid-auto-columns: minmax(78%, 80%); } }

.mosaic { display: grid; gap: var(--gap); grid-template-columns: repeat(6, 1fr); grid-auto-rows: 1fr; }
.mosaic > * { grid-column: span 2; }
.mosaic > *:nth-child(1), .mosaic > *:nth-child(2) { grid-column: span 3; }
@media (max-width: 760px) { .mosaic { grid-template-columns: repeat(2, 1fr); } .mosaic > * { grid-column: span 1 !important; } }

.shot { margin: 0; }
.shot__caption { margin-top: .6rem; font-size: .85rem; color: var(--ink-muted); }
.stack { display: grid; gap: calc(var(--gap) * 2); }
.stack__shot { margin: 0; }

/* ----------------------------------------------------------------- quotes */
.quote-feature { display: grid; gap: var(--gap); grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); align-items: start; }
@media (max-width: 860px) { .quote-feature { grid-template-columns: 1fr; } }
.quote--lead { margin: 0; padding: 2rem; border-radius: var(--radius-lg); background: var(--surface-alt); border: 1px solid var(--border); }
.quote--lead .quote__text { font-family: var(--font-display); font-size: clamp(1.25rem, 2.6vw, 1.9rem); line-height: 1.35; }
.quote-feature__rest { display: grid; gap: 1rem; }
.quote--small { margin: 0; padding: 1.1rem 1.25rem; border-left: 2px solid var(--accent); }
.quote--small blockquote { margin: 0 0 .4rem; font-size: .95rem; }
.quote--chip { margin: 0; width: 320px; padding: 1.25rem; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); }
.quote--chip blockquote { margin: 0 0 .5rem; font-size: .92rem; }

/* ------------------------------------------------------------------ stats */
.stat-band { padding: 2rem 0; border-block: 1px solid var(--border); }
.stat-inline { display: flex; flex-wrap: wrap; gap: 2.5rem; align-items: baseline; }
.stat-inline__item { position: relative; padding-right: 2.5rem; }
.stat-inline__item:not(:last-child)::after { content: ''; position: absolute; right: 0; top: .2rem; bottom: .2rem; width: 1px; background: var(--border); }
.stat-card { text-align: center; }

/* ----------------------------------------------------------------- prices */
.plans { align-items: stretch; }
.plan { display: flex; flex-direction: column; gap: .75rem; }
.plan--feature { border-color: var(--accent); box-shadow: var(--shadow-md); position: relative; }
.plan__flag {
  position: absolute; top: -.75rem; left: 50%; transform: translateX(-50%);
  background: var(--accent); color: var(--accent-ink); font-size: .7rem; letter-spacing: .08em;
  text-transform: uppercase; padding: .25rem .75rem; border-radius: 999px; margin: 0; white-space: nowrap;
}
.ptable { display: grid; }
.ptable__row {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr) auto auto;
  gap: 1.25rem; align-items: center; padding: 1.15rem 0; border-top: 1px solid var(--border);
}
.ptable__row:last-child { border-bottom: 1px solid var(--border); }
.ptable__name { font-family: var(--font-display); font-size: 1.1rem; }
.ptable__price { font-weight: 600; white-space: nowrap; }
@media (max-width: 760px) { .ptable__row { grid-template-columns: minmax(0, 1fr) auto; } .ptable__note { display: none; } }

/* ------------------------------------------------------------- statements */
.statement { max-width: 46rem; margin: 0 auto; text-align: center; }
.statement__text { font-family: var(--font-display); font-size: clamp(1.3rem, 3.2vw, 2.2rem); line-height: 1.35; text-wrap: balance; }
.offset { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); align-items: center; gap: 0; }
.offset__panel {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: clamp(1.5rem, 4vw, 3rem); margin-left: -3rem; position: relative; z-index: 1;
  box-shadow: var(--shadow-md);
}
@media (max-width: 860px) { .offset { grid-template-columns: 1fr; } .offset__panel { margin: -2rem 1rem 0; } }

/* --------------------------------------------------------------- contact */
.contact-stack { display: grid; gap: var(--gap); max-width: 44rem; margin: 0 auto; }
.rows--inline { display: flex; flex-wrap: wrap; gap: 1.5rem; }
.rows--inline .row { border: 0; padding: 0; display: block; }
.inline-rows { display: flex; flex-wrap: wrap; gap: 1.25rem 2rem; justify-content: center; }
.inline-row { display: flex; gap: .5rem; align-items: baseline; }

/* ------------------------------------------------------------------- cta */
.cta-panel {
  background: var(--accent); color: var(--accent-ink);
  border-radius: var(--radius-lg); padding: clamp(2rem, 5vw, 4rem);
}
.cta-panel h2, .cta-panel .lead { color: var(--accent-ink); }
.cta-panel .lead { opacity: .8; }
.cta-panel .btn { background: var(--accent-ink); color: var(--accent); border-color: var(--accent-ink); }
.cta-panel .btn--ghost { background: transparent; color: var(--accent-ink); border-color: color-mix(in srgb, var(--accent-ink) 40%, transparent); }
.cta-full { position: relative; overflow: hidden; background: var(--surface-alt); }
.cta-full::before {
  content: ''; position: absolute; inset: -40% -10% auto; height: 150%; pointer-events: none;
  background: radial-gradient(60rem 30rem at 50% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%);
}
.cta-full .shell { position: relative; }

/* --------------------------------------------------------------- tickers */
.section--flush > .shell { max-width: none; padding-inline: 0; }
.section--flush .section__head { max-width: var(--shell); margin-inline: auto; padding-inline: 1.5rem; }
.ticker { overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); }
.ticker__track { display: flex; gap: 1rem; width: max-content; }
.ticker__item { display: inline-flex; gap: .5rem; align-items: baseline; padding: .8rem 1.4rem; border: 1px solid var(--border); border-radius: 999px; white-space: nowrap; }
${motionCss(motion)}
`;
}

function depthCss(depth: Depth): string {
  if (depth === 'flat') {
    return `.card, .bento__tile { box-shadow: none; }
.card { transition: border-color .2s; }
.card:hover { border-color: color-mix(in srgb, var(--accent) 50%, var(--border)); }`;
  }

  if (depth === 'dimensional') {
    return `.card, .bento__tile, .quote--chip {
  box-shadow: var(--shadow-md);
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  backdrop-filter: blur(10px);
  transition: transform .35s cubic-bezier(.2,.7,.3,1), box-shadow .35s, border-color .2s;
  transform-style: preserve-3d;
}
.card:hover, .bento__tile:hover { box-shadow: var(--shadow-lg); border-color: color-mix(in srgb, var(--accent) 45%, var(--border)); }
/* Set by the script from the pointer position; zero until then, so a page
   with no JavaScript is simply a page with no tilt. */
[data-lumen-tilt] { --tilt-x: 0deg; --tilt-y: 0deg; }
[data-lumen-tilt]:hover { transform: perspective(900px) rotateX(var(--tilt-x)) rotateY(var(--tilt-y)) translateZ(6px); }`;
  }

  return `.card, .bento__tile { box-shadow: var(--shadow-sm); transition: transform .25s, box-shadow .25s, border-color .2s; }
.card:hover, .bento__tile:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }`;
}

function motionCss(motion: Motion): string {
  if (motion === 'none') return '';

  const distance = motion === 'lively' ? '26px' : '14px';
  const duration = motion === 'lively' ? '.7s' : '.5s';

  return `
/* ---------------------------------------------------------------- motion */
/* Applied by the script only once it has run, so a page that never gets its
   JavaScript is fully visible rather than permanently blank. */
[data-lumen-reveal] { opacity: 0; transform: translateY(${distance}); transition: opacity ${duration} ease, transform ${duration} cubic-bezier(.2,.7,.3,1); }
[data-lumen-reveal].is-in { opacity: 1; transform: none; }
${motion === 'lively' ? '.ticker__track { animation: lumen-marquee 38s linear infinite; }\n.ticker:hover .ticker__track { animation-play-state: paused; }\n@keyframes lumen-marquee { to { transform: translateX(-50%); } }' : ''}

@media (prefers-reduced-motion: reduce) {
  [data-lumen-reveal], [data-lumen-reveal].is-in { opacity: 1; transform: none; transition: none; }
  .ticker__track { animation: none; }
  [data-lumen-tilt]:hover { transform: none; }
  .hero--fullbleed .hero__bleed { transform: none; }
  * { scroll-behavior: auto !important; }
}`;
}

/**
 * The script the effects need.
 *
 * Appended to the site's own script file. Three things, each of which degrades
 * to nothing: reveal on scroll, tilt towards the pointer, and count a figure
 * up when it first appears. Every one checks for reduced motion first.
 */
export const PREMIUM_SCRIPT = `
(function () {
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- reveal on scroll ------------------------------------------------ */
  var revealable = document.querySelectorAll('.section > .shell > *, .card, .bento__tile, .numbered__row, .index__row, .timeline__step, .shot');
  if (!calm && 'IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        entries[i].target.classList.add('is-in');
        seen.unobserve(entries[i].target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    for (var i = 0; i < revealable.length; i++) {
      /* The attribute is added here rather than in the markup: if this script
         never runs, nothing was ever hidden in the first place. */
      revealable[i].setAttribute('data-lumen-reveal', '');
      seen.observe(revealable[i]);
    }
  }

  /* ---- tilt towards the pointer ---------------------------------------- */
  if (!calm && window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('mousemove', function (event) {
      var card = event.target.closest ? event.target.closest('[data-lumen-tilt]') : null;
      if (!card) return;
      var box = card.getBoundingClientRect();
      var x = (event.clientX - box.left) / box.width - 0.5;
      var y = (event.clientY - box.top) / box.height - 0.5;
      card.style.setProperty('--tilt-y', (x * 9).toFixed(2) + 'deg');
      card.style.setProperty('--tilt-x', (-y * 9).toFixed(2) + 'deg');
    });
    document.addEventListener('mouseout', function (event) {
      var card = event.target.closest ? event.target.closest('[data-lumen-tilt]') : null;
      if (!card) return;
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
  }

  /* ---- count a figure up ----------------------------------------------- */
  if (!calm && 'IntersectionObserver' in window) {
    var figures = document.querySelectorAll('[data-lumen-count]');
    var counter = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        var node = entries[i].target;
        counter.unobserve(node);

        var text = node.textContent || '';
        var match = text.match(/^([^0-9]*)([0-9][0-9,.]*)(.*)$/);
        if (!match) continue;
        var target = parseFloat(match[2].replace(/,/g, ''));
        if (!isFinite(target) || target <= 0) continue;

        /* Decimals are kept exactly as written: "4.9★" must not land on "5". */
        var decimals = (match[2].split('.')[1] || '').length;
        var started = null;
        var step = function (now) {
          if (started === null) started = now;
          var through = Math.min(1, (now - started) / 900);
          var eased = 1 - Math.pow(1 - through, 3);
          node.textContent = match[1] + (target * eased).toFixed(decimals) + match[3];
          if (through < 1) requestAnimationFrame(step);
          else node.textContent = text;
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.5 });
    for (var f = 0; f < figures.length; f++) counter.observe(figures[f]);
  }

  /* ---- a little parallax on a full-bleed hero -------------------------- */
  var bleed = document.querySelector('.hero__bleed');
  if (!calm && bleed) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var shift = Math.min(60, window.scrollY * 0.12);
        bleed.style.transform = 'scale(1.06) translate3d(0,' + shift + 'px,0)';
        ticking = false;
      });
    }, { passive: true });
  }
})();
`;

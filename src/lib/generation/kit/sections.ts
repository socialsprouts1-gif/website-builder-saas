/**
 * The section catalogue.
 *
 * A section is content plus a kind. The model writes the content as JSON; the
 * HTML is rendered here. That inversion is what makes output consistent: the
 * model never writes markup, so it cannot invent a fourth way to build a card,
 * and a layout fixed here is fixed for every site ever generated.
 *
 * It also makes a section independently replaceable, which is what "redo the
 * hero" needs.
 */

export const SECTION_KINDS = [
  'announcement',
  'hero',
  'about',
  'features',
  'services',
  'steps',
  'gallery',
  'testimonials',
  'stats',
  'pricing',
  'menu',
  'team',
  'faq',
  'hours',
  'contact',
  'cta',
  // Added so a template can describe a whole page rather than seven blocks.
  // A dental site needs certifications and before-and-after; a SaaS site needs
  // the problem stated before the solution and the tools it plugs into. Those
  // are not variations of "features" — they are different things, and squeezing
  // them into cards is exactly what made every generated page look the same.
  'logos',
  'split',
  'beforeafter',
] as const;

export type SectionKind = (typeof SECTION_KINDS)[number];

export interface SectionItem {
  title?: string;
  body?: string;
  meta?: string;
  image?: string;
  href?: string;
}

export interface Section {
  id: string;
  kind: SectionKind;
  heading?: string;
  subheading?: string;
  eyebrow?: string;
  body?: string;
  image?: string;
  items?: SectionItem[];
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  /** Alternating band background, chosen by the assembler not the model. */
  tone?: 'base' | 'surface' | 'alt';
  /**
   * How this kind is arranged, chosen by the template rather than the model.
   *
   * The old two-value `layout` is gone: a hero could be split or centred and
   * nothing else could be anything, which is why every site had the same
   * shape. See `layouts.ts` for what each kind can be.
   */
  layout?: string;
}

import { layoutFor } from './layouts';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Only links we are willing to put in someone's website. A javascript: or
 * data: URL in a generated page is a stored cross-site scripting hole, and the
 * content it came from was written by a language model from a stranger's prompt.
 */
export function safeHref(value: string | undefined): string {
  const text = (value ?? '').trim();
  if (!text) return '#';
  if (/^(https?:\/\/|mailto:|tel:|#|\/|\.\/)/i.test(text)) return escapeHtml(text);
  // A bare page name like "about.html" is fine; anything with a scheme is not.
  if (/^[\w.-]+\.html(#[\w-]+)?$/i.test(text)) return escapeHtml(text);
  return '#';
}

/** Images must be real URLs we put there, never a scheme of the model's choosing. */
function safeSrc(value: string | undefined): string | null {
  const text = (value ?? '').trim();
  if (!text) return null;
  return /^(https?:\/\/|\/)/i.test(text) ? escapeHtml(text) : null;
}

const id = (section: Section, suffix: string) => `${section.id}-${suffix}`;

function heading(section: Section, centred = false): string {
  if (!section.heading) return '';
  const parts: string[] = [];
  if (section.eyebrow) {
    parts.push(`<p class="eyebrow" data-lumen-id="${id(section, 'eyebrow')}">${escapeHtml(section.eyebrow)}</p>`);
  }
  parts.push(`<h2 data-lumen-id="${id(section, 'heading')}">${escapeHtml(section.heading)}</h2>`);
  if (section.subheading) {
    parts.push(`<p class="lead" data-lumen-id="${id(section, 'sub')}">${escapeHtml(section.subheading)}</p>`);
  }
  return `<div class="section__head${centred ? ' section__head--center' : ''}">${parts.join('')}</div>`;
}

function button(cta: Section['primaryCta'], ghost = false): string {
  if (!cta?.label) return '';
  return `<a class="btn${ghost ? ' btn--ghost' : ''}" href="${safeHref(cta.href)}">${escapeHtml(cta.label)}</a>`;
}

function figure(image: string | undefined, alt: string, modifier = ''): string {
  const src = safeSrc(image);
  if (!src) return '';
  return `<div class="media${modifier}"><img src="${src}" alt="${escapeHtml(alt)}" loading="lazy" /></div>`;
}

function toneClass(section: Section): string {
  if (section.tone === 'surface') return ' section--surface';
  if (section.tone === 'alt') return ' section--alt';
  return '';
}

function wrap(section: Section, inner: string, extraClass = ''): string {
  return `<section id="${escapeHtml(section.id)}" class="section${toneClass(section)}${extraClass}" data-section="${section.kind}" data-lumen-id="${escapeHtml(section.id)}">
  <div class="shell">${inner}</div>
</section>`;
}

const items = (section: Section): SectionItem[] => section.items ?? [];

// ------------------------------------------------------------- renderers --

function renderHero(section: Section): string {
  const layout = layoutFor('hero', section.layout);
  const art = safeSrc(section.image);
  // A split or a showcase with no photograph is a column of text beside a
  // hole, so those fall back rather than render empty.
  const shape = (layout === 'split' || layout === 'showcase' || layout === 'fullbleed') && !art ? 'centre' : layout;

  const eyebrow = section.eyebrow
    ? `<p class="eyebrow" data-lumen-id="${id(section, 'eyebrow')}">${escapeHtml(section.eyebrow)}</p>`
    : '';
  const title = `<h1 data-lumen-id="${id(section, 'heading')}">${escapeHtml(section.heading ?? '')}</h1>`;
  const lead = section.subheading
    ? `<p class="lead" data-lumen-id="${id(section, 'sub')}">${escapeHtml(section.subheading)}</p>`
    : '';
  const ctas = `<div class="cluster">${button(section.primaryCta)}${button(section.secondaryCta, true)}</div>`;
  const copy = `<div class="hero__inner">${eyebrow}${title}${lead}${ctas}</div>`;

  const open = (modifier: string, inner: string) =>
    `<section id="${escapeHtml(section.id)}" class="section hero hero--${modifier}" data-section="hero" data-lumen-id="${escapeHtml(section.id)}">
  <div class="shell">${inner}</div>
</section>`;

  if (shape === 'centre') return open('center', copy);

  if (shape === 'editorial') {
    // Type as the subject. The headline runs oversized across the measure and
    // the photograph sits under it as a band, the way a magazine opener does.
    return open(
      'editorial',
      `<div class="hero__editorial">${eyebrow}${title}<div class="hero__editorial-foot">${lead}${ctas}</div></div>${figure(section.image, section.heading ?? 'Photograph', ' media--band')}`,
    );
  }

  if (shape === 'fullbleed') {
    // The photograph is the page; the words sit on it. A scrim keeps the text
    // readable whatever the photograph turns out to be.
    return `<section id="${escapeHtml(section.id)}" class="section hero hero--fullbleed" data-section="hero" data-lumen-id="${escapeHtml(section.id)}">
  <div class="hero__bleed" aria-hidden style="background-image:url('${art}')"></div>
  <div class="hero__scrim" aria-hidden></div>
  <div class="shell hero__over">${copy}</div>
</section>`;
  }

  if (shape === 'showcase') {
    // The product, tilted and floating, with depth behind it.
    return open(
      'showcase',
      `<div class="split split--wide">${copy}<div class="hero__showcase" data-lumen-tilt>${figure(section.image, section.heading ?? 'Photograph', ' media--float')}</div></div>`,
    );
  }

  return open('split', `<div class="split split--wide">${copy}${figure(section.image, section.heading ?? 'Photograph', ' media--tall')}</div>`);
}

function renderAbout(section: Section): string {
  const layout = layoutFor('about', section.layout);
  const body = section.body
    ? `<p data-lumen-id="${id(section, 'body')}">${escapeHtml(section.body)}</p>`
    : '';
  const copy = `<div>${heading(section)}${body}${button(section.primaryCta, true)}</div>`;
  const media = figure(section.image, section.heading ?? 'Photograph');

  if (layout === 'statement' || !media) {
    // One paragraph, set large, with nothing competing. Works when the thing
    // being said is the whole point and there is no photograph worth having.
    return wrap(
      section,
      `<div class="statement">${heading(section, true)}${section.body ? `<p class="statement__text" data-lumen-id="${id(section, 'body')}">${escapeHtml(section.body)}</p>` : ''}<div class="cluster" style="justify-content:center">${button(section.primaryCta, true)}</div></div>`,
      ' section--statement',
    );
  }

  if (layout === 'offset') {
    // The photograph breaks out of the column and overlaps the text block.
    return wrap(section, `<div class="offset">${media}<div class="offset__panel">${heading(section)}${body}${button(section.primaryCta, true)}</div></div>`);
  }

  return wrap(section, `<div class="split">${copy}${media}</div>`);
}

function renderCards(section: Section, columns: 2 | 3 | 4): string {
  const cards = items(section)
    .map(
      (item, index) => `<article class="card" data-lumen-id="${id(section, `card-${index}`)}" data-lumen-tilt>
        ${figure(item.image, item.title ?? '', ' media--wide')}
        <h3 class="card__title">${escapeHtml(item.title ?? '')}</h3>
        ${item.body ? `<p class="muted">${escapeHtml(item.body)}</p>` : ''}
        ${item.meta ? `<p class="card__meta">${escapeHtml(item.meta)}</p>` : ''}
      </article>`,
    )
    .join('');
  return wrap(section, `${heading(section)}<div class="grid grid--${columns}">${cards}</div>`);
}

/**
 * A bento grid: unequal tiles, the first one large.
 *
 * The arrangement carries the hierarchy, so the most important thing is
 * obviously the most important thing without anybody writing "most important"
 * on it.
 */
function renderBento(section: Section): string {
  const tiles = items(section)
    .map(
      (item, index) => `<article class="bento__tile${index === 0 ? ' bento__tile--lead' : ''}" data-lumen-id="${id(section, `card-${index}`)}">
        ${figure(item.image, item.title ?? '', ' media--wide')}
        <h3 class="card__title">${escapeHtml(item.title ?? '')}</h3>
        ${item.body ? `<p class="muted">${escapeHtml(item.body)}</p>` : ''}
        ${item.meta ? `<p class="card__meta">${escapeHtml(item.meta)}</p>` : ''}
      </article>`,
    )
    .join('');
  return wrap(section, `${heading(section)}<div class="bento">${tiles}</div>`);
}

/** Big numerals against the copy — a list that reads as a sequence. */
function renderNumbered(section: Section): string {
  const rows = items(section)
    .map(
      (item, index) => `<article class="numbered__row" data-lumen-id="${id(section, `card-${index}`)}">
        <p class="numbered__index" aria-hidden>${String(index + 1).padStart(2, '0')}</p>
        <div>
          <h3 class="card__title">${escapeHtml(item.title ?? '')}</h3>
          ${item.body ? `<p class="muted">${escapeHtml(item.body)}</p>` : ''}
        </div>
        ${item.meta ? `<span class="row__value">${escapeHtml(item.meta)}</span>` : ''}
      </article>`,
    )
    .join('');
  return wrap(section, `${heading(section)}<div class="numbered">${rows}</div>`);
}

/**
 * A ticker: the items run past, twice over, so the loop has no seam.
 *
 * Paused on hover and stopped entirely for anyone who has asked for less
 * motion — an endlessly moving band is genuinely unpleasant for some people.
 */
function renderTicker(section: Section, className = 'ticker'): string {
  const chips = items(section)
    .map(
      (item, index) => `<span class="${className}__item" data-lumen-id="${id(section, `card-${index}`)}">
        <strong>${escapeHtml(item.title ?? '')}</strong>${item.body ? `<span class="muted"> ${escapeHtml(item.body)}</span>` : ''}
      </span>`,
    )
    .join('');
  return wrap(
    section,
    `${heading(section)}<div class="${className}" data-lumen-ticker><div class="${className}__track">${chips}${chips}</div></div>`,
    ' section--flush',
  );
}

function renderRows(section: Section): string {
  const layout = layoutFor(section.kind, section.layout);
  if (layout === 'cards') return renderCards(section, 3);
  if (layout === 'index') return renderIndex(section);
  if (layout === 'numbered') return renderNumbered(section);
  if (layout === 'inline') return renderInlineRows(section);
  if (layout === 'location') return renderLocation(section);

  const rows = items(section)
    .map(
      (item, index) => `<div class="row" data-lumen-id="${id(section, `row-${index}`)}">
        <div><span class="row__label">${escapeHtml(item.title ?? '')}</span>${item.body ? `<p class="muted">${escapeHtml(item.body)}</p>` : ''}</div>
        ${item.meta ? `<span class="row__value">${escapeHtml(item.meta)}</span>` : ''}
      </div>`,
    )
    .join('');
  return wrap(section, `${heading(section)}<div class="rows">${rows}</div>`);
}

/** Days and times on one wrapped line, for a footer-ish block. */
/**
 * Opening hours beside where the place actually is.
 *
 * "Location / Opening hours" is one question, not two, and splitting it across
 * two sections is how a visitor ends up scrolling back up to check.
 */
function renderLocation(section: Section): string {
  const rows = items(section)
    .map(
      (item, index) => `<div class="row" data-lumen-id="${id(section, `row-${index}`)}">
        <span class="row__label">${escapeHtml(item.title ?? '')}</span>
        ${item.meta ? `<span class="row__value">${escapeHtml(item.meta)}</span>` : ''}
      </div>`,
    )
    .join('');
  const where = section.body
    ? `<div class="split__claim"><p class="lead" data-lumen-id="${id(section, 'body')}">${escapeHtml(section.body)}</p>${button(section.primaryCta)}</div>`
    : '';
  return wrap(section, `${heading(section)}<div class="where">${where}<div class="rows">${rows}</div></div>`);
}

function renderInlineRows(section: Section): string {
  const inline = items(section)
    .map(
      (item, index) => `<span class="inline-row" data-lumen-id="${id(section, `row-${index}`)}">
        <span class="row__label">${escapeHtml(item.title ?? '')}</span>
        ${item.meta ? `<span class="row__value">${escapeHtml(item.meta)}</span>` : ''}
      </span>`,
    )
    .join('');
  return wrap(section, `${heading(section, true)}<div class="inline-rows">${inline}</div>`);
}

/**
 * An index: a numbered table of contents, the way a studio lists its work.
 *
 * Quiet and confident. Suits services that are named rather than sold.
 */
function renderIndex(section: Section): string {
  const rows = items(section)
    .map(
      (item, index) => `<a class="index__row" href="${safeHref(item.href)}" data-lumen-id="${id(section, `row-${index}`)}">
        <span class="index__num" aria-hidden>${String(index + 1).padStart(2, '0')}</span>
        <span class="index__name">${escapeHtml(item.title ?? '')}</span>
        ${item.body ? `<span class="index__note muted">${escapeHtml(item.body)}</span>` : ''}
        ${item.meta ? `<span class="index__meta">${escapeHtml(item.meta)}</span>` : ''}
      </a>`,
    )
    .join('');
  return wrap(section, `${heading(section)}<div class="index">${rows}</div>`);
}

function renderSteps(section: Section): string {
  const layout = layoutFor('steps', section.layout);

  if (layout === 'timeline') {
    const rows = items(section)
      .map(
        (item, index) => `<li class="timeline__step" data-lumen-id="${id(section, `step-${index}`)}">
          <span class="timeline__dot" aria-hidden></span>
          <h3 class="card__title">${escapeHtml(item.title ?? '')}</h3>
          ${item.body ? `<p class="muted">${escapeHtml(item.body)}</p>` : ''}
        </li>`,
      )
      .join('');
    return wrap(section, `${heading(section)}<ol class="timeline">${rows}</ol>`);
  }

  if (layout === 'numbered') return renderNumbered(section);

  const steps = items(section)
    .map(
      (item, index) => `<article class="card" data-lumen-id="${id(section, `step-${index}`)}">
        <p class="stat__value">${index + 1}</p>
        <h3 class="card__title">${escapeHtml(item.title ?? '')}</h3>
        ${item.body ? `<p class="muted">${escapeHtml(item.body)}</p>` : ''}
      </article>`,
    )
    .join('');
  return wrap(section, `${heading(section)}<div class="grid grid--3">${steps}</div>`);
}

function renderGallery(section: Section): string {
  const layout = layoutFor('gallery', section.layout);
  const tile = (item: SectionItem, index: number, modifier = '') => {
    const media = figure(item.image, item.title ?? 'Photograph', modifier);
    if (!media) return '';
    return `<figure class="shot${modifier ? ' shot--lead' : ''}" data-lumen-id="${id(section, `photo-${index}`)}">${media}${item.title ? `<figcaption class="shot__caption">${escapeHtml(item.title)}</figcaption>` : ''}</figure>`;
  };

  const all = items(section);

  if (layout === 'mosaic') {
    // Unequal tiles on a dense grid: the first two large, the rest filling in.
    const tiles = all.map((item, index) => tile(item, index, index < 2 ? ' media--wide' : '')).join('');
    return wrap(section, `${heading(section)}<div class="mosaic">${tiles}</div>`);
  }

  if (layout === 'rail') {
    // A horizontal rail that scrolls, snapping to each photograph. Reads well
    // on a phone, where a three-column grid becomes three tiny squares.
    const tiles = all.map((item, index) => tile(item, index)).join('');
    return wrap(section, `${heading(section)}<div class="rail">${tiles}</div>`, ' section--flush');
  }

  if (layout === 'stack') {
    // Full-width photographs, one under another, each with its caption beside
    // it. The most generous way to show work, and the slowest to scroll.
    const tiles = all
      .map((item, index) => {
        const media = figure(item.image, item.title ?? 'Photograph', ' media--band');
        if (!media) return '';
        return `<figure class="stack__shot" data-lumen-id="${id(section, `photo-${index}`)}">${media}${item.title ? `<figcaption class="shot__caption">${escapeHtml(item.title)}</figcaption>` : ''}</figure>`;
      })
      .join('');
    return wrap(section, `${heading(section)}<div class="stack">${tiles}</div>`);
  }

  if (layout === 'feed') {
    // Square tiles, six across: the social-gallery shape a restaurant or a
    // salon expects near the bottom of the page.
    const tiles = all.map((item, index) => tile(item, index)).join('');
    return wrap(section, `${heading(section)}<div class="feed">${tiles}</div>`);
  }

  const tiles = all.map((item, index) => tile(item, index)).join('');
  return wrap(section, `${heading(section)}<div class="grid grid--3">${tiles}</div>`);
}

function renderTestimonials(section: Section): string {
  const layout = layoutFor('testimonials', section.layout);
  const stars = (meta: string | undefined) =>
    Number(meta) > 0 ? `<p class="stars">${'★'.repeat(Math.min(5, Math.round(Number(meta))))}</p>` : '';

  const all = items(section);

  if (layout === 'feature' && all.length > 0) {
    // One review, set large, with the rest reduced to a line each. A wall of
    // three equal quotes is read as decoration; one is read.
    const [lead, ...rest] = all;
    const others = rest
      .map(
        (item, index) => `<figure class="quote quote--small" data-lumen-id="${id(section, `quote-${index + 1}`)}">
          <blockquote>${escapeHtml(item.body ?? '')}</blockquote>
          <figcaption class="quote__author">${escapeHtml(item.title ?? '')}</figcaption>
        </figure>`,
      )
      .join('');
    return wrap(
      section,
      `${heading(section)}<div class="quote-feature">
        <figure class="quote quote--lead" data-lumen-id="${id(section, 'quote-0')}">
          ${stars(lead.meta)}
          <blockquote class="quote__text">${escapeHtml(lead.body ?? '')}</blockquote>
          <figcaption class="quote__author">${escapeHtml(lead.title ?? '')}</figcaption>
        </figure>
        ${others ? `<div class="quote-feature__rest">${others}</div>` : ''}
      </div>`,
    );
  }

  if (layout === 'ticker') {
    const cards = all
      .map(
        (item, index) => `<figure class="quote quote--chip" data-lumen-id="${id(section, `quote-${index}`)}">
          ${stars(item.meta)}
          <blockquote>${escapeHtml(item.body ?? '')}</blockquote>
          <figcaption class="quote__author">${escapeHtml(item.title ?? '')}</figcaption>
        </figure>`,
      )
      .join('');
    return wrap(
      section,
      `${heading(section)}<div class="ticker" data-lumen-ticker><div class="ticker__track">${cards}${cards}</div></div>`,
      ' section--flush',
    );
  }

  const quotes = all
    .map(
      (item, index) => `<figure class="card quote" data-lumen-id="${id(section, `quote-${index}`)}">
        ${stars(item.meta)}
        <blockquote class="quote__text">${escapeHtml(item.body ?? '')}</blockquote>
        <figcaption class="quote__author">${escapeHtml(item.title ?? '')}</figcaption>
      </figure>`,
    )
    .join('');
  return wrap(section, `${heading(section)}<div class="grid grid--3">${quotes}</div>`);
}

function renderStats(section: Section): string {
  const layout = layoutFor('stats', section.layout);

  // The numeral carries a data attribute so the script can count up to it.
  const stat = (item: SectionItem, index: number, extra = '') =>
    `<div class="${extra}" data-lumen-id="${id(section, `stat-${index}`)}">
      <p class="stat__value" data-lumen-count>${escapeHtml(item.title ?? '')}</p>
      <p class="stat__label">${escapeHtml(item.body ?? '')}</p>
    </div>`;

  const all = items(section);

  if (layout === 'cards') {
    const cards = all.map((item, index) => stat(item, index, 'card stat-card')).join('');
    return wrap(section, `${heading(section)}<div class="grid grid--4">${cards}</div>`);
  }

  if (layout === 'inline') {
    // A single line of figures separated by rules, sitting under a heading
    // rather than in a band of their own.
    const inline = all.map((item, index) => stat(item, index, 'stat-inline__item')).join('');
    return wrap(section, `${heading(section)}<div class="stat-inline">${inline}</div>`);
  }

  const band = all.map((item, index) => stat(item, index)).join('');
  return wrap(section, `${heading(section)}<div class="grid grid--4 stat-band">${band}</div>`);
}

function renderPricing(section: Section): string {
  const layout = layoutFor('pricing', section.layout);
  const all = items(section);

  if (layout === 'table') {
    const rows = all
      .map(
        (item, index) => `<div class="ptable__row" data-lumen-id="${id(section, `plan-${index}`)}">
          <span class="ptable__name">${escapeHtml(item.title ?? '')}</span>
          <span class="ptable__note muted">${escapeHtml(item.body ?? '')}</span>
          <span class="ptable__price">${escapeHtml(item.meta ?? '')}</span>
          <a class="btn btn--ghost" href="${safeHref(item.href)}">Choose</a>
        </div>`,
      )
      .join('');
    return wrap(section, `${heading(section, true)}<div class="ptable">${rows}</div>`);
  }

  // The middle one is the one most people should pick, so it is raised.
  const feature = all.length === 3 ? 1 : -1;
  const plans = all
    .map(
      (item, index) => `<article class="card plan${index === feature ? ' plan--feature' : ''}" data-lumen-id="${id(section, `plan-${index}`)}">
        ${index === feature ? '<p class="plan__flag">Most popular</p>' : ''}
        <h3 class="card__title">${escapeHtml(item.title ?? '')}</h3>
        <p class="stat__value">${escapeHtml(item.meta ?? '')}</p>
        ${item.body ? `<p class="muted">${escapeHtml(item.body)}</p>` : ''}
        <p><a class="btn${index === feature ? '' : ' btn--ghost'}" href="${safeHref(item.href)}">Choose</a></p>
      </article>`,
    )
    .join('');
  return wrap(section, `${heading(section, true)}<div class="grid grid--3 plans">${plans}</div>`);
}

function renderFaq(section: Section): string {
  const entries = items(section)
    .map(
      (item, index) => `<details class="faq" data-lumen-id="${id(section, `faq-${index}`)}">
        <summary>${escapeHtml(item.title ?? '')}</summary>
        <p>${escapeHtml(item.body ?? '')}</p>
      </details>`,
    )
    .join('');
  return wrap(section, `${heading(section)}<div>${entries}</div>`);
}

function renderContact(section: Section): string {
  const layout = layoutFor('contact', section.layout);
  const details = items(section)
    .map(
      (item, index) => `<div class="row" data-lumen-id="${id(section, `detail-${index}`)}">
        <span class="row__label">${escapeHtml(item.title ?? '')}</span>
        <span class="row__value">${item.href ? `<a href="${safeHref(item.href)}">${escapeHtml(item.body ?? '')}</a>` : escapeHtml(item.body ?? '')}</span>
      </div>`,
    )
    .join('');

  const form = `<form class="card" data-lumen-form novalidate>
      <label class="field"><span>Your name</span><input name="name" required autocomplete="name" /></label>
      <label class="field"><span>Phone or email</span><input name="contact" required /></label>
      <label class="field"><span>How can we help?</span><textarea name="message"></textarea></label>
      <button class="btn" type="submit">Send</button>
      <p class="muted" data-lumen-form-status role="status"></p>
    </form>`;

  if (layout === 'stacked') {
    // Details first as a quiet line, then a wide form. Suits a page whose
    // whole job is the form.
    return wrap(
      section,
      `${heading(section, true)}<div class="contact-stack"><div class="rows rows--inline">${details}</div>${form}</div>`,
    );
  }

  return wrap(section, `${heading(section)}<div class="split">${form}<div class="rows">${details}</div></div>`);
}

function renderCta(section: Section): string {
  const layout = layoutFor('cta', section.layout);
  const inner = `<div class="section__head section__head--center">
      <h2 data-lumen-id="${id(section, 'heading')}">${escapeHtml(section.heading ?? '')}</h2>
      ${section.subheading ? `<p class="lead" data-lumen-id="${id(section, 'sub')}">${escapeHtml(section.subheading)}</p>` : ''}
      <div class="cluster" style="justify-content:center">${button(section.primaryCta)}${button(section.secondaryCta, true)}</div>
    </div>`;

  if (layout === 'panel') {
    // A raised slab in the accent colour, sitting inside the page rather than
    // spanning it. Reads as an offer rather than as a footer.
    return wrap(section, `<div class="cta-panel">${inner}</div>`);
  }

  if (layout === 'full') {
    // Edge to edge, with the decorative treatment behind it.
    return `<section id="${escapeHtml(section.id)}" class="section cta-full" data-section="cta" data-lumen-id="${escapeHtml(section.id)}">
  <div class="shell">${inner}</div>
</section>`;
  }

  return wrap(section, inner);
}

/** The card-shaped kinds, which share four arrangements between them. */
function renderPanels(section: Section, columns: 2 | 3 | 4): string {
  const layout = layoutFor(section.kind, section.layout);
  if (layout === 'checks') return renderChecks(section);
  if (layout === 'bento') return renderBento(section);
  if (layout === 'numbered') return renderNumbered(section);
  if (layout === 'ticker') return renderTicker(section);
  if (layout === 'rail') return renderRail(section, columns);
  return renderCards(section, columns);
}

/**
 * A ticked list in two columns.
 *
 * What "why choose us" actually wants to be: eight short reasons somebody can
 * scan in four seconds, rather than three cards padded out to equal length.
 */
function renderChecks(section: Section): string {
  const list = items(section)
    .map(
      (item, index) => `<li data-lumen-id="${id(section, `check-${index}`)}">
        <span class="check__tick" aria-hidden>✓</span>
        <span><span class="row__label">${escapeHtml(item.title ?? '')}</span>${item.body ? `<p class="muted">${escapeHtml(item.body)}</p>` : ''}</span>
      </li>`,
    )
    .join('');
  if (!list) return renderCards(section, 3);
  return wrap(section, `${heading(section)}<ul class="checks">${list}</ul>`);
}

/** Cards on a snapping horizontal rail rather than wrapped into a grid. */
function renderRail(section: Section, columns: 2 | 3 | 4): string {
  const cards = items(section)
    .map(
      (item, index) => `<article class="card rail__card" data-lumen-id="${id(section, `card-${index}`)}">
        ${figure(item.image, item.title ?? '', ' media--wide')}
        <h3 class="card__title">${escapeHtml(item.title ?? '')}</h3>
        ${item.body ? `<p class="muted">${escapeHtml(item.body)}</p>` : ''}
        ${item.meta ? `<p class="card__meta">${escapeHtml(item.meta)}</p>` : ''}
      </article>`,
    )
    .join('');
  if (!cards) return renderCards(section, columns);
  return wrap(section, `${heading(section)}<div class="rail">${cards}</div>`, ' section--flush');
}

/**
 * The slim bar above everything: one line, optionally a link.
 *
 * Not a `<section>` — it sits outside the page's rhythm, carries no heading and
 * must not take a band colour, so it renders its own element.
 */
function renderAnnouncement(section: Section): string {
  const layout = layoutFor('announcement', section.layout);
  const line = section.body ?? section.heading ?? '';
  if (!line) return '';
  const link = section.primaryCta?.label
    ? `<a href="${safeHref(section.primaryCta.href)}">${escapeHtml(section.primaryCta.label)}</a>`
    : '';
  return `<aside class="announce announce--${escapeHtml(layout)}" data-section="announcement" data-lumen-id="${escapeHtml(section.id)}">
  <div class="shell announce__inner"><p data-lumen-id="${id(section, 'body')}">${escapeHtml(line)}</p>${link}</div>
</aside>`;
}

/**
 * The row of names that says somebody else already trusts this.
 *
 * Certifications for a clinic, the tools a SaaS plugs into, the brands a
 * dealership carries. Set as type rather than as images: a generated site has
 * no rights to anybody's logo, and a row of grey rectangles waiting for files
 * that never arrive is worse than a row of names that reads correctly today.
 */
function renderLogos(section: Section): string {
  const layout = layoutFor('logos', section.layout);
  const marks = items(section)
    .map(
      (item, index) => `<li class="mark" data-lumen-id="${id(section, `mark-${index}`)}">
        <span class="mark__name">${escapeHtml(item.title ?? '')}</span>
        ${item.meta ? `<span class="mark__meta">${escapeHtml(item.meta)}</span>` : ''}
      </li>`,
    )
    .join('');
  if (!marks) return '';
  const head = section.heading ? heading(section, layout === 'band') : '';
  return wrap(section, `${head}<ul class="marks marks--${escapeHtml(layout)}">${marks}</ul>`);
}

/**
 * A statement on one side, the points that support it on the other.
 *
 * The most reusable shape on a business site and the one that was missing:
 * why choose us, the problem before the solution, what the technology means,
 * how the insurance works, what the market is doing. Each of those is a claim
 * plus three specifics, and none of them is three identical cards.
 */
function renderSplit(section: Section): string {
  const layout = layoutFor('split', section.layout);
  const points = items(section)
    .map(
      (item, index) => `<li data-lumen-id="${id(section, `point-${index}`)}">
        <h3 class="card__title">${escapeHtml(item.title ?? '')}</h3>
        ${item.body ? `<p class="muted">${escapeHtml(item.body)}</p>` : ''}
      </li>`,
    )
    .join('');

  const claim = `<div class="split__claim">
    ${heading(section)}
    ${section.body ? `<p class="lead" data-lumen-id="${id(section, 'body')}">${escapeHtml(section.body)}</p>` : ''}
    ${button(section.primaryCta)}
  </div>`;

  if (layout === 'media') {
    return wrap(
      section,
      `<div class="split">${claim}${figure(section.image, section.heading ?? '', ' media--tall')}</div>`,
    );
  }

  const list = points ? `<ul class="points points--${escapeHtml(layout)}">${points}</ul>` : '';
  return wrap(section, `<div class="split">${claim}${list}</div>`);
}

/**
 * Paired results: what it was, what it became.
 *
 * The images are attached later, like the gallery's. What the model writes is
 * the pair of captions, which is the part that has to be true.
 */
function renderBeforeAfter(section: Section): string {
  const layout = layoutFor('beforeafter', section.layout);
  const pairs = items(section)
    .map(
      (item, index) => `<figure class="pair" data-lumen-id="${id(section, `pair-${index}`)}">
        <div class="pair__frames">
          <div class="pair__frame">${figure(item.image, `${item.title ?? ''} — before`, ' media--wide') || '<div class="media media--wide"></div>'}<span class="pair__tag">Before</span></div>
          <div class="pair__frame">${figure(item.href, `${item.title ?? ''} — after`, ' media--wide') || '<div class="media media--wide"></div>'}<span class="pair__tag pair__tag--after">After</span></div>
        </div>
        <figcaption>
          <h3 class="card__title">${escapeHtml(item.title ?? '')}</h3>
          ${item.body ? `<p class="muted">${escapeHtml(item.body)}</p>` : ''}
          ${item.meta ? `<p class="card__meta">${escapeHtml(item.meta)}</p>` : ''}
        </figcaption>
      </figure>`,
    )
    .join('');
  if (!pairs) return '';
  return wrap(section, `${heading(section)}<div class="pairs pairs--${escapeHtml(layout)}">${pairs}</div>`);
}

const RENDERERS: Record<SectionKind, (section: Section) => string> = {
  announcement: renderAnnouncement,
  logos: renderLogos,
  split: renderSplit,
  beforeafter: renderBeforeAfter,
  hero: renderHero,
  about: renderAbout,
  features: (section) => renderPanels(section, 3),
  services: renderRows,
  steps: renderSteps,
  gallery: renderGallery,
  testimonials: renderTestimonials,
  stats: renderStats,
  pricing: renderPricing,
  menu: renderRows,
  team: (section) => renderPanels(section, 4),
  faq: renderFaq,
  hours: renderRows,
  contact: renderContact,
  cta: renderCta,
};

export function renderSection(section: Section): string {
  return (RENDERERS[section.kind] ?? renderCards.bind(null, section, 3))(section);
}

export const isSectionKind = (value: unknown): value is SectionKind =>
  typeof value === 'string' && (SECTION_KINDS as readonly string[]).includes(value);

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
  layout?: 'split' | 'center';
}

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
  const centred = section.layout === 'center' || !safeSrc(section.image);
  const copy = `<div class="hero__inner">
      ${section.eyebrow ? `<p class="eyebrow" data-lumen-id="${id(section, 'eyebrow')}">${escapeHtml(section.eyebrow)}</p>` : ''}
      <h1 data-lumen-id="${id(section, 'heading')}">${escapeHtml(section.heading ?? '')}</h1>
      ${section.subheading ? `<p class="lead" data-lumen-id="${id(section, 'sub')}">${escapeHtml(section.subheading)}</p>` : ''}
      <div class="cluster">${button(section.primaryCta)}${button(section.secondaryCta, true)}</div>
    </div>`;

  const inner = centred
    ? copy
    : `<div class="split split--wide">${copy}${figure(section.image, section.heading ?? 'Photograph', ' media--tall')}</div>`;

  return `<section id="${escapeHtml(section.id)}" class="section hero${centred ? ' hero--center' : ''}" data-section="hero" data-lumen-id="${escapeHtml(section.id)}">
  <div class="shell">${inner}</div>
</section>`;
}

function renderAbout(section: Section): string {
  const copy = `<div>${heading(section)}${section.body ? `<p data-lumen-id="${id(section, 'body')}">${escapeHtml(section.body)}</p>` : ''}${button(section.primaryCta, true)}</div>`;
  const media = figure(section.image, section.heading ?? 'Photograph');
  return wrap(section, media ? `<div class="split">${copy}${media}</div>` : copy);
}

function renderCards(section: Section, columns: 2 | 3 | 4): string {
  const cards = items(section)
    .map(
      (item, index) => `<article class="card" data-lumen-id="${id(section, `card-${index}`)}">
        ${figure(item.image, item.title ?? '', ' media--wide')}
        <h3 class="card__title">${escapeHtml(item.title ?? '')}</h3>
        ${item.body ? `<p class="muted">${escapeHtml(item.body)}</p>` : ''}
        ${item.meta ? `<p class="card__meta">${escapeHtml(item.meta)}</p>` : ''}
      </article>`,
    )
    .join('');
  return wrap(section, `${heading(section)}<div class="grid grid--${columns}">${cards}</div>`);
}

function renderRows(section: Section): string {
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

function renderSteps(section: Section): string {
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
  const tiles = items(section)
    .map((item, index) => {
      const media = figure(item.image, item.title ?? 'Photograph');
      return media ? `<div data-lumen-id="${id(section, `photo-${index}`)}">${media}</div>` : '';
    })
    .join('');
  return wrap(section, `${heading(section)}<div class="grid grid--3">${tiles}</div>`);
}

function renderTestimonials(section: Section): string {
  const quotes = items(section)
    .map((item, index) => {
      const stars = Number(item.meta) > 0 ? '★'.repeat(Math.min(5, Math.round(Number(item.meta)))) : '';
      return `<figure class="card quote" data-lumen-id="${id(section, `quote-${index}`)}">
        ${stars ? `<p class="stars">${stars}</p>` : ''}
        <blockquote class="quote__text">${escapeHtml(item.body ?? '')}</blockquote>
        <figcaption class="quote__author">${escapeHtml(item.title ?? '')}</figcaption>
      </figure>`;
    })
    .join('');
  return wrap(section, `${heading(section)}<div class="grid grid--3">${quotes}</div>`);
}

function renderStats(section: Section): string {
  const stats = items(section)
    .map(
      (item, index) => `<div data-lumen-id="${id(section, `stat-${index}`)}">
        <p class="stat__value">${escapeHtml(item.title ?? '')}</p>
        <p class="stat__label">${escapeHtml(item.body ?? '')}</p>
      </div>`,
    )
    .join('');
  return wrap(section, `${heading(section)}<div class="grid grid--4">${stats}</div>`);
}

function renderPricing(section: Section): string {
  const plans = items(section)
    .map(
      (item, index) => `<article class="card" data-lumen-id="${id(section, `plan-${index}`)}">
        <h3 class="card__title">${escapeHtml(item.title ?? '')}</h3>
        <p class="stat__value">${escapeHtml(item.meta ?? '')}</p>
        ${item.body ? `<p class="muted">${escapeHtml(item.body)}</p>` : ''}
        <p><a class="btn btn--ghost" href="${safeHref(item.href)}">Choose</a></p>
      </article>`,
    )
    .join('');
  return wrap(section, `${heading(section, true)}<div class="grid grid--3">${plans}</div>`);
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

  return wrap(section, `${heading(section)}<div class="split">${form}<div class="rows">${details}</div></div>`);
}

function renderCta(section: Section): string {
  const inner = `<div class="section__head section__head--center">
      <h2 data-lumen-id="${id(section, 'heading')}">${escapeHtml(section.heading ?? '')}</h2>
      ${section.subheading ? `<p class="lead" data-lumen-id="${id(section, 'sub')}">${escapeHtml(section.subheading)}</p>` : ''}
      <div class="cluster" style="justify-content:center">${button(section.primaryCta)}${button(section.secondaryCta, true)}</div>
    </div>`;
  return wrap(section, inner);
}

const RENDERERS: Record<SectionKind, (section: Section) => string> = {
  hero: renderHero,
  about: renderAbout,
  features: (section) => renderCards(section, 3),
  services: renderRows,
  steps: renderSteps,
  gallery: renderGallery,
  testimonials: renderTestimonials,
  stats: renderStats,
  pricing: renderPricing,
  menu: renderRows,
  team: (section) => renderCards(section, 4),
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

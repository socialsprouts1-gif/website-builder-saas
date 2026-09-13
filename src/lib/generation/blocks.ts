import 'server-only';

/**
 * The sections the editor can add to a page.
 *
 * The client sends a block id and, where the block needs one, an uploaded image
 * URL or a video link — never markup. Anything a browser could put in the body
 * of an edit request ends up inside the user's published site, so the HTML
 * originates here.
 *
 * Every block styles itself from the site's own tokens with the older names as
 * fallbacks, so a section added to a site generated last month looks like the
 * rest of it rather than like a default browser stylesheet.
 */

/** Current token, older token, last-resort literal — in that order. */
const INK = 'var(--ink, var(--color-text, #15150f))';
const MUTED = 'var(--ink-muted, var(--color-text-muted, #6a6a60))';
const SURFACE = 'var(--surface, var(--color-surface, #ffffff))';
const BAND = 'var(--surface-alt, var(--color-surface-alt, #f4f3ee))';
const LINE = 'var(--border, var(--color-border, rgba(0,0,0,.12)))';
const ACCENT = 'var(--accent, var(--color-accent, #15150f))';
const ON_ACCENT = 'var(--accent-ink, var(--color-accent-contrast, #ffffff))';
const PAD = 'var(--section-y, var(--space-lg, 5rem))';
const RADIUS = 'var(--radius, 14px)';
const DISPLAY = 'var(--font-display, inherit)';

/** What the editor must collect before it can insert this block. */
export type BlockNeeds = 'image' | 'video' | null;

export interface BlockOptions {
  imageUrl?: string;
  videoUrl?: string;
  /**
   * Supplied by the editor so the section it previewed and the section it saves
   * carry identical element ids. Without it the server rolled a new one on each
   * render and the preview was a different section from the one that landed.
   */
  uid?: string;
}

export interface BlockDefinition {
  id: string;
  name: string;
  description: string;
  /** Grouping in the add-section list, the way a theme editor groups them. */
  group: 'Text' | 'Media' | 'Layout' | 'Action';
  needs: BlockNeeds;
  html: (uid: string, options: BlockOptions) => string;
}

const wrap = (uid: string, inner: string, band = false) =>
  `<section data-lumen-id="block-${uid}" style="padding: ${PAD} 1.5rem;${
    band ? ` background: ${BAND};` : ''
  }">${inner}</section>`;

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23e8e6df'/%3E%3Cpath d='M300 380l70-90 60 70 45-50 85 110H300z' fill='%23c9c6bb'/%3E%3Ccircle cx='330' cy='250' r='34' fill='%23c9c6bb'/%3E%3C/svg%3E";

function escapeAttribute(value: string): string {
  return value.replace(/[&"<>]/g, (character) =>
    ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[character] as string,
  );
}

/**
 * A video URL turned into something safe to frame.
 *
 * Only YouTube and Vimeo, only their embed hosts, only an id we recognised
 * ourselves. A raw URL from the browser is never written into a src.
 */
export function embedUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  const host = url.hostname.replace(/^www\./, '');
  const id = (value: string | null) => (value && /^[\w-]{6,20}$/.test(value) ? value : null);

  if (host === 'youtu.be') {
    const key = id(url.pathname.slice(1));
    return key ? `https://www.youtube-nocookie.com/embed/${key}` : null;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const key = id(url.searchParams.get('v')) ?? id(url.pathname.replace(/^\/(embed|shorts)\//, ''));
    return key ? `https://www.youtube-nocookie.com/embed/${key}` : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const key = /(\d{6,12})/.exec(url.pathname)?.[1];
    return key ? `https://player.vimeo.com/video/${key}` : null;
  }
  return null;
}

const heading = (uid: string, text: string, extra = '') =>
  `<h2 data-lumen-id="block-${uid}-title" style="font-family: ${DISPLAY}; font-size: clamp(1.8rem, 3.4vw, 2.6rem); line-height: 1.12; color: ${INK}; margin: 0 0 1rem;${extra}">${text}</h2>`;

const body = (uid: string, text: string, suffix = 'body') =>
  `<p data-lumen-id="block-${uid}-${suffix}" style="color: ${MUTED}; line-height: 1.7; margin: 0; font-size: 1.05rem;">${text}</p>`;

export const BLOCKS: BlockDefinition[] = [
  {
    id: 'text',
    name: 'Heading and text',
    description: 'A title with a paragraph under it.',
    group: 'Text',
    needs: null,
    html: (uid) =>
      wrap(
        uid,
        `<div style="max-width: 42rem; margin: 0 auto; text-align: center;">
  ${heading(uid, 'A new section')}
  ${body(uid, 'Click this text to change it, or select it and edit it in the panel on the right.')}
</div>`,
      ),
  },
  {
    id: 'paragraph',
    name: 'Paragraph',
    description: 'Just a block of writing.',
    group: 'Text',
    needs: null,
    html: (uid) =>
      wrap(
        uid,
        `<div style="max-width: 38rem; margin: 0 auto;">
  ${body(uid, 'Write what you want people to know here. Keep it to a few sentences — a short paragraph gets read, a long one gets skipped.')}
</div>`,
      ),
  },
  {
    id: 'quote',
    name: 'Quote',
    description: 'Something a customer said.',
    group: 'Text',
    needs: null,
    html: (uid) =>
      wrap(
        uid,
        `<figure style="max-width: 44rem; margin: 0 auto; text-align: center;">
  <blockquote data-lumen-id="block-${uid}-quote" style="font-family: ${DISPLAY}; font-size: clamp(1.3rem, 2.6vw, 1.9rem); line-height: 1.4; color: ${INK}; margin: 0 0 1rem;">“They turned up when they said they would, and the work was spotless.”</blockquote>
  <figcaption data-lumen-id="block-${uid}-cite" style="color: ${MUTED}; font-size: .95rem;">A happy customer</figcaption>
</figure>`,
        true,
      ),
  },
  {
    id: 'image',
    name: 'Image',
    description: 'One picture, full width.',
    group: 'Media',
    needs: 'image',
    html: (uid, options) =>
      wrap(
        uid,
        `<figure style="max-width: 68rem; margin: 0 auto;">
  <img data-lumen-id="block-${uid}-image" src="${escapeAttribute(options.imageUrl || PLACEHOLDER)}" alt="" style="width: 100%; height: auto; display: block; border-radius: ${RADIUS};" />
  <figcaption data-lumen-id="block-${uid}-caption" style="color: ${MUTED}; font-size: .9rem; margin-top: .75rem; text-align: center;">Add a caption, or delete this line.</figcaption>
</figure>`,
      ),
  },
  {
    id: 'image-text',
    name: 'Image with text',
    description: 'A picture beside a block of copy.',
    group: 'Media',
    needs: 'image',
    html: (uid, options) =>
      wrap(
        uid,
        `<div style="max-width: 68rem; margin: 0 auto; display: grid; gap: 3rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); align-items: center;">
  <img data-lumen-id="block-${uid}-image" src="${escapeAttribute(options.imageUrl || PLACEHOLDER)}" alt="" style="width: 100%; height: auto; border-radius: ${RADIUS};" />
  <div>
    ${heading(uid, 'Tell them about it')}
    ${body(uid, 'Select the picture to swap it for one of your own.')}
  </div>
</div>`,
      ),
  },
  {
    id: 'gallery',
    name: 'Gallery',
    description: 'Three pictures in a row.',
    group: 'Media',
    needs: 'image',
    html: (uid, options) =>
      wrap(
        uid,
        `<div style="max-width: 68rem; margin: 0 auto; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
  ${[1, 2, 3]
    .map(
      (n) =>
        `<img data-lumen-id="block-${uid}-image${n}" src="${escapeAttribute(options.imageUrl || PLACEHOLDER)}" alt="" style="width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: ${RADIUS};" />`,
    )
    .join('\n  ')}
</div>`,
      ),
  },
  {
    id: 'video',
    name: 'Video',
    description: 'A YouTube or Vimeo clip.',
    group: 'Media',
    needs: 'video',
    html: (uid, options) => {
      const src = options.videoUrl ? embedUrl(options.videoUrl) : null;
      const frame = src
        ? `<iframe data-lumen-id="block-${uid}-video" src="${escapeAttribute(src)}" title="Video" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen style="width: 100%; aspect-ratio: 16/9; border: 0; border-radius: ${RADIUS}; display: block;"></iframe>`
        : `<div data-lumen-id="block-${uid}-video" style="width: 100%; aspect-ratio: 16/9; border-radius: ${RADIUS}; background: ${BAND}; border: 1px solid ${LINE}; display: grid; place-items: center; color: ${MUTED};">Paste a YouTube or Vimeo link to fill this</div>`;
      return wrap(uid, `<div style="max-width: 60rem; margin: 0 auto;">${frame}</div>`);
    },
  },
  {
    id: 'cards',
    name: 'Three columns',
    description: 'A row of three points.',
    group: 'Layout',
    needs: null,
    html: (uid) =>
      wrap(
        uid,
        `<div style="max-width: 68rem; margin: 0 auto; display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));">
  ${[1, 2, 3]
    .map(
      (n) => `<div data-lumen-id="block-${uid}-card${n}" style="background: ${SURFACE}; border: 1px solid ${LINE}; border-radius: ${RADIUS}; padding: 1.75rem;">
    <h3 data-lumen-id="block-${uid}-card${n}-title" style="font-family: ${DISPLAY}; color: ${INK}; margin: 0 0 .5rem;">Point ${n}</h3>
    <p data-lumen-id="block-${uid}-card${n}-body" style="color: ${MUTED}; line-height: 1.65; margin: 0;">Say something specific here.</p>
  </div>`,
    )
    .join('\n  ')}
</div>`,
      ),
  },
  {
    id: 'stats',
    name: 'Numbers',
    description: 'Three figures worth boasting about.',
    group: 'Layout',
    needs: null,
    html: (uid) =>
      wrap(
        uid,
        `<div style="max-width: 60rem; margin: 0 auto; display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); text-align: center;">
  ${[
    ['12', 'Years open'],
    ['4.9', 'Average rating'],
    ['30k', 'Happy customers'],
  ]
    .map(
      ([value, label], index) => `<div data-lumen-id="block-${uid}-stat${index + 1}">
    <p data-lumen-id="block-${uid}-stat${index + 1}-value" style="font-family: ${DISPLAY}; font-size: 3rem; color: ${ACCENT}; margin: 0;">${value}</p>
    <p data-lumen-id="block-${uid}-stat${index + 1}-label" style="color: ${MUTED}; margin: .25rem 0 0;">${label}</p>
  </div>`,
    )
    .join('\n  ')}
</div>`,
        true,
      ),
  },
  {
    id: 'cta',
    name: 'Button banner',
    description: 'One line and a button.',
    group: 'Action',
    needs: null,
    html: (uid) =>
      `<section data-lumen-id="block-${uid}" style="padding: ${PAD} 1.5rem; background: ${BAND}; text-align: center;">
  ${heading(uid, 'Ready when you are')}
  ${body(uid, 'One line that gets them to act.')}
  <a data-lumen-id="block-${uid}-button" href="contact.html" style="display: inline-block; margin-top: 1.75rem; background: ${ACCENT}; color: ${ON_ACCENT}; padding: .9rem 1.75rem; border-radius: 999px; text-decoration: none; font-weight: 600;">Get in touch</a>
</section>`,
  },
];

const UID = /^[a-z0-9]{4,12}$/;

export function renderBlock(blockId: string, options: BlockOptions = {}): string | null {
  const block = BLOCKS.find((candidate) => candidate.id === blockId);
  if (!block) return null;
  const uid = options.uid && UID.test(options.uid) ? options.uid : Math.random().toString(36).slice(2, 8);
  return block.html(uid, options);
}

/** Safe to hand to the client — no markup, just the menu. */
export const BLOCK_MENU = BLOCKS.map(({ id, name, description, group, needs }) => ({
  id,
  name,
  description,
  group,
  needs,
}));

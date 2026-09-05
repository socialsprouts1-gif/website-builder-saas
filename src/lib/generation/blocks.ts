import 'server-only';

/**
 * The blocks the editor can insert.
 *
 * The client sends a block id, never markup: anything a browser could put in
 * the body of an edit request ends up inside the user's published site, so the
 * HTML has to originate here. Each block styles itself from the project's
 * design tokens, so an inserted section matches whatever palette the site was
 * generated with.
 */

export interface BlockDefinition {
  id: string;
  name: string;
  description: string;
  html: (uid: string) => string;
}

const wrap = (uid: string, inner: string) =>
  `<section data-lumen-id="block-${uid}" style="padding: var(--space-lg, 5rem) 1.5rem;">${inner}</section>`;

export const BLOCKS: BlockDefinition[] = [
  {
    id: 'heading',
    name: 'Heading + text',
    description: 'A title with a paragraph under it.',
    html: (uid) =>
      wrap(
        uid,
        `<div style="max-width: 42rem; margin: 0 auto; text-align: center;">
  <h2 data-lumen-id="block-${uid}-title" style="font-family: var(--font-display); font-size: var(--size-h2, 2.25rem); color: var(--color-text); margin: 0 0 1rem;">A new section</h2>
  <p data-lumen-id="block-${uid}-body" style="color: var(--color-text-muted); line-height: 1.7; margin: 0;">Double-click the text to change it, or select it and edit in the panel on the right.</p>
</div>`,
      ),
  },
  {
    id: 'cards',
    name: 'Three cards',
    description: 'A row of three feature cards.',
    html: (uid) =>
      wrap(
        uid,
        `<div style="max-width: 68rem; margin: 0 auto; display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));">
  ${[1, 2, 3]
    .map(
      (n) => `<div data-lumen-id="block-${uid}-card${n}" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius, 14px); padding: 1.75rem; box-shadow: var(--shadow-md);">
    <h3 data-lumen-id="block-${uid}-card${n}-title" style="font-family: var(--font-display); color: var(--color-text); margin: 0 0 .5rem;">Card ${n}</h3>
    <p data-lumen-id="block-${uid}-card${n}-body" style="color: var(--color-text-muted); line-height: 1.65; margin: 0;">Say something specific here.</p>
  </div>`,
    )
    .join('\n  ')}
</div>`,
      ),
  },
  {
    id: 'image-text',
    name: 'Image + text',
    description: 'A picture beside a block of copy.',
    html: (uid) =>
      wrap(
        uid,
        `<div style="max-width: 68rem; margin: 0 auto; display: grid; gap: 3rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); align-items: center;">
  <img data-lumen-id="block-${uid}-image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23d7ff3e' stop-opacity='.35'/%3E%3Cstop offset='1' stop-color='%23c46026' stop-opacity='.25'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='600' fill='url(%23g)'/%3E%3C/svg%3E" alt="Replace this image" width="800" height="600" style="width: 100%; height: auto; border-radius: var(--radius, 14px);" />
  <div>
    <h2 data-lumen-id="block-${uid}-title" style="font-family: var(--font-display); font-size: var(--size-h2, 2.25rem); color: var(--color-text); margin: 0 0 1rem;">Tell them about it</h2>
    <p data-lumen-id="block-${uid}-body" style="color: var(--color-text-muted); line-height: 1.7; margin: 0;">Select the image and upload your own from the panel on the right.</p>
  </div>
</div>`,
      ),
  },
  {
    id: 'cta',
    name: 'Call to action',
    description: 'A band with a button.',
    html: (uid) =>
      `<section data-lumen-id="block-${uid}" style="padding: var(--space-lg, 5rem) 1.5rem; background: var(--color-surface-alt, var(--color-surface)); text-align: center;">
  <h2 data-lumen-id="block-${uid}-title" style="font-family: var(--font-display); font-size: var(--size-h2, 2.25rem); color: var(--color-text); margin: 0 0 1rem;">Ready when you are</h2>
  <p data-lumen-id="block-${uid}-body" style="color: var(--color-text-muted); margin: 0 0 1.75rem;">One line that gets them to act.</p>
  <a data-lumen-id="block-${uid}-button" href="#" style="display: inline-block; background: var(--color-accent); color: var(--color-accent-contrast); padding: .9rem 1.75rem; border-radius: 999px; text-decoration: none; font-weight: 600;">Get in touch</a>
</section>`,
  },
  {
    id: 'stats',
    name: 'Stats row',
    description: 'Three big numbers.',
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
    <p data-lumen-id="block-${uid}-stat${index + 1}-value" style="font-family: var(--font-display); font-size: 3rem; color: var(--color-accent); margin: 0;">${value}</p>
    <p data-lumen-id="block-${uid}-stat${index + 1}-label" style="color: var(--color-text-muted); margin: .25rem 0 0;">${label}</p>
  </div>`,
    )
    .join('\n  ')}
</div>`,
      ),
  },
];

export function renderBlock(blockId: string): string | null {
  const block = BLOCKS.find((candidate) => candidate.id === blockId);
  if (!block) return null;
  return block.html(Math.random().toString(36).slice(2, 8));
}

/** Safe to hand to the client — no markup, just the menu. */
export const BLOCK_MENU = BLOCKS.map(({ id, name, description }) => ({ id, name, description }));

import { describe, expect, it } from 'vitest';
import { LAYOUTS } from './layouts';
import { renderSection, type Section } from './sections';
import { renderStylesheet } from './stylesheet';
import { FALLBACK_TOKENS } from './tokens';
import { templateById } from './templates';
import { SECTION_BRIEF } from './prompts';

/**
 * Four things a small business has that the kit could not hold.
 *
 * A video it had already let people upload and then had nowhere to put. An
 * address, which is the whole of what a local shop's website is for. The
 * years, which are what a family business has and a competitor cannot copy.
 * And the festival offer, which was being written into a heading because
 * there was no other place for a code and a date.
 */

const section = (over: Partial<Section>): Section => ({ id: 's1', kind: 'split', ...over }) as Section;
const css = renderStylesheet(FALLBACK_TOKENS, templateById('kiln'));

const VIDEO = 'https://zz.supabase.co/storage/v1/object/public/assets/p/clip.mp4';
const POSTER = 'https://zz.supabase.co/storage/v1/object/public/assets/p/still.jpg';

describe('a video section', () => {
  const full = section({
    kind: 'video',
    heading: 'Inside the workshop',
    body: 'Two minutes of the cutting table, start to finish.',
    items: [{ title: 'Workshop', href: VIDEO, image: POSTER }],
  });

  it('plays the file that was uploaded, with its poster', () => {
    const html = renderSection(full);
    expect(html).toContain(`src="${VIDEO}"`);
    expect(html).toContain(`poster="${POSTER}"`);
    expect(html).toContain('<video');
  });

  /** Autoplaying sound on a shop's home page is why people close the tab. */
  it('does not play by itself, and shows controls', () => {
    const html = renderSection(full);
    expect(html).toContain('controls');
    expect(html).not.toContain('autoplay');
  });

  it('is muted when it is a showreel, which is the only autoplay allowed', () => {
    const html = renderSection({ ...full, layout: 'showreel' } as Section);
    expect(html).toContain('autoplay');
    expect(html).toContain('muted');
  });

  /** iOS plays a video full-screen without this, over whatever was on screen. */
  it('plays inline on a phone', () => {
    expect(renderSection(full)).toContain('playsinline');
  });

  /**
   * Nothing uploaded yet. The frame holds its shape rather than collapsing,
   * so the page does not jump by 400px the day a file arrives — and the
   * editor knows media--empty is a slot to fill.
   */
  it('holds an empty frame until there is a file', () => {
    const html = renderSection(section({ kind: 'video', heading: 'Inside the workshop' }));
    expect(html).toContain('media--empty');
    expect(html).not.toContain('<video');
  });

  it('refuses a source that is not a real address', () => {
    const html = renderSection(
      section({ kind: 'video', heading: 'x', items: [{ href: 'javascript:alert(1)' }] }),
    );
    expect(html).not.toContain('javascript:');
    expect(html).toContain('media--empty');
  });

  /**
   * Found by rendering it. A frame with no fixed shape is one height while
   * the file loads and another once it has — on a slow connection that is
   * the page moving under somebody's thumb as they reach for a button.
   */
  it('keeps its proportions before the file has loaded', () => {
    expect(css).toMatch(/\.video__frame,\s*\.video__frame video\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/);
  });
});

describe('a map section', () => {
  const address = '24 Chapel Road, Bandra West, Mumbai 400050';
  const full = section({
    kind: 'map',
    heading: 'Find us',
    body: address,
    items: [{ title: 'Landmark', body: 'Opposite the Catholic church.' }],
  });

  it('shows the address and a directions link that carries it', () => {
    const html = renderSection(full);
    expect(html).toContain('24 Chapel Road');
    expect(html).toContain('google.com/maps/search/');
    expect(html).toContain(encodeURIComponent(address));
  });

  /**
   * A published site runs with nothing framed, so an embedded map would be
   * blocked and leave a white rectangle. A link opens the maps app the person
   * already has, which is better anyway.
   */
  it('embeds no frame', () => {
    expect(renderSection(full)).not.toContain('<iframe');
  });

  it('opens the link away from the site, without handing it the referrer', () => {
    const html = renderSection(full);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
  });

  it('leaves out the button rather than linking to an empty search', () => {
    const html = renderSection(section({ kind: 'map', heading: 'Find us' }));
    expect(html).not.toContain('google.com/maps');
  });

  it('shows the notes that help somebody arrive', () => {
    expect(renderSection(full)).toContain('Opposite the Catholic church.');
  });
});

describe('a story section', () => {
  const full = section({
    kind: 'story',
    heading: 'Since 1978',
    items: [
      { meta: '1978', title: 'The first shop', body: 'Two looms on Laxmi Road.' },
      { meta: '2004', title: 'The move to Pune', body: 'Twelve weavers by then.' },
    ],
  });

  it('keeps the years with what happened in them', () => {
    const html = renderSection(full);
    expect(html).toContain('1978');
    expect(html).toContain('The first shop');
    expect(html).toContain('2004');
  });

  /** It is a sequence, so it is a numbered list in the markup as well. */
  it('is an ordered list', () => {
    expect(renderSection(full)).toContain('<ol');
  });

  /**
   * A business whose brief gives no dates gets no timeline. Rendering the
   * heading over nothing is the hole in the page this kind exists to avoid.
   */
  it('renders nothing at all when there is no history', () => {
    expect(renderSection(section({ kind: 'story', heading: 'Since 1978' }))).toBe('');
  });
});

describe('an offers section', () => {
  const full = section({
    kind: 'offers',
    heading: 'This Diwali',
    items: [{ title: '20% off all stitching', body: 'On orders above ₹2,000.', meta: 'Until 15 November' }],
  });

  it('shows the offer, its condition and when it ends', () => {
    const html = renderSection(full);
    expect(html).toContain('20% off all stitching');
    expect(html).toContain('₹2,000');
    expect(html).toContain('Until 15 November');
  });

  /** The code is the part people photograph, so a 0 must not read as an O. */
  it('sets the code in a monospaced face', () => {
    expect(css).toMatch(/\.offer__code\s*\{[^}]*font-family:\s*ui-monospace/);
  });

  it('renders nothing when there is no offer running', () => {
    expect(renderSection(section({ kind: 'offers', heading: 'This Diwali' }))).toBe('');
  });
});

describe('every new kind is wired all the way through', () => {
  const added = ['video', 'map', 'story', 'offers'] as const;

  it.each(added.map((kind) => [kind]))('%s has layouts', (kind) => {
    expect((LAYOUTS as Record<string, readonly string[]>)[kind].length).toBeGreaterThan(0);
  });

  /** A kind the model is never told how to fill comes back empty every time. */
  it.each(added.map((kind) => [kind]))('%s tells the model what to write', (kind) => {
    expect(SECTION_BRIEF[kind].length).toBeGreaterThan(80);
  });

  it.each(added.map((kind) => [kind]))('%s has styling of its own', (kind) => {
    const marker = { video: '.video__frame', map: '.where__panel', story: '.story__point', offers: '.offer__code' }[
      kind
    ];
    expect(css).toContain(marker);
  });

  /**
   * An invented class renders as nothing, which is how a section goes blank
   * on a live site while looking perfectly reasonable in the source. Checked
   * for every layout, not only the default: a layout nobody styled is a
   * template option that quietly does nothing.
   */
  it.each(
    added.flatMap((kind) =>
      (LAYOUTS as Record<string, readonly string[]>)[kind].map((layout) => [kind, layout] as const),
    ),
  )(
    '%s in its %s layout only uses classes the stylesheet has',
    (kind, layout) => {
      const html = renderSection(
        section({
          kind,
          layout: layout as Section['layout'],
          heading: 'x',
          body: 'y',
          items: [{ title: 'a', body: 'b', meta: 'c', href: VIDEO, image: POSTER }],
        }) as Section,
      );
      for (const match of html.matchAll(/class="([^"]+)"/g)) {
        for (const name of match[1].split(/\s+/).filter(Boolean)) {
          expect(css.includes(`.${name}`), `${kind}/${layout}: .${name} is in no stylesheet`).toBe(true);
        }
      }
    },
  );
});

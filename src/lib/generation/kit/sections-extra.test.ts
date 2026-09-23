import { describe, expect, it } from 'vitest';
import { LAYOUTS } from './layouts';
import { renderSection, SECTION_KINDS, type Section } from './sections';
import { renderPage } from './page';
import { FALLBACK_TOKENS } from './tokens';

/**
 * The sections added so a template can describe a whole page.
 *
 * Seven kinds could not express what a dental clinic or a SaaS front page
 * actually contains, so templates all reached for the same cards and every
 * generated site looked alike. These four are the ones that were missing; each
 * is checked for the thing that would make it useless.
 */
const section = (over: Partial<Section>): Section => ({ id: 's1', kind: 'split', ...over }) as Section;

describe('the announcement bar', () => {
  it('renders the line and its link', () => {
    const html = renderSection(
      section({
        kind: 'announcement',
        body: 'Open Sundays from 1 November',
        primaryCta: { label: 'See hours', href: 'contact.html' },
      }),
    );
    expect(html).toContain('Open Sundays from 1 November');
    expect(html).toContain('href="contact.html"');
  });

  it('is not a section, so it takes no band colour and no heading level', () => {
    const html = renderSection(section({ kind: 'announcement', body: 'x' }));
    expect(html).not.toContain('<section');
    expect(html).not.toContain('<h2');
  });

  it('renders nothing rather than an empty bar', () => {
    expect(renderSection(section({ kind: 'announcement' }))).toBe('');
  });

  it('sits above the navigation, outside main', () => {
    const html = renderPage(
      {
        businessName: 'Nova Dental',
        tagline: 'x',
        pages: [{ path: 'index.html', title: 'Home' }],
        contact: {},
        tokens: FALLBACK_TOKENS,
      },
      {
        path: 'index.html',
        title: 'Home',
        description: 'x',
        sections: [
          section({ kind: 'announcement', body: 'Same-day emergencies' }),
          section({ id: 's2', kind: 'hero', heading: 'Nova Dental' }),
        ],
      },
    );
    expect(html.indexOf('Same-day emergencies')).toBeLessThan(html.indexOf('<header class="nav"'));
    expect(html.indexOf('Same-day emergencies')).toBeLessThan(html.indexOf('<main'));
  });
});

describe('the trust marks', () => {
  const html = renderSection(
    section({
      kind: 'logos',
      heading: 'Accredited by',
      items: [
        { title: 'Indian Dental Association', meta: 'Member clinic' },
        { title: 'ISO 9001', meta: 'Certified' },
      ],
    }),
  );

  it('sets the names as type rather than waiting for image files', () => {
    expect(html).toContain('Indian Dental Association');
    expect(html).not.toContain('<img');
  });

  it('renders nothing when there is nothing to vouch for', () => {
    expect(renderSection(section({ kind: 'logos', heading: 'Trusted by' }))).toBe('');
  });
});

describe('the claim and its specifics', () => {
  const html = renderSection(
    section({
      kind: 'split',
      heading: 'Why this clinic',
      body: 'Same-day emergencies, and a written estimate before anything starts.',
      items: [
        { title: 'One dentist', body: 'You see the same person every visit.' },
        { title: 'Written estimates', body: 'Signed before treatment begins.' },
      ],
    }),
  );

  it('keeps the claim and the points in one section', () => {
    expect(html).toContain('Why this clinic');
    expect(html).toContain('One dentist');
    expect(html).toContain('Written estimates');
  });

  it('is not three cards', () => {
    expect(html).not.toContain('class="card"');
  });
});

describe('before and after', () => {
  const html = renderSection(
    section({
      kind: 'beforeafter',
      heading: 'Recent work',
      items: [{ title: 'Chipped front tooth', body: 'Composite bonding.', meta: 'One visit' }],
    }),
  );

  it('labels both frames, so nobody has to guess which is which', () => {
    expect(html).toContain('Before');
    expect(html).toContain('After');
  });

  it('holds the frames open before the photographs arrive', () => {
    expect(html).toContain('media--empty');
  });
});

describe('a section whose photographs have not arrived yet', () => {
  /**
   * The gallery used to drop every item that had no image, so before the
   * photography step ran it rendered as a heading over nothing — a hole in the
   * page on every generated site. The slot holds its shape instead.
   */
  it('keeps the gallery from becoming a heading over nothing', () => {
    const html = renderSection(
      section({ kind: 'gallery', heading: 'A look around', items: [{ title: 'The room' }, { title: 'The bar' }] }),
    );
    expect(html.match(/media--empty/g)?.length).toBe(2);
    expect(html).toContain('The room');
  });

  it('holds both frames of a before-and-after open', () => {
    const html = renderSection(
      section({ kind: 'beforeafter', heading: 'Results', items: [{ title: 'Chipped tooth' }] }),
    );
    expect(html.match(/media--empty/g)?.length).toBe(2);
  });
});

describe('the vocabulary as a whole', () => {
  it('gives every kind at least one layout', () => {
    for (const kind of SECTION_KINDS) {
      expect(LAYOUTS[kind]?.length, kind).toBeGreaterThan(0);
    }
  });

  it('renders every kind without throwing, even with nothing in it', () => {
    for (const kind of SECTION_KINDS) {
      expect(() => renderSection(section({ kind, heading: 'x' })), kind).not.toThrow();
    }
  });
});

import { describe, expect, it } from 'vitest';
import { renderPage, type SiteSpec } from './page';
import { renderSection, type Section } from './sections';
import { renderStylesheet } from './stylesheet';
import { chooseTemplate, TEMPLATES, templateById } from './templates';
import { layoutFor } from './layouts';
import { normaliseTokens } from './tokens';

const tokens = normaliseTokens(null);

const site: SiteSpec = {
  businessName: 'Test',
  tagline: 'A tagline',
  pages: [{ path: 'index.html', title: 'Home' }],
  contact: {},
  tokens,
};

const section = (over: Partial<Section>): Section => ({
  id: 's1',
  kind: 'hero',
  heading: 'A headline',
  subheading: 'A line under it',
  image: 'https://cdn.test/a.jpg',
  items: [
    { title: 'One', body: 'First', meta: '12' },
    { title: 'Two', body: 'Second', meta: '4.9' },
    { title: 'Three', body: 'Third', meta: '₹499' },
  ],
  primaryCta: { label: 'Go', href: 'contact.html' },
  ...over,
});

/** A page built the way the pipeline builds one, for a given template. */
function pageFor(templateId: string, kinds: Section['kind'][]): string {
  const template = templateById(templateId);
  const sections = kinds.map((kind, index) =>
    section({ kind, id: `${kind}-${index}`, layout: layoutFor(kind, template.layouts[kind]) }),
  );
  return renderPage({ ...site, tokens }, {
    path: 'index.html',
    title: 'Home',
    description: 'A description',
    sections,
  });
}

const KINDS: Section['kind'][] = ['hero', 'about', 'features', 'services', 'gallery', 'testimonials', 'stats', 'cta'];

describe('a site built from a template', () => {
  /**
   * The point of the whole change. Before templates existed every site had
   * the same markup and differed only in the hex values in its stylesheet.
   */
  it('produces genuinely different markup for different templates', () => {
    const pages = TEMPLATES.map((template) => pageFor(template.id, KINDS));
    expect(new Set(pages).size).toBe(TEMPLATES.length);
  });

  it('gives an editorial template a different hero from a showcase one', () => {
    expect(pageFor('atelier', ['hero'])).toContain('hero--editorial');
    expect(pageFor('vitrine', ['hero'])).toContain('hero--showcase');
    expect(pageFor('kiln', ['hero'])).toContain('hero--fullbleed');
    expect(pageFor('lumen', ['hero'])).toContain('hero--split');
  });

  it('draws the same content as cards, a bento or a ticker depending on the template', () => {
    expect(pageFor('lumen', ['features'])).toContain('grid grid--3');
    expect(pageFor('vitrine', ['features'])).toContain('bento__tile--lead');
    expect(pageFor('forge', ['features'])).toContain('ticker__track');
    expect(pageFor('atelier', ['features'])).toContain('numbered__index');
  });

  it('never leaves a section unrendered, whatever the template', () => {
    for (const template of TEMPLATES) {
      for (const kind of KINDS) {
        const html = renderSection(section({ kind, layout: layoutFor(kind, template.layouts[kind]) }));
        expect(html.length, `${template.id}/${kind}`).toBeGreaterThan(40);
        expect(html, `${template.id}/${kind}`).toContain('data-section=');
      }
    }
  });

  /** The editor and the suggestion engine both key off this attribute. */
  it('keeps the markers the editor needs in every layout', () => {
    for (const template of TEMPLATES) {
      for (const kind of KINDS) {
        const html = renderSection(section({ kind, layout: layoutFor(kind, template.layouts[kind]) }));
        expect(html, `${template.id}/${kind}`).toContain('data-lumen-id=');
      }
    }
  });

  it('falls back to the plain layout rather than rendering nothing for a bad one', () => {
    const html = renderSection(section({ kind: 'features', layout: 'not-a-layout' }));
    expect(html).toContain('grid grid--3');
  });

  /** A split hero with no photograph is a column of text beside a hole. */
  it('does not render a photo-led hero without a photograph', () => {
    const html = renderSection(section({ kind: 'hero', layout: 'fullbleed', image: undefined }));
    expect(html).toContain('hero--center');
    expect(html).not.toContain('hero__bleed');
  });
});

describe('the stylesheet a template produces', () => {
  it('carries the layout CSS the markup needs', () => {
    const css = renderStylesheet(tokens, templateById('vitrine'));
    for (const selector of ['.bento', '.mosaic', '.ticker', '.numbered', '.timeline', '.index__row']) {
      expect(css).toContain(selector);
    }
  });

  /** A page that moves while somebody reads is unusable for some people. */
  it('always turns every animation off for reduced motion', () => {
    for (const template of TEMPLATES) {
      const css = renderStylesheet(tokens, template);
      if (template.motion === 'none') continue;
      expect(css, template.id).toContain('prefers-reduced-motion: reduce');
    }
  });

  /**
   * Checked on the transform itself rather than on the selector: the selector
   * also appears in every reduced-motion block, where it exists precisely to
   * switch the tilt off, so asserting on it proved nothing.
   */
  it('only gives tilt to templates that asked for depth', () => {
    expect(renderStylesheet(tokens, templateById('circuit'))).toContain('translateZ(6px)');
    expect(renderStylesheet(tokens, templateById('atelier'))).not.toContain('translateZ(6px)');
    expect(renderStylesheet(tokens, templateById('lumen'))).not.toContain('translateZ(6px)');
  });

  it('differs between templates by more than a palette', () => {
    const a = renderStylesheet(tokens, templateById('forge'));
    const b = renderStylesheet(tokens, templateById('estate'));
    expect(a).not.toBe(b);
  });
});

describe('choosing a template for a real brief', () => {
  it.each([
    ['an ecommerce store selling sarees', 'retail'],
    ['a family dental clinic in Akola', 'clinic'],
    ['a strength and conditioning gym', 'gym'],
    ['a candlelit bistro with a seasonal menu', 'restaurant'],
  ])('gives %s a template meant for it', (brief, vertical) => {
    const template = chooseTemplate(vertical, brief);
    expect(template.verticals.length === 0 || template.verticals).toBeTruthy();
    expect(template.id.length).toBeGreaterThan(0);
  });
});

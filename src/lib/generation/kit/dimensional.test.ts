import { describe, expect, it } from 'vitest';
import { DIMENSIONAL_SCRIPT, depthFor, dimensionalCss } from './dimensional';
import { assignTones, renderPage } from './page';
import { renderStylesheet } from './stylesheet';
import { normaliseTokens } from './tokens';
import type { Section } from './sections';

const tokens = normaliseTokens({ palette: { accent: '#b57cff' } });

const page = (dimensional: boolean) =>
  renderPage(
    {
      businessName: 'Northlight',
      tagline: 'One hide, cut once.',
      pages: [{ path: 'index.html', title: 'Home' }],
      contact: {},
      tokens,
      dimensional,
    },
    {
      path: 'index.html',
      title: 'Home',
      description: 'Leather, made to be kept.',
      sections: [
        { id: 'hero', kind: 'hero', layout: 'centre', heading: 'Northlight' },
        { id: 'about', kind: 'about', heading: 'Who we are', body: 'Two people and a bench.' },
        { id: 'feat', kind: 'features', heading: 'Made to last', items: [{ title: 'One hide' }] },
        { id: 'cta', kind: 'cta', heading: 'Come and see it' },
      ] as Section[],
    },
  );

describe('the whole-site 3D treatment', () => {
  /**
   * The complaint that produced this: a scene section on an otherwise ordinary
   * page is a 3D widget embedded in a flat site. Every band has to move.
   */
  it('gives the bands depth on a 3D site', () => {
    const html = page(true);
    const depths = [...html.matchAll(/data-depth style="--depth:([\d.]+)"/g)].map((match) =>
      Number(match[1]),
    );
    expect(depths.length).toBeGreaterThanOrEqual(2);
    // Neighbouring bands must differ, or the whole page is one plate sliding.
    for (let index = 1; index < depths.length; index += 1) {
      expect(depths[index], `band ${index}`).not.toBe(depths[index - 1]);
    }
  });

  /**
   * And it is a different design language, not a better default. A plumber's
   * site put through a scrollytelling treatment is a worse plumber's site.
   */
  it('leaves an ordinary site exactly as it was', () => {
    expect(page(false)).not.toContain('data-depth');
    expect(renderStylesheet(tokens, undefined, false)).not.toContain('kinetic__row');
    expect(renderStylesheet(tokens, undefined, true)).toContain('kinetic__row');
  });

  /**
   * A hero that drifts on load looks like a bug, and the scene sections run
   * their own motion — two systems moving one element fight each other.
   */
  it('never moves a band that does its own moving', () => {
    for (const kind of ['hero', 'announcement', 'scene3d', 'turntable']) {
      expect(depthFor(kind, 0), kind).toBeNull();
      expect(depthFor(kind, 3), kind).toBeNull();
    }
    expect(depthFor('features', 0)).toBeGreaterThan(0);
  });

  it('assigns depth only when asked, and never disturbs the bands', () => {
    const sections = [
      { id: 'a', kind: 'hero' },
      { id: 'b', kind: 'about' },
      { id: 'c', kind: 'features' },
    ] as Section[];
    expect(assignTones(sections).every((section) => section.depth === undefined)).toBe(true);
    const toned = assignTones(sections, true);
    expect(toned.map((section) => section.tone)).toEqual(assignTones(sections).map((s) => s.tone));
    expect(toned[1].depth).toBeGreaterThan(0);
  });
});

describe('the treatment stylesheet', () => {
  const css = dimensionalCss();

  /**
   * The initial hidden state is applied by the script, never by the stylesheet.
   * A page whose CSS hides its content and whose script failed to run is a
   * blank page, which is the worst outcome of the lot.
   */
  it('never hides content the script might not un-hide', () => {
    expect(DIMENSIONAL_SCRIPT).toContain("setAttribute('data-rise'");
    // The hiding rule is keyed on the attribute the script adds, so markup
    // that was never touched is visible.
    expect(css).toMatch(/\[data-rise\]\s*\{[^}]*opacity:\s*0/);
    expect(css).not.toMatch(/main > section\s*\{[^}]*opacity:\s*0/);
  });

  it('turns all of it off for anyone who asked for less motion', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const off of ['[data-rise]', '[data-depth]', '.kinetic__row', 'body::after']) {
      expect(reduced, off).toContain(off);
    }
    expect(DIMENSIONAL_SCRIPT).toContain('prefers-reduced-motion');
  });
});

describe('the treatment script', () => {
  /**
   * One observer and one scroll listener for the page. A listener per band is
   * what makes these sites stutter: twenty handlers each measuring layout on
   * every scroll event is twenty forced reflows a frame.
   */
  it('reads layout once a frame, not once an element', () => {
    expect([...DIMENSIONAL_SCRIPT.matchAll(/addEventListener\('scroll'/g)]).toHaveLength(1);
    expect(DIMENSIONAL_SCRIPT).toContain('requestAnimationFrame');
    expect(DIMENSIONAL_SCRIPT).toContain('{ passive: true }');
    expect(DIMENSIONAL_SCRIPT).not.toContain('preventDefault');
  });

  it('loads nothing', () => {
    // GSAP and Lenis are what these sites are usually built with, and both are
    // blocked outright on a published site under `script-src 'self'`.
    expect(DIMENSIONAL_SCRIPT).not.toMatch(/gsap|lenis|import\s|require\(|fetch\(/i);
  });

  it('parses', () => {
    expect(() => new Function(DIMENSIONAL_SCRIPT)).not.toThrow();
  });
});

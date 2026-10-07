import { describe, expect, it } from 'vitest';
import { FLOAT_SCRIPT, floatCss, floatLayers, renderFloatScene } from './scene-float';
import { scene3dCss } from './scene3d';
import type { Section } from './sections';

const scene: Section = {
  id: 'scene',
  kind: 'scene3d',
  eyebrow: 'Preserve',
  heading: 'Everything we grow, in a jar',
  subheading: 'Picked on the slope above the farm.',
  image: 'https://cdn.test/hero.png',
  items: [
    { title: 'Gelsi Neri', body: 'Black mulberries.', meta: '€8', image: 'https://cdn.test/a.png' },
    { title: 'Smeraldo', body: 'Pistachio pesto.', image: 'https://cdn.test/b.png' },
  ],
  primaryCta: { label: 'Discover the product', href: '/product.html' },
};

describe('the floating scene', () => {
  const layers = floatLayers(scene);

  /**
   * Depth is the whole illusion, and it is carried entirely by one number per
   * layer. Scale, blur, opacity, stacking order, shadow and how far parallax
   * moves it are all derived from `--d` in the stylesheet, so if the ladder is
   * flat the scene is a row of cut-outs at one distance.
   */
  it('puts the photographs on a real depth ladder', () => {
    expect(layers.length).toBe(3);
    expect(layers[0].depth).toBe(1);
    for (let index = 1; index < layers.length; index += 1) {
      expect(layers[index].depth, `layer ${index}`).toBeLessThan(layers[index - 1].depth);
    }
    // And nothing hangs straight, which is the other half of it.
    expect(layers.every((layer) => layer.tilt !== 0)).toBe(true);
  });

  it('draws the hero from the section and the rest from its items', () => {
    expect(layers[0].src).toBe('https://cdn.test/hero.png');
    expect(layers.map((layer) => layer.src)).toEqual([
      'https://cdn.test/hero.png',
      'https://cdn.test/a.png',
      'https://cdn.test/b.png',
    ]);
  });

  it('refuses a src it did not put there', () => {
    expect(floatLayers({ id: 's', kind: 'scene3d', image: 'javascript:alert(1)' })).toEqual([]);
    expect(floatLayers({ id: 's', kind: 'scene3d', image: 'data:image/svg+xml,<svg>' })).toEqual([]);
  });

  /** The words are the page; the photographs are decoration over them. */
  it('reads as a section with the pictures turned off', () => {
    const html = renderFloatScene(scene, layers);
    expect(html).toContain('Everything we grow, in a jar');
    expect(html).toContain('Gelsi Neri');
    expect(html).toContain('Black mulberries.');
    expect(html).toContain('€8');
    // Every photograph is described, because a cut-out with no alt is a gap.
    const alts = [...html.matchAll(/<img[^>]*alt="([^"]*)"/g)].map((match) => match[1]);
    expect(alts).toHaveLength(layers.length);
    expect(alts.every((alt) => alt.trim().length > 0)).toBe(true);
  });

  it('escapes what the model wrote', () => {
    const html = renderFloatScene(
      { ...scene, heading: '<img src=x onerror=alert(1)>', primaryCta: { label: 'Go', href: 'javascript:alert(1)' } },
      layers,
    );
    expect(html).not.toMatch(/<img[^>]*onerror/i);
    expect(html).not.toContain('javascript:');
  });

  it('is deterministic', () => {
    expect(renderFloatScene(scene, layers)).toBe(renderFloatScene(scene, layers));
  });
});

describe('the floating scene stylesheet', () => {
  const css = floatCss();

  /**
   * The bug that made the full-bleed scene 1104px wide inside a 1440px page.
   *
   * The float stage shares the `.s3d__stage` class with the geometric one, and
   * that class sets `aspect-ratio: 4 / 3` — which, combined with a min-height,
   * computes a WIDTH. The section around it showed through on the right and
   * nothing in the markup hinted why. Anything inheriting that class and meant
   * to be full-bleed has to put the ratio back.
   */
  it('undoes the shared stage box it would otherwise inherit', () => {
    const rule = css.slice(css.indexOf('.s3d__stage--float {'));
    const block = rule.slice(0, rule.indexOf('}'));
    expect(block).toMatch(/aspect-ratio:\s*auto/);
    expect(block).toMatch(/max-height:\s*none/);
    expect(block).toMatch(/width:\s*100%/);
  });

  /** Both halves of the sheet ship together, or the scene renders unstyled. */
  it('is shipped with the geometric one', () => {
    expect(scene3dCss()).toContain('.s3d__stage--float');
    expect(scene3dCss()).toContain('.s3d__layer');
  });

  /**
   * Blur is the cue that does most of the work. Without it the arrangement is
   * a collage of cut-outs at different sizes rather than a photograph of
   * objects at different distances.
   */
  it('derives every depth cue from the one depth value', () => {
    const rule = css.slice(css.indexOf('.s3d__layer {'));
    const block = rule.slice(0, rule.indexOf('}'));
    for (const cue of ['filter: blur', 'opacity', 'z-index', 'width']) {
      expect(block, cue).toContain(cue);
    }
    expect(block).toMatch(/blur\(calc\(\(1 - var\(--d\)\) \* [\d.]+px\)\)/);
  });

  it('stops for anyone who asked for less motion', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('animation: none !important');
    for (const moving of ['.s3d__layer', '.s3d__blob', '.s3d__arc']) {
      expect(reduced, moving).toContain(moving);
    }
  });
});

describe('the floating scene script', () => {
  it('does nothing on a page without one', () => {
    expect(FLOAT_SCRIPT).toContain("document.querySelectorAll('[data-s3d-depth]')");
    expect(FLOAT_SCRIPT).toMatch(/if \(!stages\.length\) return;/);
  });

  it('never takes the page scroll', () => {
    expect(FLOAT_SCRIPT).not.toContain("'wheel'");
    expect(FLOAT_SCRIPT).not.toContain('preventDefault');
    expect(FLOAT_SCRIPT).toContain('{ passive: true }');
  });

  it('loads nothing', () => {
    expect(FLOAT_SCRIPT).not.toMatch(/import\s|require\(|fetch\(|three|babylon/i);
  });

  it('parses', () => {
    expect(() => new Function(FLOAT_SCRIPT)).not.toThrow();
  });
});

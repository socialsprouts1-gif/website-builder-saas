import { describe, expect, it } from 'vitest';
import { SCENE3D_FORMS, SCENE3D_SCRIPT, renderScene3d, scene3dCss, scene3dForm } from './scene3d';
import { SECTION_KINDS, renderSection, type Section } from './sections';
import { LAYOUTS } from './layouts';

const section = (over: Partial<Section> = {}): Section => ({
  id: 'scene-1',
  kind: 'scene3d',
  heading: 'The 2026 collection, from every angle',
  subheading: 'Turn it over before you buy it.',
  body: 'Everything is cut from one hide, so the grain runs the length of the bag.',
  items: [
    { title: 'Brass clasp', body: 'Solid, not plated. It will outlast the leather.', meta: 'Lifetime' },
    { title: 'Hand-stitched seam', body: 'Saddle stitch, so one broken thread does not unpick the rest.' },
    { title: 'Lining', body: 'Cotton drill, replaceable.', meta: '₹600' },
  ],
  primaryCta: { label: 'Buy it', href: '/product.html' },
  ...over,
});

describe('the 3D section', () => {
  it('is a section kind the renderer knows about', () => {
    expect(SECTION_KINDS).toContain('scene3d');
    // Reached through the catalogue, not only directly: a kind that renders
    // when called by name and falls through to a card grid when assembled is
    // the kind of gap that only shows up on a real build.
    expect(renderSection(section())).toContain('data-section="scene3d"');
  });

  it('draws every form, and falls back rather than drawing nothing', () => {
    for (const form of SCENE3D_FORMS) {
      const html = renderScene3d(section({ layout: form }));
      expect(html, form).toContain(`data-s3d="${form}"`);
      expect(html, form).toContain('s3d__world');
    }
    // A layout name from a blueprint that was renamed, or from nowhere.
    expect(scene3dForm('nonsense')).toBe('product');
    expect(scene3dForm(undefined)).toBe('product');
    expect(renderScene3d(section({ layout: 'nonsense' }))).toContain('data-s3d="product"');
  });

  /** Every form the layout table offers has to be a form the renderer draws. */
  it('offers exactly the forms it can draw', () => {
    expect([...LAYOUTS.scene3d].sort()).toEqual([...SCENE3D_FORMS].sort());
  });

  /**
   * The content is written by a model from a stranger's prompt, so it is
   * treated as hostile. A section that renders a heading into markup unescaped
   * is a stored cross-site scripting hole on somebody's published website.
   */
  it('escapes everything the model wrote', () => {
    const html = renderScene3d(
      section({
        heading: '<img src=x onerror=alert(1)>',
        items: [{ title: '"><script>alert(1)</script>', body: "O'Brien & Sons" }],
        primaryCta: { label: 'Go', href: 'javascript:alert(1)' },
      }),
    );
    // The payload's own text survives — escaped, as text. What must not
    // survive is a tag: "onerror=" inside &lt;img …&gt; is a string on the
    // page, and asserting on the substring rather than the markup is how a
    // test like this passes while the hole is open.
    expect(html).not.toMatch(/<(script|img|svg|iframe)\b/i);
    expect(html).not.toContain('javascript:');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('O&#39;Brien &amp; Sons');
    expect(html).toContain('href="#"');
  });

  /**
   * The scene is decoration; the words are the page. Somebody on a screen
   * reader, a printer, or a browser where transforms fail gets a heading, a
   * paragraph and a real list — not an empty box and an instruction to drag it.
   */
  it('reads as a page with the 3D turned off', () => {
    const html = renderScene3d(section());
    expect(html).toContain('Brass clasp');
    expect(html).toContain('Solid, not plated.');
    expect(html).toContain('<ul class="s3d__spots">');
    // The stage itself is announced as one image rather than as sixty divs.
    expect(html).toContain('role="img"');
    expect(html).toMatch(/aria-label="The 2026 collection[^"]*"/);
  });

  it('survives a section the model returned almost empty', () => {
    const bare = renderScene3d({ id: 's', kind: 'scene3d' });
    expect(bare).toContain('data-s3d="product"');
    expect(bare).not.toContain('<ul class="s3d__spots">');
    expect(bare).not.toContain('undefined');
  });

  it('is deterministic, so rebuilding a site is not a diff', () => {
    expect(renderScene3d(section())).toBe(renderScene3d(section()));
    expect(scene3dCss()).toBe(scene3dCss());
  });
});

describe('the scene stylesheet', () => {
  const css = scene3dCss();

  /**
   * The bug this file has already had twice, in two different components: an
   * animation that sets `transform` replaces the whole property, so a static
   * `transform` declared beside it — the tilt on a plinth, the turn on a
   * device — silently vanishes on the first frame and the object jumps.
   *
   * So: anything that animates with a keyframe whose `transform` is only a
   * translate must not carry a transform of its own.
   */
  it('never lets an animation throw away a static transform', () => {
    const translateOnly = new Set<string>();
    for (const opener of css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
      // Brace-counted rather than regexed to a newline: a keyframe block holds
      // nested blocks, and they are written on one line.
      let depth = 1;
      let index = opener.index! + opener[0].length;
      const start = index;
      while (depth > 0 && index < css.length) {
        if (css[index] === '{') depth += 1;
        else if (css[index] === '}') depth -= 1;
        index += 1;
      }
      const body = css.slice(start, index - 1);
      const transforms = [...body.matchAll(/transform:\s*([^;}]+)/g)].map((match) =>
        match[1].trim(),
      );
      if (transforms.length === 0) continue;
      if (transforms.every((value) => /^translate[XYZ3d]*\([^)]*\)$/.test(value))) {
        translateOnly.add(opener[1]);
      }
    }
    expect(translateOnly.size).toBeGreaterThan(0);

    for (const [, selector, body] of css.matchAll(/([.\w\s,:_-]+)\{([^{}]*)\}/g)) {
      const animation = body.match(/animation:\s*([\w-]+)/);
      if (!animation || !translateOnly.has(animation[1])) continue;
      expect(
        body,
        `${selector.trim()} animates with ${animation[1]}, which replaces transform`,
      ).not.toMatch(/(^|[;\s])transform:/);
    }
  });

  /**
   * The other way a CSS 3D scene silently collapses. A `filter` — even a
   * drop-shadow added for depth — forces the element to render as one
   * flattened layer, which destroys `preserve-3d` for everything inside it.
   * The showroom's cubes rendered as single quads until the drop-shadow that
   * was meant to ground them came off.
   */
  it('never flattens a 3D subtree with a filter', () => {
    for (const [, selector, body] of css.matchAll(/([.\w\s,:_-]+)\{([^{}]*)\}/g)) {
      if (!/transform-style:\s*preserve-3d/.test(body)) continue;
      expect(body, `${selector.trim()} flattens its own 3D children`).not.toMatch(
        /(^|[;\s])(-webkit-)?(backdrop-)?filter:/,
      );
    }
  });

  /**
   * A panel on the far side of a ring is seen from behind, so its caption
   * renders mirrored — "RED MESA" reading backwards through the front of the
   * carousel, which is what it did.
   */
  it('hides the backs of the panels in the ring', () => {
    expect(css).toMatch(/\.s3d__panel\s*\{[^}]*backface-visibility:\s*hidden/);
  });

  /**
   * A cube's faces are pushed out by exactly half its side. Get it wrong and
   * the six faces meet in a star rather than closing into a box — which is
   * what happened the first time this was written by hand.
   */
  it('builds a cube that closes', () => {
    const half = css.match(/--d:\s*(\d+)px/);
    expect(half).toBeTruthy();
    // The box is two halves wide and two high, and every face is pushed by one.
    expect(css).toContain('width: calc(var(--d) * 2); height: calc(var(--d) * 2);');
    expect(css).toContain('margin: calc(var(--d) * -1) 0 0 calc(var(--d) * -1);');
    const faces = [...renderScene3d(section({ layout: 'product' })).matchAll(/translateZ\(var\(--d\)\)/g)];
    expect(faces).toHaveLength(6);
  });

  /**
   * Motion that cannot be turned off is motion that makes some people ill, and
   * this is the one section of a generated page that moves on its own.
   */
  it('stops dead for anyone who asked for less motion', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('animation: none !important');
    for (const moving of ['.s3d__solid', '.s3d__ring', '.s3d__orbit', '.s3d__mote', '.s3d__device']) {
      expect(reduced, moving).toContain(moving);
    }
  });

  /** Colour from the site's own tokens. A 3D section has no palette of its own. */
  it('takes its colour from the site rather than carrying one', () => {
    expect(css).toContain('var(--accent)');
    // A mask is a stencil rather than paint — its #000 means "opaque here" and
    // would be identical under every palette — so those lines do not count.
    const painted = css
      .split('\n')
      .filter((line) => !/mask-image/.test(line))
      .join('\n');
    const literals = [...painted.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((match) => match[0]);
    // The one exception is the glare across the device: that is light, and
    // light is white whatever colour the thing it falls on is.
    expect(literals).toEqual(['#fff']);
  });
});

describe('the scene script', () => {
  it('does nothing on a page with no scene', () => {
    expect(SCENE3D_SCRIPT).toContain("document.querySelectorAll('[data-s3d]')");
    expect(SCENE3D_SCRIPT).toMatch(/if \(!stages\.length\) return;/);
  });

  /**
   * A published site runs under `script-src 'self'`. A CDN three.js would be
   * blocked outright, and a self-hosted one is half a megabyte before a
   * ₹6,000 Android phone sees a word of the page.
   */
  it('loads nothing', () => {
    expect(SCENE3D_SCRIPT).not.toMatch(/import\s|require\(|fetch\(|new Worker|src\s*=/);
    expect(SCENE3D_SCRIPT).not.toMatch(/three|babylon|cdn/i);
  });

  /**
   * The wheel belongs to the page. A scene that zooms on scroll is a scene
   * that traps somebody halfway down a website on a laptop.
   */
  it('never takes the page scroll away', () => {
    expect(SCENE3D_SCRIPT).not.toContain("'wheel'");
    expect(SCENE3D_SCRIPT).not.toContain("'touchmove'");
    // The one listener it puts on the window is passive, so it cannot block
    // scrolling even by accident.
    expect(SCENE3D_SCRIPT).toContain('{ passive: true }');

    // preventDefault is allowed in exactly one place: an arrow key pressed
    // while the stage itself has focus, where the alternative is the page
    // jumping under somebody who is trying to turn the scene. Anywhere else it
    // is the page's scroll being taken.
    const guarded = SCENE3D_SCRIPT.slice(SCENE3D_SCRIPT.indexOf("'keydown'"));
    const total = [...SCENE3D_SCRIPT.matchAll(/preventDefault\(\)/g)].length;
    const inKeydown = [...guarded.matchAll(/preventDefault\(\)/g)].length;
    expect(total).toBe(1);
    expect(inKeydown).toBe(1);
  });

  it('can be driven without a mouse', () => {
    expect(SCENE3D_SCRIPT).toContain("'keydown'");
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      expect(SCENE3D_SCRIPT, key).toContain(key);
    }
    expect(renderScene3d(section())).toContain('tabindex="0"');
  });

  it('is plain script, parseable as written', () => {
    // It is concatenated into a .js file and served; a syntax error here is a
    // site whose forms, menu and scenes all stop at once.
    expect(() => new Function(SCENE3D_SCRIPT)).not.toThrow();
  });
});

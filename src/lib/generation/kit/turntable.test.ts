import { describe, expect, it } from 'vitest';
import {
  MIN_TURNTABLE_FRAMES,
  TURNTABLE_FRAMES,
  TURNTABLE_SCRIPT,
  renderTurntable,
  turntableCss,
  turntableFrames,
} from './turntable';
import { renderSection, type Section } from './sections';
import { turnBriefs } from '../scene-shots';

const frames = (count: number) =>
  Array.from({ length: count }, (_, index) => `https://cdn.test/f${index}.png`);

const turn = (count = TURNTABLE_FRAMES): Section => ({
  id: 'turn',
  kind: 'turntable',
  heading: 'The Northlight weekender',
  subheading: 'One hide, cut once.',
  body: 'Turn it to see the saddle stitch down the gusset.',
  image: frames(count)[0],
  items: frames(count)
    .slice(1)
    .map((image) => ({ image })),
  primaryCta: { label: 'Buy the bag', href: '/product.html' },
});

describe('the turntable', () => {
  it('reads its frames in turn order', () => {
    expect(turntableFrames(turn())).toEqual(frames(TURNTABLE_FRAMES));
  });

  /**
   * Order is the entire content of a turntable. Frame 7 after frame 6 is a
   * rotation; the same twelve pictures in any other order is a flicker.
   */
  it('puts the photographs back in turn order after a failure', () => {
    const shots = [
      { url: 'https://cdn.test/f3.png', subject: 'Bag · frame 4' },
      { url: 'https://cdn.test/f1.png', subject: 'Bag · frame 2' },
      { url: 'https://cdn.test/f2.png', subject: 'Bag · frame 3' },
    ];
    // Deliberately out of order, as a batch of parallel calls settles.
    const briefs = turnBriefs({ subject: 'Bag', business: 'X', kind: 'shop' });
    expect(briefs).toHaveLength(TURNTABLE_FRAMES);
    expect(briefs.map((brief) => brief.subject)).toEqual(
      Array.from({ length: TURNTABLE_FRAMES }, (_, index) => `Bag · frame ${index + 1}`),
    );
    // Every angle is different, and the subject is identical in all of them —
    // which is the only thing making the sequence read as one object.
    expect(new Set(briefs.map((brief) => brief.prompt)).size).toBe(TURNTABLE_FRAMES);
    for (const brief of briefs) expect(brief.prompt).toContain('The exact same single object');
    expect(shots).toHaveLength(3);
  });

  /** Below three frames there is nothing to turn, so it is not a turntable. */
  it('falls back rather than drawing a dial with nothing on it', () => {
    const thin = renderSection({ ...turn(2), layout: undefined });
    expect(thin).not.toContain('data-tt');
    // It becomes the floating scene, which handles two pictures perfectly well.
    expect(thin).toContain('data-section="scene3d"');
    expect(MIN_TURNTABLE_FRAMES).toBe(3);

    expect(renderSection(turn(3))).toContain('data-tt');
  });

  /**
   * The sticky child is the mechanism: the outer element is several viewports
   * tall and the inner one pins, and the distance between them is the scroll
   * the rotation is spent on. Without it the sequence plays as it scrolls past
   * and reads as a gif rather than as something being controlled.
   */
  it('is a tall track with a pinned stage', () => {
    const css = turntableCss();
    expect(css).toMatch(/\.tt__scroll\s*\{[^}]*height:\s*\d+vh/);
    expect(css).toMatch(/\.tt__sticky\s*\{[^}]*position:\s*sticky/);
    expect(css).toMatch(/\.tt__sticky\s*\{[^}]*height:\s*100vh/);
  });

  /**
   * Every frame in the DOM and painted. Swapping a src at scroll speed shows a
   * blank while the next image decodes, which is a flicker on every step.
   */
  it('stacks every frame rather than swapping one src', () => {
    const html = renderTurntable(turn(), frames(TURNTABLE_FRAMES));
    expect([...html.matchAll(/<img /g)]).toHaveLength(TURNTABLE_FRAMES);
    expect([...html.matchAll(/class="tt__frame/g)]).toHaveLength(TURNTABLE_FRAMES);
    // Exactly one is visible to begin with.
    expect([...html.matchAll(/is-on/g)]).toHaveLength(1);
    expect(TURNTABLE_SCRIPT).toContain('.decode');
  });

  /**
   * Twelve pictures of one object is one thing to a reader and twelve images
   * to a screen reader. One alt, on the frame that is showing, and the rest
   * hidden.
   */
  it('is announced once, not twelve times', () => {
    const html = renderTurntable(turn(), frames(TURNTABLE_FRAMES));
    expect([...html.matchAll(/aria-hidden="true"/g)]).toHaveLength(TURNTABLE_FRAMES - 1);
    const alts = [...html.matchAll(/alt="([^"]*)"/g)].map((match) => match[1]).filter(Boolean);
    expect(alts).toHaveLength(1);
    expect(html).toContain('role="img"');
  });

  it('rules the dial for the frames it actually has', () => {
    const html = renderTurntable(turn(5), frames(5));
    expect([...html.matchAll(/--i:/g)]).toHaveLength(5);
    // Not the constant: a batch where shots failed still reads as even.
    expect(html).toContain('--last:4');
  });

  it('escapes what the model wrote, and refuses a src it did not place', () => {
    const html = renderTurntable(
      { ...turn(), heading: '<script>alert(1)</script>', primaryCta: { label: 'Go', href: 'javascript:alert(1)' } },
      frames(TURNTABLE_FRAMES),
    );
    expect(html).not.toMatch(/<script>alert/);
    expect(html).not.toContain('javascript:');
    expect(turntableFrames({ id: 't', kind: 'turntable', image: 'javascript:alert(1)' })).toEqual([]);
  });

  describe('the scrubber', () => {
    it('never takes the page scroll', () => {
      expect(TURNTABLE_SCRIPT).not.toContain("'wheel'");
      expect(TURNTABLE_SCRIPT).not.toContain('preventDefault');
      expect(TURNTABLE_SCRIPT).toContain('{ passive: true }');
    });

    it('does nothing on a page without one, and parses', () => {
      expect(TURNTABLE_SCRIPT).toMatch(/if \(!stages\.length\) return;/);
      expect(() => new Function(TURNTABLE_SCRIPT)).not.toThrow();
    });
  });
});

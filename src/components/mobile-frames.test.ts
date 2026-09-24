import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Nothing in Lumen may pan sideways on a phone.
 *
 * The bug this guards: a site card drew its preview as an 800px iframe inside
 * a wrapper with `overflow: hidden` and no width of its own. Hiding overflow
 * clips what is painted, but a box with an automatic width still sizes itself
 * to its contents and a grid track's `1fr` has a min-content floor — so the
 * card came out 800px wide inside a 393px phone, and the whole app slid
 * sideways into empty space with half of it unreachable. It looked correct on
 * every desktop.
 *
 * The fix is `.lumen-scale-frame`, which takes the child out of flow so it
 * cannot contribute a width at all, and scales it to the column it lands in.
 * Read as source because the failure is in CSS layout: a unit test cannot lay
 * a page out, but it can refuse the shape that broke.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

/**
 * Comments explain the rule using the words the rule is about, so a check that
 * reads them passes on a file that only talks about doing the right thing.
 */
const markup = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const FRAMES = [
  'src/components/app/SiteCard.tsx',
  'src/components/templates/TemplateLibrary.tsx',
  'src/components/marketing/MockFrame.tsx',
  'src/components/ideas/IdeaGallery.tsx',
];

describe('every page miniature', () => {
  it.each(FRAMES.map((path) => [path]))('%s scales to its column', (path) => {
    const source = markup(path);
    expect(source, 'uses the shared frame').toContain('lumen-scale-frame');
    expect(source, 'tells the frame how wide the page it holds is').toContain('--frame-width');
  });

  it.each(FRAMES.map((path) => [path]))('%s sets no fixed scale of its own', (path) => {
    // A hard-coded factor is the other half of the same bug: right on the
    // width it was written for, cropped or gappy on every other.
    expect(markup(path)).not.toMatch(/scale-\[[\d.]+\]/);
    expect(markup(path)).not.toMatch(/transform:\s*`?scale\(/);
  });
});

describe('the shared frame', () => {
  const css = read('src/app/globals.css');
  const rule = css.slice(css.indexOf('.lumen-scale-frame'));

  it('takes its child out of flow, which is what stops the overflow', () => {
    expect(rule).toMatch(/\.lumen-scale-frame > \*\s*\{[^}]*position:\s*absolute/);
  });

  it('is a container, so the scale can follow the column width', () => {
    expect(rule).toMatch(/container-type:\s*inline-size/);
  });

  it('divides by a length, because scale() will not take one otherwise', () => {
    expect(rule).toContain('calc(100cqw / var(--frame-width');
  });

  it('keeps a fixed fallback for a browser without length division', () => {
    expect(rule).toMatch(/transform:\s*scale\([\d.]+\);/);
  });
});

describe('the app shell', () => {
  it('never scrolls sideways, whatever ends up inside it', () => {
    expect(read('src/app/app/layout.tsx')).toContain('overflow-x-hidden');
  });
});

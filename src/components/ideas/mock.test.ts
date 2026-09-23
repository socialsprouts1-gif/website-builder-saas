import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The miniature is decoration, and decoration that declares itself a heading
 * takes the page over. Every page that renders a mock — the ideas gallery and
 * all twelve per-trade pages — has a real <h1> of its own saying what the page
 * is about; the mock used to add a second one saying "Dinner, six nights a
 * week", which is a different topic and a louder claim to it.
 */
const source = readFileSync(join(__dirname, 'SiteMock.tsx'), 'utf8');

/** The comment above explains the rule using the tag it forbids. */
const markup = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('the site miniature', () => {
  it('contains no heading tags at all', () => {
    expect(markup).not.toMatch(/<h[1-6][\s>]/);
    expect(markup).not.toMatch(/<\/h[1-6]>/);
  });

  it('still draws headline-sized type, so demoting the tags changed nothing visible', () => {
    expect(source).toMatch(/fontSize: 5\d/);
  });
});

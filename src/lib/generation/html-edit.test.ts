import { describe, expect, it } from 'vitest';
import { applyVisualEdits, describeEdit } from './html-edit';

/**
 * Reordering by dragging, which is offset arithmetic and therefore the kind of
 * thing that goes wrong quietly.
 *
 * A block is cut out of the string and spliced back in somewhere else. Every
 * offset after the cut moves by the length of what was removed, so an
 * insertion point worked out before the cut is wrong by exactly that much —
 * and wrong in a way that still produces valid-looking HTML.
 */

const page = (ids: string[]) =>
  `<main>\n${ids.map((id) => `<section data-lumen-id="${id}">${id}</section>`).join('\n')}\n</main>`;

/** The order of the blocks in the output, which is the whole question. */
const orderOf = (html: string): string[] =>
  [...html.matchAll(/data-lumen-id="([^"]+)"/g)].map((match) => match[1]);

const move = (html: string, lumenId: string, beforeLumenId: string | null) =>
  applyVisualEdits(html, [{ kind: 'moveTo', lumenId, beforeLumenId }]);

describe('moveTo', () => {
  const four = page(['a', 'b', 'c', 'd']);

  it('moves a block down the page in one edit', () => {
    const result = move(four, 'a', 'd');
    expect(orderOf(result.html)).toEqual(['b', 'c', 'a', 'd']);
    expect(result.applied).toBe(1);
  });

  it('moves a block up the page in one edit', () => {
    const result = move(four, 'd', 'b');
    expect(orderOf(result.html)).toEqual(['a', 'd', 'b', 'c']);
    expect(result.applied).toBe(1);
  });

  it('moves a block to the very end when nothing is named', () => {
    expect(orderOf(move(four, 'a', null).html)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('moves a block to the very top', () => {
    expect(orderOf(move(four, 'd', 'a').html)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('takes the block with it, not just its tag', () => {
    const result = move(page(['a', 'b']), 'a', null);
    expect(result.html).toContain('<section data-lumen-id="a">a</section>');
    expect(result.html.match(/data-lumen-id="a"/g)).toHaveLength(1);
  });

  it('keeps every block exactly once, whatever the move', () => {
    for (const from of ['a', 'b', 'c', 'd']) {
      for (const before of ['a', 'b', 'c', 'd', null]) {
        const order = orderOf(move(four, from, before).html);
        expect([...order].sort()).toEqual(['a', 'b', 'c', 'd']);
      }
    }
  });

  it('puts the block exactly where it was dropped, from every position', () => {
    // The arithmetic differs depending on whether the target sits before or
    // after the cut, so both directions are walked rather than sampled.
    for (const from of ['a', 'b', 'c', 'd']) {
      for (const before of ['a', 'b', 'c', 'd']) {
        if (from === before) continue;
        const order = orderOf(move(four, from, before).html);
        expect(order.indexOf(from)).toBe(order.indexOf(before) - 1);
      }
    }
  });

  it('does nothing when the block is dropped on itself', () => {
    const result = move(four, 'b', 'b');
    expect(orderOf(result.html)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.applied).toBe(0);
  });

  it('does nothing when the target is not on the page', () => {
    const result = move(four, 'a', 'nonexistent');
    expect(orderOf(result.html)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.applied).toBe(0);
  });

  it('does nothing when the block itself is not on the page', () => {
    expect(orderOf(move(four, 'ghost', 'a').html)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('leaves everything outside the moved block alone', () => {
    const html = `<header>keep me</header>${four}<footer>and me</footer>`;
    const result = move(html, 'a', 'c');
    expect(result.html).toContain('<header>keep me</header>');
    expect(result.html).toContain('<footer>and me</footer>');
  });

  it('moves a block that has children inside it', () => {
    const nested =
      '<main>\n<section data-lumen-id="a"><h2 data-lumen-id="a-h">Title</h2><p>Body</p></section>\n' +
      '<section data-lumen-id="b">b</section>\n</main>';
    const result = move(nested, 'a', null);
    expect(orderOf(result.html)).toEqual(['b', 'a', 'a-h']);
    expect(result.html).toContain('<h2 data-lumen-id="a-h">Title</h2><p>Body</p>');
  });
});

describe('moveTo against the old one-step move', () => {
  // The two have to agree, because the arrows in the panel still use the old
  // one and a drag now uses this one.
  it('one step down matches a single swap', () => {
    const four = page(['a', 'b', 'c', 'd']);
    const dragged = move(four, 'a', 'c');
    const stepped = applyVisualEdits(four, [{ kind: 'move', lumenId: 'a', direction: 'down' }]);
    expect(orderOf(dragged.html)).toEqual(orderOf(stepped.html));
  });
});

describe('describeEdit', () => {
  it('says what a move was, in words', () => {
    expect(describeEdit({ kind: 'moveTo', lumenId: 'a', beforeLumenId: 'b' })).toBe('Moved a section');
  });

  // The name already carries its dashes; printing another pair produced
  // "theme ----ink", which read like a bug because it looked like one.
  it('does not double the dashes on a token', () => {
    expect(describeEdit({ kind: 'token', name: '--ink', value: '#111' })).toBe('Theme · ink → #111');
  });
});

describe('replace', () => {
  const page = '<main>\n<section data-lumen-id="a">old</section>\n<section data-lumen-id="b">b</section>\n</main>';

  it('swaps one section and leaves its neighbours alone', () => {
    const result = applyVisualEdits(page, [
      { kind: 'replace', lumenId: 'a', html: '<section data-lumen-id="a">new</section>' },
    ]);
    expect(result.applied).toBe(1);
    expect(result.html).toContain('<section data-lumen-id="a">new</section>');
    expect(result.html).not.toContain('old');
    expect(result.html).toContain('<section data-lumen-id="b">b</section>');
  });

  it('keeps the page order', () => {
    const result = applyVisualEdits(page, [
      { kind: 'replace', lumenId: 'a', html: '<section data-lumen-id="a">new</section>' },
    ]);
    expect(result.html.indexOf('data-lumen-id="a"')).toBeLessThan(result.html.indexOf('data-lumen-id="b"'));
  });

  it('does nothing when the section is gone', () => {
    const result = applyVisualEdits(page, [
      { kind: 'replace', lumenId: 'ghost', html: '<section data-lumen-id="ghost">x</section>' },
    ]);
    expect(result.applied).toBe(0);
    expect(result.html).toBe(page);
  });

  it('replaces a section that has children, children and all', () => {
    const nested = '<main><section data-lumen-id="a"><h2>Old</h2><p>Words</p></section></main>';
    const result = applyVisualEdits(nested, [
      { kind: 'replace', lumenId: 'a', html: '<section data-lumen-id="a"><h2>New</h2></section>' },
    ]);
    expect(result.html).not.toContain('Words');
    expect(result.html).toContain('<h2>New</h2>');
  });
});

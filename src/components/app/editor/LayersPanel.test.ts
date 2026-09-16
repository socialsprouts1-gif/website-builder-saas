import { describe, expect, it } from 'vitest';
import { dropTarget, type OutlineBlock } from './LayersPanel';

/**
 * Turning a drop into a move.
 *
 * Gaps are counted between rows, so the gap above a row and the gap below it
 * are different indices that both mean "leave it alone". Getting that wrong
 * moves the block one place every time you drag it, which looks like the drag
 * working badly rather than like arithmetic.
 */
const blocks: OutlineBlock[] = ['a', 'b', 'c', 'd'].map((id) => ({
  lumenId: id,
  tag: 'section',
  label: id.toUpperCase(),
}));

/** Where the list ends up, so the gaps can be checked as an outcome. */
function reorder(draggingId: string, gap: number): string[] {
  const target = dropTarget(blocks, draggingId, gap);
  const ids = blocks.map((block) => block.lumenId);
  if (!target) return ids;

  const without = ids.filter((id) => id !== draggingId);
  const at = target.beforeLumenId ? without.indexOf(target.beforeLumenId) : without.length;
  return [...without.slice(0, at), draggingId, ...without.slice(at)];
}

describe('dropTarget', () => {
  it('names the block the dragged one lands in front of', () => {
    expect(dropTarget(blocks, 'a', 2)).toEqual({ beforeLumenId: 'c' });
    expect(dropTarget(blocks, 'd', 1)).toEqual({ beforeLumenId: 'b' });
  });

  it('means "last" when dropped past the final row', () => {
    expect(dropTarget(blocks, 'a', 4)).toEqual({ beforeLumenId: null });
  });

  it.each([
    ['the gap above itself', 1],
    ['the gap below itself', 2],
  ])('is nothing at all when dropped into %s', (_label, gap) => {
    expect(dropTarget(blocks, 'b', gap)).toBeNull();
  });

  it('is nothing when the block is not in the list', () => {
    expect(dropTarget(blocks, 'ghost', 2)).toBeNull();
  });
});

describe('the order a drop produces', () => {
  it.each([
    ['a to the top gap', 'a', 0, ['a', 'b', 'c', 'd']],
    ['a between b and c', 'a', 2, ['b', 'a', 'c', 'd']],
    ['a to the very end', 'a', 4, ['b', 'c', 'd', 'a']],
    ['d to the top', 'd', 0, ['d', 'a', 'b', 'c']],
    ['d between a and b', 'd', 1, ['a', 'd', 'b', 'c']],
    ['c up one place', 'c', 1, ['a', 'c', 'b', 'd']],
    ['b down one place', 'b', 3, ['a', 'c', 'b', 'd']],
  ])('%s', (_label, id, gap, expected) => {
    expect(reorder(id, gap)).toEqual(expected);
  });

  it('never loses or duplicates a block, from any gap', () => {
    for (const block of blocks) {
      for (let gap = 0; gap <= blocks.length; gap += 1) {
        expect([...reorder(block.lumenId, gap)].sort()).toEqual(['a', 'b', 'c', 'd']);
      }
    }
  });

  it('leaves the list alone for every no-op gap', () => {
    blocks.forEach((block, index) => {
      expect(reorder(block.lumenId, index)).toEqual(['a', 'b', 'c', 'd']);
      expect(reorder(block.lumenId, index + 1)).toEqual(['a', 'b', 'c', 'd']);
    });
  });
});

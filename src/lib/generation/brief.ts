/**
 * How much of the brief each call actually needs.
 *
 * The brief can now run to twenty thousand characters, and it is handed to
 * every section call — twenty or more per build. Sent whole, one long brief
 * would be paid for twenty times over for no benefit: the planner needs all of
 * it, because it decides the business, the palette and the catalogue, but the
 * call writing a testimonials block needs the gist and nothing else.
 *
 * Trimmed from both ends rather than just the front. People put the headline
 * facts first and the specific instructions last — "and make sure the prices
 * are in rupees" is almost always the final line — so cutting the tail throws
 * away the part they cared most about.
 */

export const SECTION_BRIEF_HEAD = 1_400;
export const SECTION_BRIEF_TAIL = 600;

export function sectionBrief(brief: string): string {
  const text = brief.trim();
  if (text.length <= SECTION_BRIEF_HEAD + SECTION_BRIEF_TAIL) return text;

  const head = cutAtBoundary(text.slice(0, SECTION_BRIEF_HEAD), 'end');
  const tail = cutAtBoundary(text.slice(-SECTION_BRIEF_TAIL), 'start');

  return `${head}\n\n[…]\n\n${tail}`;
}

/**
 * Cuts at a sentence or line break rather than mid-word.
 *
 * A brief that stops halfway through "we specialise in whole" reads to a model
 * as a fact about wholes.
 */
function cutAtBoundary(piece: string, side: 'start' | 'end'): string {
  if (side === 'end') {
    const stop = Math.max(piece.lastIndexOf('. '), piece.lastIndexOf('\n'));
    return (stop > piece.length * 0.5 ? piece.slice(0, stop + 1) : piece).trim();
  }
  const start = Math.min(
    ...[piece.indexOf('. '), piece.indexOf('\n')].filter((index) => index !== -1),
  );
  return (Number.isFinite(start) && start < piece.length * 0.5
    ? piece.slice(start + 1)
    : piece
  ).trim();
}

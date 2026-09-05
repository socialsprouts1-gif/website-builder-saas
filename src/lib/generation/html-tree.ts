/**
 * A small tag-stack parser over generated HTML.
 *
 * Regex can locate an element, but it cannot answer "what is this element's
 * previous sibling" — and without that there is no reordering, duplication or
 * insertion. This walks the tags once and builds the shape those operations
 * need, without pulling in a DOM implementation for what is a single pass.
 *
 * It is not a general HTML parser. It handles what Lumen's own generator emits:
 * well-formed markup, void elements, comments, and raw-text elements whose
 * bodies must not be scanned for tags.
 */

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** Contents are text, not markup — a `<` inside them is not a tag. */
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);

export interface ElementNode {
  tag: string;
  lumenId: string | null;
  /** Offsets into the source string. */
  openStart: number;
  openEnd: number;
  closeStart: number;
  closeEnd: number;
  selfClosing: boolean;
  depth: number;
  children: ElementNode[];
  parent: ElementNode | null;
}

const TAG_PATTERN = /<(\/)?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/)?>/g;
const LUMEN_ID_PATTERN = /\bdata-lumen-id\s*=\s*(?:"([^"]*)"|'([^']*)')/;

function readLumenId(attributes: string): string | null {
  const match = LUMEN_ID_PATTERN.exec(attributes);
  return match ? (match[1] ?? match[2] ?? null) : null;
}

export interface ParsedHtml {
  roots: ElementNode[];
  all: ElementNode[];
  byLumenId: Map<string, ElementNode>;
}

/**
 * Parses into a forest of top-level elements, each with its children.
 *
 * Callers doing more than one lookup should parse once and query the result:
 * nodes carry parent and sibling references, which are only meaningful within
 * a single parse.
 */
export function parseElements(html: string): ParsedHtml {
  const roots: ElementNode[] = [];
  const all: ElementNode[] = [];
  const byLumenId = new Map<string, ElementNode>();
  const stack: ElementNode[] = [];

  TAG_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TAG_PATTERN.exec(html)) !== null) {
    const [raw, closing, rawTag, attributes, selfClose] = match;
    const tag = rawTag.toLowerCase();

    // Skip anything inside a comment.
    const commentStart = html.lastIndexOf('<!--', match.index);
    if (commentStart !== -1) {
      const commentEnd = html.indexOf('-->', commentStart);
      if (commentEnd === -1 || commentEnd > match.index) continue;
    }

    if (closing) {
      // Unwind to the matching open, tolerating unclosed inline tags.
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (stack[index].tag !== tag) continue;
        const node = stack[index];
        node.closeStart = match.index;
        node.closeEnd = match.index + raw.length;
        stack.length = index;
        break;
      }
      continue;
    }

    const node: ElementNode = {
      tag,
      lumenId: readLumenId(attributes ?? ''),
      openStart: match.index,
      openEnd: match.index + raw.length,
      closeStart: match.index + raw.length,
      closeEnd: match.index + raw.length,
      selfClosing: Boolean(selfClose) || VOID_ELEMENTS.has(tag),
      depth: stack.length,
      children: [],
      parent: stack[stack.length - 1] ?? null,
    };

    all.push(node);
    if (node.lumenId && !byLumenId.has(node.lumenId)) byLumenId.set(node.lumenId, node);
    if (node.parent) node.parent.children.push(node);
    else roots.push(node);

    if (node.selfClosing) continue;

    if (RAW_TEXT_ELEMENTS.has(tag)) {
      // Jump the scanner past the body so its text is never read as markup.
      const closeTag = `</${tag}`;
      const closeAt = html.toLowerCase().indexOf(closeTag, node.openEnd);
      if (closeAt !== -1) {
        const closeEnd = html.indexOf('>', closeAt);
        node.closeStart = closeAt;
        node.closeEnd = closeEnd === -1 ? closeAt + closeTag.length : closeEnd + 1;
        TAG_PATTERN.lastIndex = node.closeEnd;
      }
      continue;
    }

    stack.push(node);
  }

  return { roots, all, byLumenId };
}

/** Accepts a parsed tree, or a string for one-off lookups. */
export function findByLumenId(source: string | ParsedHtml, lumenId: string): ElementNode | null {
  const parsed = typeof source === 'string' ? parseElements(source) : source;
  return parsed.byLumenId.get(lumenId) ?? null;
}

/** The element's siblings, in document order, including itself. */
export function siblingsOf(node: ElementNode, roots: ElementNode[]): ElementNode[] {
  return node.parent ? node.parent.children : roots;
}

export function outerHtml(html: string, node: ElementNode): string {
  return html.slice(node.openStart, node.selfClosing ? node.openEnd : node.closeEnd);
}

export function innerHtml(html: string, node: ElementNode): string {
  return node.selfClosing ? '' : html.slice(node.openEnd, node.closeStart);
}

/** Replaces a byte range, keeping the rest of the document byte-identical. */
export function spliceRange(html: string, start: number, end: number, replacement: string): string {
  return html.slice(0, start) + replacement + html.slice(end);
}

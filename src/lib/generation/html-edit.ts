import {
  findByLumenId,
  outerHtml,
  parseElements,
  siblingsOf,
  spliceRange,
  type ElementNode,
} from './html-tree';

/**
 * Applies editor changes to the real generated HTML.
 *
 * There is no overlay layer: what the editor changes is the file, so switching
 * to chat afterwards operates on the true current state of the site.
 *
 * Every edit is located through the element tree rather than by pattern, which
 * is what makes reordering and duplication correct rather than approximate.
 */

export type VisualEdit =
  | { kind: 'text'; lumenId: string; value: string }
  | { kind: 'image'; lumenId: string; src: string; alt?: string }
  | { kind: 'remove'; lumenId: string }
  | { kind: 'style'; lumenId: string; styles: Record<string, string> }
  | { kind: 'move'; lumenId: string; direction: 'up' | 'down' }
  | { kind: 'duplicate'; lumenId: string }
  | { kind: 'insert'; afterLumenId: string | null; html: string }
  | { kind: 'token'; name: string; value: string };

/**
 * What the editor sends. Identical to VisualEdit except that an insert names a
 * block from the server's library rather than carrying markup — the browser
 * never supplies HTML that would end up in a published site.
 */
export type ClientVisualEdit =
  | Exclude<VisualEdit, { kind: 'insert' }>
  | { kind: 'insert'; afterLumenId: string | null; blockId: string };

function escapeText(value: string): string {
  return value.replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character]!);
}

function escapeAttribute(value: string): string {
  return value.replace(/[&"<>]/g, (character) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[character]!);
}

function setAttribute(openTag: string, name: string, value: string): string {
  const pattern = new RegExp(`\\s${name}\\s*=\\s*(["'])[\\s\\S]*?\\1`);
  const replacement = ` ${name}="${escapeAttribute(value)}"`;
  if (pattern.test(openTag)) return openTag.replace(pattern, replacement);
  return openTag.replace(/\s*(\/?)>$/, (_full, slash) => `${replacement}${slash ? ' /' : ''}>`);
}

function readAttribute(openTag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(openTag);
  return match ? (match[1] ?? match[2] ?? '') : null;
}

/** Merges declarations into an existing inline style, replacing same-named ones. */
function mergeStyle(existing: string | null, styles: Record<string, string>): string {
  const declarations = new Map<string, string>();

  for (const part of (existing ?? '').split(';')) {
    const [property, ...rest] = part.split(':');
    if (!property?.trim() || rest.length === 0) continue;
    declarations.set(property.trim(), rest.join(':').trim());
  }

  for (const [property, value] of Object.entries(styles)) {
    // An empty value clears the declaration rather than writing "prop: ;".
    if (!value) declarations.delete(property);
    else declarations.set(property, value);
  }

  return [...declarations.entries()].map(([property, value]) => `${property}: ${value}`).join('; ');
}

/**
 * Edits are applied one at a time, re-parsing between each, because every edit
 * shifts the offsets that follow it. Documents are a few hundred KB at most and
 * an editor save carries a handful of edits, so correctness wins here.
 */
export function applyVisualEdits(html: string, edits: VisualEdit[]): { html: string; applied: number } {
  let output = html;
  let applied = 0;

  for (const edit of edits) {
    if (edit.kind === 'token') {
      // Design tokens live as custom properties on :root, so a colour change is
      // one declaration rewrite rather than a hunt through the markup.
      const pattern = new RegExp(`(--${edit.name.replace(/^--/, '')}\\s*:\\s*)([^;]+)(;)`, 'g');
      const next = output.replace(pattern, `$1${edit.value}$3`);
      if (next !== output) applied += 1;
      output = next;
      continue;
    }

    const tree = parseElements(output);

    if (edit.kind === 'insert') {
      const anchor = edit.afterLumenId ? findByLumenId(tree, edit.afterLumenId) : null;
      if (edit.afterLumenId && !anchor) continue;

      if (anchor) {
        const at = anchor.selfClosing ? anchor.openEnd : anchor.closeEnd;
        output = spliceRange(output, at, at, `\n${edit.html}`);
      } else {
        // No anchor: append inside <main> when there is one, else at the end.
        const main = tree.all.find((node) => node.tag === 'main');
        const at = main ? main.closeStart : output.length;
        output = spliceRange(output, at, at, `\n${edit.html}\n`);
      }
      applied += 1;
      continue;
    }

    const node = findByLumenId(tree, edit.lumenId);
    if (!node) continue;

    if (edit.kind === 'remove') {
      output = spliceRange(output, node.openStart, node.selfClosing ? node.openEnd : node.closeEnd, '');
      applied += 1;
      continue;
    }

    if (edit.kind === 'duplicate') {
      const copy = withFreshIds(outerHtml(output, node));
      const at = node.selfClosing ? node.openEnd : node.closeEnd;
      output = spliceRange(output, at, at, `\n${copy}`);
      applied += 1;
      continue;
    }

    if (edit.kind === 'move') {
      const siblings = siblingsOf(node, tree.roots);
      const index = siblings.indexOf(node);
      const target = edit.direction === 'up' ? siblings[index - 1] : siblings[index + 1];
      if (!target) continue;

      const [first, second] = edit.direction === 'up' ? [target, node] : [node, target];
      const firstEnd = first.selfClosing ? first.openEnd : first.closeEnd;
      const secondEnd = second.selfClosing ? second.openEnd : second.closeEnd;

      const firstHtml = output.slice(first.openStart, firstEnd);
      const between = output.slice(firstEnd, second.openStart);
      const secondHtml = output.slice(second.openStart, secondEnd);

      // Swap the two blocks, keeping whatever whitespace sat between them.
      output = spliceRange(output, first.openStart, secondEnd, secondHtml + between + firstHtml);
      applied += 1;
      continue;
    }

    if (edit.kind === 'image') {
      let openTag = output.slice(node.openStart, node.openEnd);
      openTag = setAttribute(openTag, 'src', edit.src);
      if (edit.alt !== undefined) openTag = setAttribute(openTag, 'alt', edit.alt);
      output = spliceRange(output, node.openStart, node.openEnd, openTag);
      applied += 1;
      continue;
    }

    if (edit.kind === 'style') {
      const openTag = output.slice(node.openStart, node.openEnd);
      const merged = mergeStyle(readAttribute(openTag, 'style'), edit.styles);
      const next = merged
        ? setAttribute(openTag, 'style', merged)
        : openTag.replace(/\s+style\s*=\s*(["'])[\s\S]*?\1/, '');
      output = spliceRange(output, node.openStart, node.openEnd, next);
      applied += 1;
      continue;
    }

    // Text: replace only this element's own content, keeping its tag,
    // classes and id intact.
    if (node.selfClosing) continue;
    output = spliceRange(output, node.openEnd, node.closeStart, escapeText(edit.value));
    applied += 1;
  }

  return { html: output, applied };
}

/** One-line summary of a queued edit, for the editor's pending list. */
export function describeEdit(edit: VisualEdit | ClientVisualEdit): string {
  switch (edit.kind) {
    case 'token':
      return `theme --${edit.name} → ${edit.value}`;
    case 'insert':
      return `add ${'blockId' in edit ? edit.blockId : 'block'}${
        edit.afterLumenId ? ` after ${edit.afterLumenId}` : ''
      }`;
    case 'move':
      return `move ${edit.lumenId} ${edit.direction}`;
    case 'style':
      return `style ${edit.lumenId} · ${Object.keys(edit.styles).join(', ')}`;
    default:
      return `${edit.kind} ${edit.lumenId}`;
  }
}

/** Duplicated blocks need their own ids, or the editor cannot tell them apart. */
function withFreshIds(fragment: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return fragment.replace(
    /(\bdata-lumen-id\s*=\s*)(["'])([^"']*)\2/g,
    (_full, prefix, quote, value) => `${prefix}${quote}${value}-${suffix}${quote}`,
  );
}

/** Token edits also rewrite the shared stylesheet so they persist site-wide. */
export function applyTokenEditsToCss(css: string, edits: VisualEdit[]): string {
  let output = css;
  for (const edit of edits) {
    if (edit.kind !== 'token') continue;
    const pattern = new RegExp(`(--${edit.name.replace(/^--/, '')}\\s*:\\s*)([^;]+)(;)`, 'g');
    output = output.replace(pattern, `$1${edit.value}$3`);
  }
  return output;
}

export type { ElementNode };

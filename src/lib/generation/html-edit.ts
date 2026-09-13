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
  | { kind: 'token'; name: string; value: string }
  | { kind: 'link'; lumenId: string; href: string }
  | { kind: 'font'; role: 'display' | 'body'; family: string; googleHref: string | null };

/**
 * What the editor sends. Identical to VisualEdit except that an insert names a
 * block from the server's library rather than carrying markup — the browser
 * never supplies HTML that would end up in a published site.
 */
export type ClientVisualEdit =
  | Exclude<VisualEdit, { kind: 'insert' }>
  | {
      kind: 'insert';
      afterLumenId: string | null;
      blockId: string;
      /**
       * Chosen in the browser so the section previewed and the section saved
       * carry the same element ids — otherwise what you edited before saving is
       * not what you are editing after.
       */
      uid: string;
      imageUrl?: string;
      videoUrl?: string;
    };

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

    if (edit.kind === 'font') {
      // The family lives in the stylesheet; the link that loads it lives in the
      // page. Changing one without the other is how a site quietly falls back
      // to a default serif, so both move together.
      const property = edit.role === 'display' ? '--font-display' : '--font-body';
      const declaration = new RegExp(`(${property}\\s*:\\s*)([^;]+)(;)`, 'g');
      const retyped = output.replace(declaration, `$1${edit.family}$3`);
      if (retyped !== output) applied += 1;
      output = retyped;

      const linked = applyFontLink(output, edit.googleHref);
      if (linked !== output) applied += 1;
      output = linked;
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

    if (edit.kind === 'link') {
      const openTag = output.slice(node.openStart, node.openEnd);
      output = spliceRange(output, node.openStart, node.openEnd, setAttribute(openTag, 'href', edit.href));
      applied += 1;
      continue;
    }

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
      // The name already carries its dashes; printing another pair produced
      // "theme ----ink", which reads like a bug because it looked like one.
      return `Theme · ${edit.name.replace(/^-+/, '').replace(/-/g, ' ')} → ${edit.value}`;
    case 'font':
      return `${edit.role === 'display' ? 'Heading' : 'Body'} font → ${edit.family.split(',')[0].replace(/"/g, '')}`;
    case 'insert':
      return `Added a ${'blockId' in edit ? edit.blockId.replace(/-/g, ' ') : 'section'} section`;
    case 'move':
      return `Moved a section ${edit.direction}`;
    case 'style':
      return `Restyled ${Object.keys(edit.styles).join(', ')}`;
    case 'link':
      return `Link now goes to ${edit.href}`;
    case 'text':
      return `Reworded “${edit.value.slice(0, 28)}${edit.value.length > 28 ? '…' : ''}”`;
    case 'image':
      return 'Swapped a picture';
    case 'duplicate':
      return 'Duplicated a section';
    case 'remove':
      return 'Deleted a section';
    default:
      return 'Change';
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

/**
 * Points the page's webfont link at a new stylesheet, adds one when there is
 * none, and removes it when the chosen family needs no loading.
 */
export function applyFontLink(html: string, googleHref: string | null): string {
  const existing = /<link\b[^>]*fonts\.googleapis\.com[^>]*>/i;

  if (!googleHref) return html.replace(existing, '');
  if (existing.test(html)) {
    return html.replace(existing, `<link rel="stylesheet" href="${escapeAttribute(googleHref)}" />`);
  }
  return html.replace(
    /<\/head>/i,
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n<link rel="stylesheet" href="${escapeAttribute(googleHref)}" />\n</head>`,
  );
}

/**
 * Theme edits rewrite the shared stylesheet so they persist site-wide.
 *
 * Both kinds land here: a token is one declaration, and a font is the same
 * thing under a fixed name. The font's <link> is handled in the HTML pass —
 * the family and the loader are two halves of one change.
 */
export function applyTokenEditsToCss(css: string, edits: VisualEdit[]): string {
  let output = css;

  const rewrite = (name: string, value: string) => {
    const pattern = new RegExp(`(--${name.replace(/^--/, '')}\\s*:\\s*)([^;]+)(;)`, 'g');
    output = output.replace(pattern, `$1${value}$3`);
  };

  for (const edit of edits) {
    if (edit.kind === 'token') rewrite(edit.name, edit.value);
    if (edit.kind === 'font') {
      rewrite(edit.role === 'display' ? '--font-display' : '--font-body', edit.family);
    }
  }
  return output;
}

export type { ElementNode };

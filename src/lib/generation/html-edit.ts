/**
 * Server-side application of visual-editor changes.
 *
 * Visual edits write back into the real generated HTML — there is no overlay
 * layer (spec Section 7) — so switching back to chat mode operates on the true
 * current state of the site.
 *
 * The generator tags every editable element with data-lumen-id, so we can locate
 * an element without a full HTML parser: find its opening tag, then walk forward
 * counting same-name tags to find the matching close.
 */

export type VisualEdit =
  | { kind: 'text'; lumenId: string; value: string }
  | { kind: 'image'; lumenId: string; src: string; alt?: string }
  | { kind: 'remove'; lumenId: string }
  | { kind: 'token'; name: string; value: string };

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

interface ElementRange {
  tagName: string;
  openStart: number;
  openEnd: number;
  closeStart: number;
  closeEnd: number;
  selfClosing: boolean;
}

function findElement(html: string, lumenId: string): ElementRange | null {
  const escaped = lumenId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const openMatch = new RegExp(`<([a-zA-Z][\\w-]*)([^>]*?\\bdata-lumen-id\\s*=\\s*["']${escaped}["'][^>]*)>`).exec(html);
  if (!openMatch) return null;

  const tagName = openMatch[1].toLowerCase();
  const openStart = openMatch.index;
  const openEnd = openStart + openMatch[0].length;

  if (VOID_ELEMENTS.has(tagName) || openMatch[0].endsWith('/>')) {
    return { tagName, openStart, openEnd, closeStart: openEnd, closeEnd: openEnd, selfClosing: true };
  }

  const tagPattern = new RegExp(`<(/?)${tagName}\\b[^>]*>`, 'gi');
  tagPattern.lastIndex = openEnd;
  let depth = 1;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html)) !== null) {
    if (match[1] === '/') {
      depth -= 1;
      if (depth === 0) {
        return {
          tagName,
          openStart,
          openEnd,
          closeStart: match.index,
          closeEnd: match.index + match[0].length,
          selfClosing: false,
        };
      }
    } else if (!match[0].endsWith('/>')) {
      depth += 1;
    }
  }

  return null;
}

function escapeText(value: string): string {
  return value.replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character]!);
}

function escapeAttribute(value: string): string {
  return value.replace(/[&"<>]/g, (character) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[character]!);
}

function setAttribute(openTag: string, name: string, value: string): string {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(["'])[\\s\\S]*?\\1`);
  const replacement = `${name}="${escapeAttribute(value)}"`;
  if (pattern.test(openTag)) return openTag.replace(pattern, replacement);
  return openTag.replace(/\s*\/?>$/, (tail) => ` ${replacement}${tail.trimStart()}`);
}

export function applyVisualEdits(html: string, edits: VisualEdit[]): { html: string; applied: number } {
  let output = html;
  let applied = 0;

  for (const edit of edits) {
    if (edit.kind === 'token') {
      // Design-system tokens live as CSS custom properties on :root, so a colour
      // change is one declaration rewrite, not a hunt through the markup.
      const pattern = new RegExp(`(--${edit.name.replace(/^--/, '')}\\s*:\\s*)([^;]+)(;)`, 'g');
      const next = output.replace(pattern, `$1${edit.value}$3`);
      if (next !== output) applied += 1;
      output = next;
      continue;
    }

    const range = findElement(output, edit.lumenId);
    if (!range) continue;

    if (edit.kind === 'remove') {
      output = output.slice(0, range.openStart) + output.slice(range.closeEnd);
      applied += 1;
      continue;
    }

    if (edit.kind === 'image') {
      let openTag = output.slice(range.openStart, range.openEnd);
      openTag = setAttribute(openTag, 'src', edit.src);
      if (edit.alt !== undefined) openTag = setAttribute(openTag, 'alt', edit.alt);
      output = output.slice(0, range.openStart) + openTag + output.slice(range.openEnd);
      applied += 1;
      continue;
    }

    // Text: replace only this element's own inner content, keeping the tag,
    // its classes and its id intact.
    if (range.selfClosing) continue;
    output =
      output.slice(0, range.openEnd) + escapeText(edit.value) + output.slice(range.closeStart);
    applied += 1;
  }

  return { html: output, applied };
}

/** Also applied to styles.css so a token change survives in the stylesheet. */
export function applyTokenEditsToCss(css: string, edits: VisualEdit[]): string {
  let output = css;
  for (const edit of edits) {
    if (edit.kind !== 'token') continue;
    const pattern = new RegExp(`(--${edit.name.replace(/^--/, '')}\\s*:\\s*)([^;]+)(;)`, 'g');
    output = output.replace(pattern, `$1${edit.value}$3`);
  }
  return output;
}

import type { SiteFile } from './types';

/**
 * The generator emits files in a line-delimited envelope so we can parse them
 * while they stream, rather than waiting for a whole JSON blob to close:
 *
 *   <<<FILE:index.html>>>
 *   …contents…
 *   <<<END>>>
 */
export const FILE_OPEN = '<<<FILE:';
export const FILE_CLOSE = '<<<END>>>';

export class StreamingFileParser {
  private buffer = '';
  private currentPath: string | null = null;
  private currentLines: string[] = [];
  private readonly files: SiteFile[] = [];

  constructor(
    private readonly onFileStart?: (path: string) => void,
    private readonly onFileComplete?: (file: SiteFile) => void,
  ) {}

  push(chunk: string): void {
    this.buffer += chunk;
    let newlineIndex = this.buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      this.consumeLine(line);
      newlineIndex = this.buffer.indexOf('\n');
    }
  }

  /** Flushes any trailing partial line and closes an unterminated file. */
  finish(): SiteFile[] {
    if (this.buffer.length > 0) {
      this.consumeLine(this.buffer);
      this.buffer = '';
    }
    if (this.currentPath) this.closeCurrent();
    return this.files;
  }

  private consumeLine(rawLine: string): void {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();

    if (trimmed.startsWith(FILE_OPEN) && trimmed.endsWith('>>>')) {
      if (this.currentPath) this.closeCurrent();
      const path = trimmed.slice(FILE_OPEN.length, -3).trim();
      this.currentPath = normalizePath(path);
      this.currentLines = [];
      if (this.currentPath) this.onFileStart?.(this.currentPath);
      return;
    }

    if (trimmed === FILE_CLOSE) {
      this.closeCurrent();
      return;
    }

    if (this.currentPath) this.currentLines.push(line);
  }

  private closeCurrent(): void {
    if (!this.currentPath) return;
    const file: SiteFile = {
      path: this.currentPath,
      content: stripCodeFences(this.currentLines.join('\n')).trimEnd() + '\n',
    };
    this.files.push(file);
    this.onFileComplete?.(file);
    this.currentPath = null;
    this.currentLines = [];
  }
}

/** Models occasionally wrap file bodies in markdown fences anyway. */
function stripCodeFences(content: string): string {
  const lines = content.split('\n');
  if (lines[0]?.trim().startsWith('```')) lines.shift();
  if (lines[lines.length - 1]?.trim() === '```') lines.pop();
  return lines.join('\n');
}

/** Refuses traversal and absolute paths — generated output is untrusted. */
export function normalizePath(path: string): string | null {
  const cleaned = path.replace(/^\/+/, '').replace(/\\/g, '/').trim();
  if (!cleaned || cleaned.includes('..') || cleaned.startsWith('.')) return null;
  if (!/^[\w\-./]+$/.test(cleaned)) return null;
  if (cleaned.split('/').length > 4) return null;
  return cleaned;
}

export function mergeFiles(existing: SiteFile[], incoming: SiteFile[]): SiteFile[] {
  const byPath = new Map(existing.map((file) => [file.path, file]));
  for (const file of incoming) {
    if (file.content.trim() === '<<<DELETE>>>') byPath.delete(file.path);
    else byPath.set(file.path, file);
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

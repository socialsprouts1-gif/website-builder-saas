import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createProjectSchema, MAX_BRIEF, MAX_CHAT_MESSAGE } from './validation';

/**
 * Every ceiling a brief passes through, checked together.
 *
 * Raising one and leaving another behind is exactly what happened: the project
 * schema went to twenty thousand characters while the interview endpoint —
 * which is the *first* thing the new-site screen calls, before anything is
 * built — stayed at two thousand. So a long brief was still refused, by a
 * different route, with an error naming a number nothing on screen explained.
 *
 * These read the source rather than calling the endpoints, because the point
 * is to catch a limit somebody forgot, and a limit somebody forgot is a
 * number in a file.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('the brief limit', () => {
  it('is what the product says it is', () => {
    expect(MAX_BRIEF).toBe(20_000);
  });

  it('accepts a brief right up to it', () => {
    const parsed = createProjectSchema.safeParse({ prompt: 'a'.repeat(MAX_BRIEF) });
    expect(parsed.success).toBe(true);
  });

  it('refuses one past it rather than truncating silently', () => {
    const parsed = createProjectSchema.safeParse({ prompt: 'a'.repeat(MAX_BRIEF + 1) });
    expect(parsed.success).toBe(false);
  });

  it('still insists on something to work from', () => {
    expect(createProjectSchema.safeParse({ prompt: 'hi' }).success).toBe(false);
    expect(createProjectSchema.safeParse({ prompt: '' }).success).toBe(false);
  });

  /**
   * The one that bit. Continue on the new-site screen calls this before the
   * project exists, so its limit is the one a person meets first.
   */
  it('is the same on the endpoint the new-site screen calls first', () => {
    const route = read('src/app/api/interview/route.ts');
    expect(route).toContain('MAX_BRIEF');
    expect(route).not.toMatch(/prompt:\s*z\.string\(\)[^\n]*\.max\(\d/);
  });

  it('is the same on the endpoint that creates the project', () => {
    const validation = read('src/lib/validation.ts');
    expect(validation).toContain('.max(MAX_BRIEF)');
  });

  /** Nothing that takes a brief may quietly carry its own smaller number. */
  it('leaves no hard-coded 2000 on any prompt field', () => {
    for (const path of ['src/lib/validation.ts', 'src/app/api/interview/route.ts']) {
      const source = read(path);
      const promptLines = source
        .split('\n')
        .filter((line) => /\bprompt\s*:/.test(line) && /z\.string/.test(line));
      for (const line of promptLines) {
        expect(line, `${path}: ${line.trim()}`).not.toMatch(/\.max\(\s*2000\s*\)/);
      }
    }
  });
});

describe('the chat message limit', () => {
  it('is generous enough for a pasted instruction', () => {
    expect(MAX_CHAT_MESSAGE).toBeGreaterThanOrEqual(4_000);
    expect(MAX_CHAT_MESSAGE).toBeLessThanOrEqual(MAX_BRIEF);
  });
});

import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * The tests this project should have had from the start.
 *
 * Every regression fixed in the last week was caused by something this file
 * would have caught: a build step that looped because two writes raced, a step
 * list that showed two things happening at once, a model picker that offered
 * embeddings. They were all found by hand, twice.
 *
 * The rules here are all about running real source rather than a copy of it.
 * `server-only` is a build-time guard, not behaviour, so it is stubbed; the
 * `@/` alias matches tsconfig so a test imports exactly what the app imports.
 */
export default defineConfig({
  resolve: {
    alias: {
      // Marks a module as never reaching the browser. Meaningless in a test
      // runner, and it throws if it is actually imported.
      'server-only': fileURLToPath(new URL('./tests/server-only.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
});

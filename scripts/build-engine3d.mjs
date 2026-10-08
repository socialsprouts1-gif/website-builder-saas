/**
 * Bundles the 3D runtime into one file that a generated site can load.
 *
 * The output is committed and served from `public/`, for one reason: a
 * published site runs under `script-src 'self'`, so it can only load scripts
 * from its own origin. Lumen's origin is that origin — a custom domain points
 * at the same app — so `/lumen3d.js` is same-origin for every published site,
 * is the same bytes for all of them, and is cached once.
 *
 * Run with `npm run build:engine` after changing anything under src/engine3d.
 */
import { build } from 'esbuild';
import { statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const out = 'public/lumen3d.js';

await build({
  entryPoints: ['src/engine3d/index.ts'],
  outfile: out,
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  legalComments: 'none',
  // three ships its own licence banner in every build; one copy is correct.
  banner: { js: '/*! Lumen 3D runtime — bundles three.js (MIT, © three.js authors) */' },
});

const bytes = statSync(out).size;
const gzip = gzipSync(readFileSync(out)).length;
console.log(`${out}  ${(bytes / 1024).toFixed(0)} KB raw  ${(gzip / 1024).toFixed(0)} KB gzip`);

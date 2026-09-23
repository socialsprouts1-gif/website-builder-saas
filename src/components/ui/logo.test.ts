import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

/**
 * The mark lives as artwork, not as code, so the thing that can rot is a path:
 * a file renamed in `public/` or `src/app/` breaks the logo everywhere at once
 * and does so silently, because a missing image renders as nothing.
 */
describe('the Lumen mark', () => {
  const surfaces = [
    'src/components/ui/Logo.tsx',
    'src/app/global-error.tsx',
    'src/app/layout.tsx',
    'src/app/manifest.ts',
  ];

  it('is the same file on every surface that draws it', () => {
    for (const surface of surfaces) {
      expect(read(surface), surface).toContain('/lumen-mark.png');
    }
  });

  it('ships every file those surfaces ask for', () => {
    const wanted = new Set<string>();
    for (const surface of surfaces) {
      for (const [, name] of read(surface).matchAll(/["'(]\/(lumen-mark[\w-]*\.png)/g)) {
        wanted.add(name);
      }
    }
    expect(wanted.size).toBeGreaterThan(0);
    for (const name of wanted) {
      expect(existsSync(join(root, 'public', name)), `public/${name}`).toBe(true);
    }
  });

  it('gives the browser a tab icon, a home-screen icon and an .ico', () => {
    for (const file of ['src/app/icon.png', 'src/app/apple-icon.png', 'src/app/favicon.ico']) {
      expect(existsSync(join(root, file)), file).toBe(true);
    }
  });

  it('has no second mark left drawn in code', () => {
    // The old mark was three circles and a triangle, inline in the component.
    expect(read('src/components/ui/Logo.tsx')).not.toContain('<circle');
    expect(existsSync(join(root, 'src/app/icon.svg'))).toBe(false);
  });
});

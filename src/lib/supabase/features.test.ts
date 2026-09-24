import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Each probe has to name a table or column that a migration really creates.
 *
 * A probe pointed at something that does not exist reports its feature missing
 * forever, which turns the banner into noise and — worse — makes the shop check
 * refuse every build. So the names here are checked against the migration files
 * themselves rather than against memory.
 */
const source = readFileSync(join(process.cwd(), 'src/lib/supabase/features.ts'), 'utf8');
const sql = readFileSync(join(process.cwd(), 'supabase/setup.sql'), 'utf8');

const probes = [...source.matchAll(/\{\s*id: '([a-z]+)',\s*table: '([a-z_]+)',(?:\s*column: '([a-z_]+)',)?/g)].map(
  ([, id, table, column]) => ({ id, table, column }),
);

describe('the migration probes', () => {
  it('found the probes to check', () => {
    expect(probes.length).toBeGreaterThanOrEqual(5);
    expect(probes.map((p) => p.id)).toContain('shop');
  });

  it.each(probes.map((p) => [p.id, p] as const))('%s points at something the SQL creates', (_id, probe) => {
    if (probe.column) {
      expect(sql, `${probe.table}.${probe.column}`).toMatch(
        new RegExp(`add column if not exists ${probe.column}\\b`, 'i'),
      );
    } else {
      expect(sql, probe.table).toMatch(new RegExp(`create table if not exists public\\.${probe.table}\\b`, 'i'));
    }
  });

  it('names the migration file that adds each one, and that file exists', () => {
    const files = [...source.matchAll(/migration: '([\w.]+)'/g)].map(([, file]) => file);
    expect(files.length).toBe(probes.length);
    for (const file of new Set(files)) {
      expect(() => readFileSync(join(process.cwd(), 'supabase/migrations', file))).not.toThrow();
    }
  });

  /**
   * The shop probe is the one with teeth — it refuses a build. Getting its
   * table name wrong would block every e-commerce site on a database that is
   * perfectly fine.
   */
  it('checks the shop against the table the shop actually reads', () => {
    const shop = probes.find((probe) => probe.id === 'shop')!;
    expect(shop.table).toBe('shop_products');
    expect(readFileSync(join(process.cwd(), 'src/lib/shop/load.ts'), 'utf8')).toContain(shop.table);
  });
});

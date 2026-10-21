/**
 * One table's own part of `supabase/setup.sql`.
 *
 * The tests that check what a table refuses used to slice from its CREATE to
 * the end of the file, which read every policy written after it as one of its
 * own. That was harmless only while nothing came after. Adding a table with an
 * ordinary `for all` policy turned two passing tests red and said the credit
 * grants table let people write themselves a balance — which it does not.
 *
 * A section ends where the next table begins.
 */
export function sqlSection(sql: string, table: string): string {
  const start = sql.indexOf(`create table if not exists public.${table}`);
  if (start === -1) return '';

  const next = sql.indexOf('create table if not exists public.', start + 1);
  return next === -1 ? sql.slice(start) : sql.slice(start, next);
}

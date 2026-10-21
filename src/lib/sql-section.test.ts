import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sqlSection } from './sql-section';

const sql = readFileSync(join(process.cwd(), 'supabase/setup.sql'), 'utf8');

describe('one table’s part of the schema', () => {
  it('starts at the table and stops at the next one', () => {
    const section = sqlSection(sql, 'credit_grants');
    expect(section).toContain('create table if not exists public.credit_grants');
    expect(section.indexOf('create table if not exists public.')).toBe(0);
    expect(section.slice(1)).not.toContain('create table if not exists public.');
  });

  /** The failure that made this exist: a later table's policy read as this one's. */
  it('does not carry a later table’s policies', () => {
    expect(sqlSection(sql, 'credit_grants')).not.toContain('public.custom_domains');
  });

  it('reads the last table in the file to the end', () => {
    const last = sqlSection(sql, 'custom_domains');
    expect(last).toContain('custom_domains_hostname_key');
  });

  it('is empty for a table that is not there', () => {
    expect(sqlSection(sql, 'no_such_table')).toBe('');
  });
});

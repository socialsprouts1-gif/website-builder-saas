import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(join(process.cwd(), 'supabase/setup.sql'), 'utf8');
const grants = sql.slice(sql.indexOf('create table if not exists public.credit_grants'));

/**
 * Credits given by hand are money. The table they live in is the one place
 * somebody could give themselves an unlimited account, so what it refuses
 * matters more than what it stores.
 */
describe('the credit_grants table', () => {
  it('exists, and is installed by the one file people actually run', () => {
    expect(sql).toContain('create table if not exists public.credit_grants');
    expect(grants).toContain('credits integer not null');
    expect(grants).toContain('references public.users (id) on delete cascade');
  });

  it('records who gave them and why, so a number can be explained later', () => {
    expect(grants).toContain('reason text');
    expect(grants).toContain('granted_by uuid');
    expect(grants).toContain('created_at timestamptz');
  });

  /**
   * The whole point. Row-level security with no insert or update policy means
   * the only way a row appears is through the service role — which is reached
   * only by grantCredits(), which calls requireAdmin() first.
   */
  it('lets nobody write themselves a balance', () => {
    expect(grants).toContain('alter table public.credit_grants enable row level security');
    const policies = grants.match(/create policy[\s\S]*?;/g) ?? [];
    expect(policies.length).toBeGreaterThan(0);
    for (const policy of policies) {
      expect(policy, policy).toMatch(/for select/);
      expect(policy, policy).not.toMatch(/for (insert|update|delete|all)/);
    }
  });

  it('lets an account see what it was given, because the meter counts it', () => {
    expect(grants).toContain('user_id = auth.uid()');
  });
});

describe('granting them', () => {
  const admin = readFileSync(join(process.cwd(), 'src/lib/admin.ts'), 'utf8');

  it('is behind requireAdmin, like everything else in the panel', () => {
    const fn = admin.slice(admin.indexOf('export async function grantCredits'));
    expect(fn.slice(0, 400)).toContain('await requireAdmin()');
  });

  it('refuses a fraction, a zero, and an amount nobody meant to type', () => {
    const fn = admin.slice(admin.indexOf('export async function grantCredits'));
    expect(fn).toContain('Number.isInteger(credits)');
    expect(fn).toContain('credits === 0');
    expect(fn).toMatch(/Math\.abs\(credits\) > 10_?000/);
  });
});

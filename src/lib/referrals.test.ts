import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CREDIT_COST, FREE_CREDITS } from '@/lib/env';
import { REFERRAL_CREDITS } from './referrals.shared';
import { normaliseCode } from './referral-code';

describe('a referral code', () => {
  it('survives being read down a phone and typed back in', () => {
    expect(normaliseCode(' k7m-3qp x ')).toBe('K7M3QPX');
    expect(normaliseCode('k7m3qpx')).toBe('K7M3QPX');
    expect(normaliseCode('K7M3QPX')).toBe('K7M3QPX');
  });

  it('is nothing when there is nothing in it', () => {
    expect(normaliseCode('')).toBe('');
    expect(normaliseCode('   ')).toBe('');
    expect(normaliseCode('!!!')).toBe('');
  });

  it('cannot be stretched into something long enough to probe with', () => {
    expect(normaliseCode('A'.repeat(500))).toHaveLength(12);
  });

  /**
   * The alphabet leaves out I, O, 0 and 1 — the four characters that turn
   * "did you get the code?" into a conversation about handwriting.
   */
  it('is generated without the characters people confuse', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/referrals.ts'), 'utf8');
    const alphabet = source.match(/const ALPHABET = '([^']+)'/)?.[1] ?? '';
    expect(alphabet.length).toBeGreaterThan(20);
    for (const character of ['I', 'O', '0', '1']) {
      expect(alphabet, `${character} is ambiguous`).not.toContain(character);
    }
  });
});

describe('what a referral is worth', () => {
  it('is whole websites on both sides, not a number that means nothing', () => {
    expect(REFERRAL_CREDITS % CREDIT_COST.generation).toBe(0);
    expect(REFERRAL_CREDITS / CREDIT_COST.generation).toBeGreaterThanOrEqual(1);
  });

  it('is worth telling somebody about, next to what they already get', () => {
    expect(REFERRAL_CREDITS).toBeGreaterThanOrEqual(FREE_CREDITS / 2);
  });
});

describe('the referrals table', () => {
  const sql = readFileSync(join(process.cwd(), 'supabase/setup.sql'), 'utf8');
  const referrals = sql.slice(sql.indexOf('create table if not exists public.referrals'));

  /**
   * The rows pay out in credits, so every way of getting a second one for the
   * same account is a way of minting them. The unique index is the only thing
   * that can refuse two requests that arrive at the same moment.
   */
  it('lets an account be referred exactly once', () => {
    expect(sql).toContain('create unique index if not exists referrals_referred_idx');
    expect(referrals).toContain('referred_id');
  });

  it('refuses somebody referring themselves, in the database', () => {
    expect(referrals).toContain('referrals_not_self');
    expect(referrals).toMatch(/check \(referrer_id <> referred_id\)/);
  });

  it('is read-only to everybody, like the grants it pays out', () => {
    expect(referrals).toContain('alter table public.referrals enable row level security');
    const policies = referrals.match(/create policy[\s\S]*?;/g) ?? [];
    expect(policies.length).toBeGreaterThan(0);
    for (const policy of policies) {
      expect(policy, policy).toMatch(/for select/);
      expect(policy, policy).not.toMatch(/for (insert|update|delete|all)/);
    }
  });

  it('gives each account a code that is theirs alone', () => {
    expect(sql).toContain('users_referral_code_idx');
    expect(sql).toMatch(/create unique index[\s\S]{0,120}users \(referral_code\)/);
  });
});

describe('claiming one', () => {
  const source = readFileSync(join(process.cwd(), 'src/lib/referrals.ts'), 'utf8');

  it('leans on the unique index rather than checking first', () => {
    // A check-then-write loses to two taps on a slow connection. 23505 is the
    // unique violation, and treating it as "already done" is what makes the
    // second tap harmless.
    expect(source).toContain("'23505'");
    expect(source).toContain('already_referred');
  });

  it('caps what one code can mint', () => {
    expect(source).toContain('REFERRAL_LIMIT');
    expect(source).toMatch(/<= REFERRAL_LIMIT/);
  });

  it('never pays somebody for referring themselves', () => {
    expect(source).toContain("reason: 'self'");
  });
});

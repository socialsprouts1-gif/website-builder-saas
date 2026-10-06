import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { REFERRAL_CREDITS, type ReferralState } from '@/lib/referrals.shared';
import { normaliseCode } from '@/lib/referral-code';

/**
 * Bring somebody in, both of you get credits.
 *
 * The reward is a credit_grants row, which is the point of having built grants
 * first: a referral credit and a founder's gift are the same thing to the
 * person receiving it, and the balance already knows how to count them.
 *
 * Everything here is written through the service role. A referral pays out, so
 * it cannot be something a browser is trusted to assert — the client sends a
 * code, and this decides whether it means anything.
 */

export { REFERRAL_CREDITS };
export type { ReferralState };

/**
 * How many referrals are paid for.
 *
 * Not a trust problem so much as an arithmetic one: a code posted somewhere
 * public could mint credits all afternoon. Twenty is far more than anybody
 * recommending a tool to people they know will reach.
 */
export const REFERRAL_LIMIT = 20;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * A code somebody can read down a phone.
 *
 * No I, O, 0 or 1 — the four characters that turn "did you get it?" into a
 * conversation about handwriting.
 */
function newCode(): string {
  let code = '';
  for (let index = 0; index < 7; index += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export { normaliseCode };

/**
 * This account's code, made on the first ask rather than at signup.
 *
 * Most accounts never refer anybody, and a column filled in for all of them is
 * a migration that has to invent values for rows that will never use them.
 */
export async function referralCodeFor(userId: string): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: existing, error } = await supabase
    .from('users')
    .select('referral_code')
    .eq('id', userId)
    .maybeSingle();

  // The column arrives in migration 0022. Until then there is no referring to
  // be done, and the panel says so rather than failing.
  if (error) return null;
  if (existing?.referral_code) return existing.referral_code;

  // A collision is a one-in-thirty-four-billion event per attempt; three tries
  // is the difference between handling it and pretending it cannot happen.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = newCode();
    const { error: writeError } = await supabase
      .from('users')
      .update({ referral_code: code })
      .eq('id', userId);
    if (!writeError) return code;
  }

  return null;
}

export async function referralState(userId: string): Promise<ReferralState> {
  const code = await referralCodeFor(userId);
  const supabase = createAdminClient();

  const { count } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', userId);

  const joined = count ?? 0;
  return {
    code,
    joined,
    creditsEarned: Math.min(joined, REFERRAL_LIMIT) * REFERRAL_CREDITS,
    limit: REFERRAL_LIMIT,
  };
}

export type ClaimResult =
  | { ok: true; credits: number }
  | { ok: false; reason: 'unknown_code' | 'self' | 'already_referred' | 'unavailable' };

/**
 * Records that this account came from somebody's code, and pays both sides.
 *
 * Idempotent by the unique index on referred_id rather than by a check-then-
 * write: two taps on a slow connection are two requests, and the only thing
 * that can refuse the second one reliably is the database.
 */
export async function claimReferral(userId: string, rawCode: string): Promise<ClaimResult> {
  const code = normaliseCode(rawCode);
  if (!code) return { ok: false, reason: 'unknown_code' };

  const supabase = createAdminClient();

  const { data: referrer, error: lookupError } = await supabase
    .from('users')
    .select('id')
    .eq('referral_code', code)
    .maybeSingle();

  if (lookupError) return { ok: false, reason: 'unavailable' };
  if (!referrer) return { ok: false, reason: 'unknown_code' };
  if (referrer.id === userId) return { ok: false, reason: 'self' };

  const { error: insertError } = await supabase
    .from('referrals')
    .insert({ referrer_id: referrer.id, referred_id: userId, code });

  // 23505 is the unique violation: this account was already referred. Not an
  // error worth showing — it is the second tap of a button that worked.
  if (insertError) {
    return { ok: false, reason: insertError.code === '23505' ? 'already_referred' : 'unavailable' };
  }

  // Both sides, in one write. The referrer's is capped; the new account's is
  // not, because theirs is the reason they typed the code in the first place.
  const { count } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referrer.id);

  const grants = [
    {
      user_id: userId,
      credits: REFERRAL_CREDITS,
      reason: `Joined with referral code ${code}`,
      granted_by: referrer.id,
    },
  ];

  if ((count ?? 1) <= REFERRAL_LIMIT) {
    grants.push({
      user_id: referrer.id,
      credits: REFERRAL_CREDITS,
      reason: 'Referred a new account',
      granted_by: referrer.id,
    });
  }

  await supabase.from('credit_grants').insert(grants);

  return { ok: true, credits: REFERRAL_CREDITS };
}

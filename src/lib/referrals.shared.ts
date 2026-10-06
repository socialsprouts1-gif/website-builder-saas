import { CREDIT_COST } from '@/lib/env';

/**
 * The parts of the referral scheme the browser is allowed to know.
 *
 * Split from referrals.ts because that file is server-only — it writes credit
 * grants — and the panel showing somebody their own link is not. The numbers
 * live here so both halves quote the same ones.
 */
export const REFERRAL_CREDITS = CREDIT_COST.generation * 2;

export interface ReferralState {
  code: string | null;
  joined: number;
  creditsEarned: number;
  limit: number;
}

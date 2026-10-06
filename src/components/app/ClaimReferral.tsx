'use client';

import { useEffect } from 'react';
import { claimRememberedReferral } from '@/components/auth/AuthForm';

/**
 * Redeems a remembered referral code on the first app screen after signing in.
 *
 * Mounted in the app shell rather than on the sign-up form, because not every
 * way into an account goes back through that form: a Google sign-in leaves
 * through an OAuth redirect and comes back to a server route, and a confirmed
 * email can be opened an hour later. All of them end up here.
 *
 * It does nothing at all when there is nothing stored, which is every visit
 * but the one.
 */
export function ClaimReferral() {
  useEffect(() => {
    void claimRememberedReferral();
  }, []);
  return null;
}

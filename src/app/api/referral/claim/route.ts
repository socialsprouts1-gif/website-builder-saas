import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { claimReferral } from '@/lib/referrals';
import { handleRouteError, jsonError } from '@/lib/api';
import { RATE_LIMITS, rateLimitUser } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const bodySchema = z.object({ code: z.string().trim().min(3).max(16) });

/**
 * "I came from this person's link."
 *
 * Called once, by the browser, as soon as a session exists — which is the only
 * moment both halves are known: the code was typed before there was an account,
 * and the account exists before anything has been built. Rate limited because
 * the honest version of this is called once and the dishonest one is a loop.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const limit = await rateLimitUser(
      user.id,
      `referral:${user.id}`,
      10,
      RATE_LIMITS.chatEdit.windowSeconds,
    );
    if (!limit.allowed) return jsonError('Slow down a moment.', 429);

    const { code } = bodySchema.parse(await request.json());
    const result = await claimReferral(user.id, code);

    // A code that does not resolve is not an error the new account should be
    // made to deal with — they did their part. The reason is returned for the
    // one screen that asks, and shown nowhere else.
    return NextResponse.json(result, { status: 200 });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { lookupPlace } from '@/lib/google/places';
import { RATE_LIMITS, rateLimitUser } from '@/lib/rate-limit';
import { handleRouteError, jsonError, planRequired } from '@/lib/api';
import { getAllowance } from '@/lib/allowance';
import { planAllows } from '@/lib/plans';

export const runtime = 'nodejs';

const bodySchema = z.object({ url: z.string().trim().min(2).max(2000) });

/** Resolves a pasted Google link to the listing behind it, for confirmation. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    // Reading somebody's listing costs a Places call, so the gate is here and
    // not only on the screen that usually asks for it.
    const allowance = await getAllowance(user.id);
    if (!planAllows(allowance.tier, 'google_import')) {
      return planRequired('Building from a Google listing is on the Premium plan.');
    }

    const limit = await rateLimitUser(
      user.id,
      `places:${user.id}`,
      RATE_LIMITS.chatEdit.limit,
      RATE_LIMITS.chatEdit.windowSeconds,
    );
    if (!limit.allowed) return jsonError('Too many lookups. Give it a minute.', 429);

    const { url } = bodySchema.parse(await request.json());
    const place = await lookupPlace(url, user.id);

    if (!place) {
      return jsonError(
        'No business found for that. Paste the link from the Share button on your Google listing, or type the business name and town.',
        404,
      );
    }

    return NextResponse.json({ place });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleRouteError, jsonError } from '@/lib/api';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const bodySchema = z.object({
  brief: z.string().trim().min(10, 'Tell Lumen a little more about it.').max(2000),
  category: z.string().trim().max(60).nullable().optional(),
  email: z.string().trim().email('That does not look like an email address.').max(160).optional(),
});

/**
 * A brief for a feature that is still being built.
 *
 * Public, because the most valuable version of this row comes from somebody
 * who has not signed up yet and is telling us exactly what would make them.
 * Rate limited by address for the same reason: anything a stranger can write
 * to is something a stranger will write to all night.
 */
export async function POST(request: NextRequest) {
  try {
    const limit = await rateLimit(
      `studio:${clientAddress(request)}`,
      10,
      RATE_LIMITS.chatEdit.windowSeconds,
    );
    if (!limit.allowed) return jsonError('Thanks — that is plenty for now.', 429);

    const body = bodySchema.parse(await request.json());

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

    const { error } = await createAdminClient().from('studio_interest').insert({
      user_id: user?.id ?? null,
      email: body.email ?? user?.email ?? null,
      brief: body.brief,
      category: body.category ?? null,
    });

    // The table arrives in migration 0023. A deployment part-way through its
    // migrations should not show somebody an error for being enthusiastic.
    if (error) return NextResponse.json({ saved: false });

    return NextResponse.json({ saved: true });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

/** Whoever is in front of the proxy, falling back to one shared bucket. */
function clientAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

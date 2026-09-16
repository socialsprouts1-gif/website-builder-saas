import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * An enquiry from someone's published site.
 *
 * Open by necessity: the person filling in the form is a customer, not a Lumen
 * user, and has no session. So nothing here trusts the caller. The slug is the
 * only thing that decides which project a lead lands in, the write happens with
 * the service role because the visitor must never hold a key that can read
 * anything back, and everything typed is stored as text and rendered as text.
 */

const bodySchema = z.object({
  name: z.string().trim().max(200).optional(),
  contact: z.string().trim().max(200).optional(),
  message: z.string().trim().max(4000).optional(),
  page: z.string().trim().max(200).optional(),
  /**
   * A field no human ever sees, so no human ever fills it in.
   *
   * The cheapest spam filter there is, and it costs a real visitor nothing —
   * no puzzle, no third-party script, no cookie.
   */
  website: z.string().max(200).optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;

    // Per-address, because there is no account to limit. Generous enough that a
    // family sharing an office connection is never turned away.
    const limit = await rateLimit(`lead:${clientAddress(request)}`, 10, 60 * 10);
    if (!limit.allowed) return jsonError('Too many enquiries just now. Try again shortly.', 429);

    const body = bodySchema.parse(await request.json());

    // Something filled the hidden field, so it was not a person. Answered with
    // success on purpose: a bot that learns it was caught comes back smarter.
    if (body.website) return NextResponse.json({ ok: true });

    const name = body.name?.trim() ?? '';
    const contact = body.contact?.trim() ?? '';
    const message = body.message?.trim() ?? '';
    if (!name && !contact && !message) return jsonError('Nothing to send', 422);

    const admin = createAdminClient();
    const { data: project } = await admin
      .from('projects')
      .select('id')
      .eq('public_slug', slug)
      .not('published_at', 'is', null)
      .maybeSingle();

    // A lead for a site that is not published has nowhere to go, and saying so
    // would tell a stranger which slugs exist.
    if (!project) return NextResponse.json({ ok: true });

    const { error } = await admin.from('leads').insert({
      project_id: project.id,
      name: name || null,
      contact: contact || null,
      message: message || null,
      page: body.page?.slice(0, 200) || null,
    });

    if (error) return jsonError('That could not be sent. Please call instead.', 500);

    return NextResponse.json({ ok: true });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

/** Whoever is in front of the proxy, falling back to one shared bucket. */
function clientAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

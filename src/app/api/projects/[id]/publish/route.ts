import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleRouteError, jsonError } from '@/lib/api';
import { baseSlug, slugCandidate } from '@/lib/publish';

export const runtime = 'nodejs';

const bodySchema = z.object({
  action: z.enum(['publish', 'unpublish', 'rename']).default('publish'),
  slug: z.string().trim().max(60).optional(),
});

/**
 * A public address on Lumen, before anyone buys a domain.
 *
 * Most people want to send the site to someone the minute it exists — a
 * partner, a customer, themselves on a phone. Making that wait for a domain
 * purchase is the wrong order.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    // RLS scopes this to the caller, so a hit proves ownership.
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, slug, status, public_slug')
      .eq('id', id)
      .maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const body = bodySchema.parse(await request.json().catch(() => ({})));
    const admin = createAdminClient();

    if (body.action === 'unpublish') {
      await admin.from('projects').update({ published_at: null }).eq('id', id);
      return NextResponse.json({ published: false });
    }

    if (project.status !== 'ready') {
      return jsonError('Wait for the site to finish building before publishing it.', 409);
    }

    const wanted = baseSlug(body.slug ?? project.public_slug ?? project.name ?? project.slug);
    if (!wanted) return jsonError('Choose an address with some letters in it.', 422);

    const slug = await claimSlug(id, wanted);
    if (!slug) return jsonError('That address is taken. Try another.', 409);

    const { error } = await admin
      .from('projects')
      .update({ public_slug: slug, published_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      // The publish columns arrive in migration 0008; say so rather than
      // failing with a database error nobody can act on.
      return jsonError(
        'This database has not been set up for publishing yet — run supabase/setup.sql.',
        503,
      );
    }

    return NextResponse.json({ published: true, slug });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

/**
 * Takes the address, or the first free variant of it.
 *
 * A unique index does the deciding, so two people publishing "hairtie" at the
 * same moment cannot both get it.
 */
async function claimSlug(projectId: string, base: string): Promise<string | null> {
  const admin = createAdminClient();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = slugCandidate(base, attempt);
    const { data: taken } = await admin
      .from('projects')
      .select('id')
      .eq('public_slug', candidate)
      .maybeSingle();

    if (!taken || taken.id === projectId) return candidate;
  }
  return null;
}

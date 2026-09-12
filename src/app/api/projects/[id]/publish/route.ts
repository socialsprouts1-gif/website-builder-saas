import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleRouteError, jsonError } from '@/lib/api';
import { baseSlug, slugCandidate } from '@/lib/publish';

export const runtime = 'nodejs';

/**
 * Publishing needs three columns that arrive in migration 0008. Naming the file
 * and where it goes is the whole remedy, so the message carries it — a database
 * error nobody can act on is how this looked before.
 */
const SETUP_NEEDED =
  'This database is missing the publishing columns. Open supabase/setup.sql from the repo, paste the whole file into the Supabase SQL editor (Dashboard → SQL Editor → New query) and run it. It is safe to re-run.';

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
    //
    // Deliberately does not ask for the publish columns. They arrive in
    // migration 0008, and on a database that has not run it this select fails
    // as a whole — which reported "Project not found" for a project that was
    // right there on screen, and sent everyone looking in the wrong place.
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, slug, status')
      .eq('id', id)
      .maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    // Asked for separately and allowed to fail, for the same reason.
    const { data: current } = await supabase
      .from('projects')
      .select('public_slug')
      .eq('id', id)
      .maybeSingle();

    const body = bodySchema.parse(await request.json().catch(() => ({})));
    const admin = createAdminClient();

    if (body.action === 'unpublish') {
      const { error } = await admin.from('projects').update({ published_at: null }).eq('id', id);
      if (error) return jsonError(SETUP_NEEDED, 503);
      return NextResponse.json({ published: false });
    }

    if (project.status !== 'ready') {
      return jsonError('Wait for the site to finish building before publishing it.', 409);
    }

    const wanted = baseSlug(body.slug ?? current?.public_slug ?? project.name ?? project.slug);
    if (!wanted) return jsonError('Choose an address with some letters in it.', 422);

    const slug = await claimSlug(id, wanted);
    if (!slug) return jsonError('That address is taken. Try another.', 409);

    const { error } = await admin
      .from('projects')
      .update({ public_slug: slug, published_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return jsonError(SETUP_NEEDED, 503);

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

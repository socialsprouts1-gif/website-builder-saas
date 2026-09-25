import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * Deletes a project and everything hanging off it.
 *
 * Versions, jobs, chat and connector rows all cascade from the projects row
 * (see 0001_init.sql), so one delete is enough.
 */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    // RLS scopes this to the caller; a hit is what proves they own it.
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    // Into the trash rather than gone. One click used to destroy every
    // version, every page and every order attached to the only copy of
    // somebody's website; it now stops serving and waits to be emptied.
    //
    // `?purge=1` is the second press, from the trash itself, and that one is
    // the real delete.
    const purge = _request.nextUrl.searchParams.get('purge') === '1';
    const admin = createAdminClient();

    const { error } = purge
      ? await admin.from('projects').delete().eq('id', id).eq('user_id', user.id)
      : await admin
          .from('projects')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id);

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ deleted: true, purged: purge });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

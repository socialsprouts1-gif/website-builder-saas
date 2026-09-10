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
      .maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const { error } = await createAdminClient()
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ deleted: true });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

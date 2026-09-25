import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

/** Out of the trash, exactly as it was. */
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const { error } = await createAdminClient()
      .from('projects')
      .update({ deleted_at: null })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ restored: true });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

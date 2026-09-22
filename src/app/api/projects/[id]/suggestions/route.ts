import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentFiles } from '@/lib/generation/storage';
import { suggestNext } from '@/lib/generation/suggest';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * What this site could have next.
 *
 * Read from the site itself every time rather than decided once at build, so
 * the list shrinks as things get added — press "Customer reviews", and by the
 * time the edit lands it is no longer on offer.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
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
      .select('id, name, business_type, description')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const files = await getCurrentFiles(id).catch(() => []);
    const suggestions = suggestNext(files, {
      hint: [project.business_type, project.name, project.description].filter(Boolean).join(' '),
    });

    return NextResponse.json({ suggestions });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

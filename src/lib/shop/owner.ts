import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api';

/**
 * The project this request is allowed to touch.
 *
 * Row-level security scopes the select to the caller, so a hit is itself the
 * proof of ownership — there is no separate check to forget. Every shop route
 * the owner uses starts here and then writes with the service role, which is
 * how the public shop pages can be served without anyone holding a key.
 */
export async function ownedProject(
  id: string,
): Promise<{ projectId: string } | { error: Response }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: jsonError('Sign in first', 401) };

  const { data: project } = await supabase.from('projects').select('id').eq('id', id).maybeSingle();
  if (!project) return { error: jsonError('Project not found', 404) };

  return { projectId: project.id };
}

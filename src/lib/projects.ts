import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api';

/**
 * The project this request is allowed to touch, proved rather than assumed.
 *
 * Most of this app used to establish ownership by selecting the project
 * through row-level security and treating a hit as proof — "RLS scopes this to
 * the caller, so a hit proves ownership" — and then writing with the service
 * role, which bypasses row-level security entirely.
 *
 * That reasoning was one policy deep, and the policy was wrong. Migration 0008
 * made every published project selectable by anyone signed in, so for any
 * published site the proof was false and the write went ahead: one account
 * could edit another's pages, read its orders and change its shop. The policy
 * is dropped in 0016, and ownership is checked here as well, because a
 * security property that exists in exactly one place is a security property
 * that breaks the next time somebody adds a policy.
 */
export async function ownedProject(
  projectId: string,
): Promise<{ userId: string; projectId: string } | { error: Response }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: jsonError('Sign in first', 401) };

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    // Said out loud, not left to a policy.
    .eq('user_id', user.id)
    .maybeSingle();

  if (!project) return { error: jsonError('Project not found', 404) };

  return { userId: user.id, projectId: project.id };
}

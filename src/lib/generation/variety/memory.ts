import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Fingerprint } from './index';

/**
 * What this account has already been given.
 *
 * The memory that stops chance handing somebody the same direction twice in
 * five builds — which is exactly when a person notices and concludes the
 * product only knows one trick.
 *
 * Read off the projects themselves rather than a separate log: the direction
 * is already stored on each build, so there is no second table to keep in step
 * and no way for the memory to disagree with what was actually made.
 *
 * Never throws. A build must not fail because the memory could not be read —
 * the worst case is a site that resembles an earlier one, which is the old
 * behaviour and still a site.
 */
export async function recentDirections(userId: string, limit = 10): Promise<Fingerprint[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('projects')
    .select('direction, created_at')
    .eq('user_id', userId)
    .eq('is_template', false)
    .not('direction', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const prints: Fingerprint[] = [];
  for (const row of data) {
    const value = row.direction as Partial<Fingerprint> | null;
    if (!value || typeof value.archetype !== 'string') continue;
    prints.push({
      archetype: value.archetype,
      fonts: typeof value.fonts === 'string' ? value.fonts : '',
      hue: typeof value.hue === 'number' ? value.hue : 0,
      recipe: typeof value.recipe === 'string' ? value.recipe : '',
      rig: typeof value.rig === 'string' ? value.rig : '',
    });
  }
  return prints;
}

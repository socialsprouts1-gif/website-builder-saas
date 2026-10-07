'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Marks one flagged item as dealt with.
 *
 * The queue was read-only when it lived on the Operations page, which made it
 * a list that only ever grew: the same item was re-read every time somebody
 * opened the page, and there was no way to say "looked at it, it is fine".
 *
 * `requireAdmin` rather than a trust in the layout — a server action is its own
 * entry point and is reachable by anyone who can post to it, whatever page it
 * was rendered on.
 */
export async function resolveFlagAction(id: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = createAdminClient();
  const { error } = await supabase.from('flagged_content').update({ resolved: true }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/flagged');
  revalidatePath('/admin');
  return { ok: true };
}

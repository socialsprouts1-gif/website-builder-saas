'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { isFeatureKey, type FeatureKey } from '@/lib/features';
import { setGlobalFlag, setUserFlag } from '@/lib/features.server';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * `requireAdmin` in the action itself, not only on the page.
 *
 * A server action is its own entry point: anybody who can post to it reaches
 * it, whatever page rendered the button. Trusting the layout that drew the
 * switch would mean the switch is only as safe as the fact nobody has found
 * the endpoint.
 */
export async function setFeatureAction(key: string, enabled: boolean): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!isFeatureKey(key)) return { ok: false, error: 'No such feature.' };

  try {
    await setGlobalFlag(key as FeatureKey, enabled, actor.id);
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'That did not save.' };
  }

  // Both, because the overview counts what is switched off.
  revalidatePath('/admin/features');
  revalidatePath('/admin');
  return { ok: true };
}

/** `null` clears the override and puts the account back on the global switch. */
export async function setUserFeatureAction(
  userId: string,
  key: string,
  enabled: boolean | null,
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!isFeatureKey(key)) return { ok: false, error: 'No such feature.' };

  try {
    await setUserFlag(userId, key as FeatureKey, enabled, actor.id);
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'That did not save.' };
  }

  revalidatePath('/admin/features');
  revalidatePath('/admin/users');
  return { ok: true };
}

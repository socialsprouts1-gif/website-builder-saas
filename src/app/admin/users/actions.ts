'use server';

import { revalidatePath } from 'next/cache';
import { endTrial, grantTrialDays, setUserAdmin } from '@/lib/admin';

/**
 * Server actions for the users panel. Each delegates to a helper that calls
 * requireAdmin() itself, so authorisation cannot be skipped by reaching one of
 * these directly.
 */

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

function fail(cause: unknown): ActionResult {
  return { ok: false, message: cause instanceof Error ? cause.message : 'That did not work' };
}

export async function toggleAdminAction(userId: string, makeAdmin: boolean): Promise<ActionResult> {
  try {
    await setUserAdmin(userId, makeAdmin);
    revalidatePath('/admin/users');
    return { ok: true, message: makeAdmin ? 'Now an admin.' : 'Admin access removed.' };
  } catch (cause) {
    return fail(cause);
  }
}

export async function grantTrialAction(userId: string, days: number): Promise<ActionResult> {
  try {
    await grantTrialDays(userId, days);
    revalidatePath('/admin/users');
    return { ok: true, message: `Free access extended by ${days} day${days === 1 ? '' : 's'}.` };
  } catch (cause) {
    return fail(cause);
  }
}

export async function endTrialAction(userId: string): Promise<ActionResult> {
  try {
    await endTrial(userId);
    revalidatePath('/admin/users');
    return { ok: true, message: 'Access ended.' };
  } catch (cause) {
    return fail(cause);
  }
}

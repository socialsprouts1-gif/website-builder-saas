import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleRouteError, jsonError } from '@/lib/api';
import { normalisePaymentUrl } from '@/lib/payments';
import { ownedProject } from '@/lib/shop/owner';
import type { ProjectRow } from '@/lib/database.types';

export const runtime = 'nodejs';

/**
 * The shop's own settings: whether it is open, and how it is paid.
 *
 * Switching the shop on is what makes the Shop, Basket and Checkout pages
 * appear on the site — on a site that was built with them and on one that was
 * not, because those pages are assembled from the site's own shell when it has
 * no files for them.
 */
const patchSchema = z.object({
  enabled: z.boolean().optional(),
  codEnabled: z.boolean().optional(),
  paymentNote: z.string().trim().max(400).optional(),
  paymentUrl: z.string().trim().max(600).optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const owned = await ownedProject(id);
    if ('error' in owned) return owned.error;

    const body = patchSchema.parse(await request.json());
    const patch: Partial<ProjectRow> = {};

    if (body.enabled !== undefined) patch.shop_enabled = body.enabled;
    if (body.codEnabled !== undefined) patch.shop_cod_enabled = body.codEnabled;
    if (body.paymentNote !== undefined) patch.shop_payment_note = body.paymentNote || null;
    if (body.paymentUrl !== undefined) {
      // The same rules as the pay button: https and upi: only. This ends up in
      // an href on a page served to the public.
      const url = body.paymentUrl ? normalisePaymentUrl(body.paymentUrl) : null;
      if (body.paymentUrl && !url) {
        return jsonError('That payment link does not look right. It should start with https:// or upi:.', 422);
      }
      patch.payment_url = url;
    }

    if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

    const { error } = await createAdminClient()
      .from('projects')
      .update(patch)
      .eq('id', owned.projectId);

    if (error) {
      return jsonError(
        'The shop needs migration 0015. Run supabase/setup.sql and try again.',
        409,
      );
    }

    return NextResponse.json({ ok: true });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

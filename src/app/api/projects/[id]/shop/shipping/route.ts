import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleRouteError, jsonError } from '@/lib/api';
import { parseRupees } from '@/lib/shop/money';
import { ownedProject } from '@/lib/shop/owner';
import type { ShopShippingRateRow } from '@/lib/database.types';

export const runtime = 'nodejs';

/** What it costs to send an order, and when that becomes free. */
const rateSchema = z.object({
  label: z.string().trim().min(1).max(80),
  note: z.string().trim().max(120).optional().default(''),
  price: z.string().trim().max(20),
  /** Empty means delivery on this option is never free. */
  freeOver: z.string().trim().max(20).optional().default(''),
  active: z.boolean().optional().default(true),
});

const updateSchema = rateSchema.partial().extend({ id: z.string().uuid() });
const deleteSchema = z.object({ id: z.string().uuid() });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const owned = await ownedProject(id);
    if ('error' in owned) return owned.error;

    const body = rateSchema.parse(await request.json());
    const price = parseRupees(body.price);
    if (price === null) return jsonError('Give a delivery price, like 50 or 0 for free.', 422);

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from('shop_shipping_rates')
      .select('id')
      .eq('project_id', owned.projectId);

    const { error } = await admin.from('shop_shipping_rates').insert({
      project_id: owned.projectId,
      label: body.label,
      note: body.note || null,
      price_paise: price,
      free_over_paise: body.freeOver ? parseRupees(body.freeOver) : null,
      active: body.active,
      position: (existing ?? []).length,
    });

    if (error) {
      return jsonError('The shop needs migration 0015. Run supabase/setup.sql and try again.', 409);
    }

    return NextResponse.json({ ok: true });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const owned = await ownedProject(id);
    if ('error' in owned) return owned.error;

    const body = updateSchema.parse(await request.json());
    const patch: Partial<ShopShippingRateRow> = {};

    if (body.label !== undefined) patch.label = body.label;
    if (body.note !== undefined) patch.note = body.note || null;
    if (body.active !== undefined) patch.active = body.active;
    if (body.freeOver !== undefined) {
      patch.free_over_paise = body.freeOver ? parseRupees(body.freeOver) : null;
    }
    if (body.price !== undefined) {
      const price = parseRupees(body.price);
      if (price === null) return jsonError('Give a delivery price, like 50 or 0 for free.', 422);
      patch.price_paise = price;
    }

    const { error } = await createAdminClient()
      .from('shop_shipping_rates')
      .update(patch)
      .eq('id', body.id)
      .eq('project_id', owned.projectId);

    if (error) return jsonError('That could not be saved.', 500);
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const owned = await ownedProject(id);
    if ('error' in owned) return owned.error;

    const body = deleteSchema.parse(await request.json());
    const { error } = await createAdminClient()
      .from('shop_shipping_rates')
      .delete()
      .eq('id', body.id)
      .eq('project_id', owned.projectId);

    if (error) return jsonError('That could not be removed.', 500);
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

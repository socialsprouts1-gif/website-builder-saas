import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleRouteError, jsonError } from '@/lib/api';
import { parseRupees } from '@/lib/shop/money';
import { uniqueSlug } from '@/lib/shop/catalogue';
import { ownedProject } from '@/lib/shop/owner';
import type { ShopProductRow } from '@/lib/database.types';

export const runtime = 'nodejs';

/**
 * A shop's products, as the owner edits them.
 *
 * Prices arrive as the owner typed them — "499", "1,299.50", "₹899" — and are
 * turned into paise here rather than in the browser. A price is the one field
 * where a parsing difference between two places becomes an argument with a
 * customer.
 */

const productSchema = z.object({
  title: z.string().trim().min(1).max(140),
  summary: z.string().trim().max(200).optional().default(''),
  description: z.string().trim().max(4000).optional().default(''),
  price: z.string().trim().max(20),
  compareAt: z.string().trim().max(20).optional().default(''),
  category: z.string().trim().max(60).optional().default(''),
  images: z.array(z.string().trim().url().max(2000)).max(8).optional().default([]),
  /** Empty means the shop does not count stock for this product. */
  stock: z.string().trim().max(6).optional().default(''),
  active: z.boolean().optional().default(true),
});

const updateSchema = productSchema.partial().extend({ id: z.string().uuid() });
const deleteSchema = z.object({ id: z.string().uuid() });

function stockOf(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const owned = await ownedProject(id);
    if ('error' in owned) return owned.error;

    const body = productSchema.parse(await request.json());
    const price = parseRupees(body.price);
    if (price === null) return jsonError('Give a price, like 499 or 1299.50.', 422);

    const compareAt = body.compareAt ? parseRupees(body.compareAt) : null;
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('shop_products')
      .select('slug, position')
      .eq('project_id', owned.projectId);

    const { data, error } = await admin
      .from('shop_products')
      .insert({
        project_id: owned.projectId,
        slug: uniqueSlug(body.title, (existing ?? []).map((row) => row.slug)),
        title: body.title,
        summary: body.summary || null,
        description: body.description || null,
        price_paise: price,
        compare_at_paise: compareAt !== null && compareAt > price ? compareAt : null,
        category: body.category || null,
        images: body.images,
        stock: stockOf(body.stock),
        active: body.active,
        position: (existing ?? []).length,
      })
      .select('id')
      .single();

    if (error || !data) {
      return jsonError('The shop needs migration 0015. Run supabase/setup.sql and try again.', 409);
    }

    return NextResponse.json({ id: data.id });
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
    const patch: Partial<ShopProductRow> = {};

    if (body.title !== undefined) patch.title = body.title;
    if (body.summary !== undefined) patch.summary = body.summary || null;
    if (body.description !== undefined) patch.description = body.description || null;
    if (body.category !== undefined) patch.category = body.category || null;
    if (body.images !== undefined) patch.images = body.images;
    if (body.active !== undefined) patch.active = body.active;
    if (body.stock !== undefined) patch.stock = stockOf(body.stock);

    if (body.price !== undefined) {
      const price = parseRupees(body.price);
      if (price === null) return jsonError('Give a price, like 499 or 1299.50.', 422);
      patch.price_paise = price;
    }

    if (body.compareAt !== undefined) {
      const compareAt = body.compareAt ? parseRupees(body.compareAt) : null;
      // Only a real reduction survives. Anything else is a crossed-out price
      // that is not true.
      const price = patch.price_paise ?? null;
      patch.compare_at_paise =
        compareAt !== null && (price === null || compareAt > price) ? compareAt : null;
    }

    patch.updated_at = new Date().toISOString();

    const { error } = await createAdminClient()
      .from('shop_products')
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
      .from('shop_products')
      .delete()
      .eq('id', body.id)
      .eq('project_id', owned.projectId);

    if (error) return jsonError('That could not be removed.', 500);
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

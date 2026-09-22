import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleRouteError, jsonError } from '@/lib/api';
import { ownedProject } from '@/lib/shop/owner';
import { ORDER_STATUSES } from '@/lib/shop/orders';

export const runtime = 'nodejs';

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const owned = await ownedProject(id);
    if ('error' in owned) return owned.error;

    const body = patchSchema.parse(await request.json());
    const { error } = await createAdminClient()
      .from('shop_orders')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', body.id)
      .eq('project_id', owned.projectId);

    if (error) return jsonError('That could not be saved.', 500);
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

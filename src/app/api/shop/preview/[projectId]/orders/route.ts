import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleRouteError, jsonError } from '@/lib/api';
import { loadShop } from '@/lib/shop/load';
import { EmptyOrderError, placeOrder } from '@/lib/shop/place';
import { orderSchema } from '@/lib/shop/validation';

export const runtime = 'nodejs';

/**
 * The owner placing an order against their own shop, from the preview.
 *
 * Worth having rather than blocking. The last thing anyone wants to discover
 * after publishing is that checkout does not work — that is exactly how this
 * product shipped a contact form that quietly threw every enquiry away — so
 * the preview runs the same code the real one does, against the same
 * catalogue, and the order it writes is marked as a test in its own note.
 *
 * Owner-only: this one is behind a session, unlike the public endpoint.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    // RLS scopes this to the caller, so a hit proves ownership.
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const body = orderSchema.parse(await request.json());
    if (body.website) {
      return NextResponse.json({ reference: 'THANK-YOU', totalPaise: 0, paymentUrl: null, note: '' });
    }

    const shop = await loadShop(projectId);
    if (!shop.enabled) return jsonError('This shop is not switched on yet.', 409);

    const placed = await placeOrder({
      projectId,
      shop,
      lines: body.lines,
      shippingRateId: body.shippingRateId ?? null,
      customer: {
        name: body.name,
        contact: body.contact,
        email: body.email,
        address: body.address,
        city: body.city,
        postcode: body.postcode,
        note: body.note,
      },
      fromPreview: true,
    });

    return NextResponse.json(placed);
  } catch (cause) {
    if (cause instanceof EmptyOrderError) return jsonError(cause.message, 409);
    return handleRouteError(cause);
  }
}

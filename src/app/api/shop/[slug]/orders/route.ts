import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { handleRouteError, jsonError } from '@/lib/api';
import { loadShop } from '@/lib/shop/load';
import { EmptyOrderError, placeOrder } from '@/lib/shop/place';
import { orderSchema } from '@/lib/shop/validation';

export const runtime = 'nodejs';

/**
 * An order from someone's published shop.
 *
 * Open by necessity and trusted with nothing, exactly like the enquiry
 * endpoint: the person checking out is a customer, not a Lumen user, and has
 * no session. The slug decides whose shop it is; the write happens with the
 * service role because a shopper must never hold a key that can read anything
 * back; and every rupee is worked out here from the catalogue rather than read
 * out of the request.
 */

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;

    // Per-address, because there is no account to count against. Generous:
    // a family ordering from one connection must never be turned away.
    const limit = await rateLimit(`order:${clientAddress(request)}`, 12, 60 * 10);
    if (!limit.allowed) {
      return jsonError('Too many orders from here just now. Please try again shortly.', 429);
    }

    const body = orderSchema.parse(await request.json());

    // Something filled the hidden field, so it was not a person. Answered as
    // success on purpose: a bot that learns it was caught comes back smarter.
    if (body.website) {
      return NextResponse.json({ reference: 'THANK-YOU', totalPaise: 0, paymentUrl: null, note: '' });
    }

    if (!body.name.trim() || !body.contact.trim() || !body.address.trim()) {
      return jsonError('Please give a name, a phone number and an address.', 422);
    }

    const admin = createAdminClient();
    const { data: project } = await admin
      .from('projects')
      .select('id')
      .eq('public_slug', slug)
      .not('published_at', 'is', null)
      .maybeSingle();

    // Saying which slugs exist is not this endpoint's business.
    if (!project) return jsonError('This shop is not taking orders.', 404);

    const shop = await loadShop(project.id);
    if (!shop.enabled) return jsonError('This shop is not taking orders.', 409);

    const placed = await placeOrder({
      projectId: project.id,
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
    });

    return NextResponse.json(placed);
  } catch (cause) {
    if (cause instanceof EmptyOrderError) return jsonError(cause.message, 409);
    return handleRouteError(cause);
  }
}

/** Whoever is in front of the proxy, falling back to one shared bucket. */
function clientAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

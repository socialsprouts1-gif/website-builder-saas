import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleRouteError, jsonError } from '@/lib/api';
import { normalisePayLabel, normalisePaymentUrl } from '@/lib/payments';

export const runtime = 'nodejs';

/**
 * The payment button on a generated site.
 *
 * Stores a link, not a credential. See src/lib/payments.ts for why that is the
 * shape of this feature rather than a checkout integration.
 */
const SETUP_NEEDED =
  'This database is missing the payment columns. Open supabase/setup.sql from the repo, paste the whole file into the Supabase SQL editor (Dashboard → SQL Editor → New query) and run it. It is safe to re-run.';

const bodySchema = z.object({
  url: z.string().trim().max(600),
  label: z.string().trim().max(60).optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    // RLS scopes this to the caller, so a hit proves ownership.
    const { data: project } = await supabase.from('projects').select('id').eq('id', id).maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const body = bodySchema.parse(await request.json().catch(() => ({})));

    // An empty link takes the button off the site; anything that is not a real
    // payment link is refused rather than quietly written into an href.
    const url = body.url ? normalisePaymentUrl(body.url) : null;
    if (body.url && !url) {
      return jsonError(
        'That does not look like a payment link. Paste the full https:// link from Razorpay, Stripe or PayPal, or a upi:// link.',
        422,
      );
    }

    const label = url ? normalisePayLabel(body.label) : null;

    const { error } = await createAdminClient()
      .from('projects')
      .update({ payment_url: url, payment_label: label })
      .eq('id', id);

    if (error) return jsonError(SETUP_NEEDED, 503);

    return NextResponse.json({ url, label });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

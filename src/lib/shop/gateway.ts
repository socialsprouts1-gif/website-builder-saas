import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadProjectContext } from '@/lib/connectors/registry';
import { razorpayKeysFrom, type RazorpayKeys } from './payments';

/**
 * The gateway keys a given shop pays through.
 *
 * They belong to the shop's owner, not to Lumen: the customer's money goes
 * straight into the owner's Razorpay account and Lumen is never in the middle
 * of it. That is deliberate — holding somebody else's takings would make this
 * a payment aggregator, which in India needs an RBI licence Lumen does not
 * have and does not want.
 *
 * Read on the server, per request, and never cached: a revoked key must stop
 * working the moment it is revoked.
 */
export async function shopPaymentKeys(projectId: string): Promise<RazorpayKeys | null> {
  const admin = createAdminClient();

  const { data: project } = await admin
    .from('projects')
    .select('user_id, name')
    .eq('id', projectId)
    .maybeSingle();

  if (!project?.user_id) return null;

  try {
    const context = await loadProjectContext(project.user_id, projectId, 'razorpay');
    return razorpayKeysFrom(context.credentials);
  } catch {
    // A shop must keep taking orders when its gateway cannot be read. The
    // customer is offered the other ways to pay instead.
    return null;
  }
}

/** The name the gateway shows the customer while they are paying. */
export async function shopDisplayName(projectId: string): Promise<string> {
  const { data } = await createAdminClient()
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .maybeSingle();
  return data?.name?.trim() || 'Order';
}

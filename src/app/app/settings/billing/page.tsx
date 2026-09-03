import { Card, SectionHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BillingActions } from '@/components/app/BillingActions';
import { requireUser } from '@/lib/auth';
import { getBillingState } from '@/lib/billing';
import { createClient } from '@/lib/supabase/server';
import { formatInr, PLAN_LABEL } from '@/lib/razorpay';
import { DAILY_PLATFORM_CREDITS, PRO_DAILY_PLATFORM_CREDITS } from '@/lib/env';

export const metadata = { title: 'Billing' };
export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const user = await requireUser();
  const state = await getBillingState(user.id);

  const supabase = await createClient();
  const { data: invoices } = state.subscription
    ? await supabase
        .from('invoices')
        .select('id, razorpay_invoice_id, amount_paise, currency, gstin, pdf_url, status, issued_at')
        .eq('subscription_id', state.subscription.id)
        .order('issued_at', { ascending: false })
    : { data: [] };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <SectionHeader title="Billing" description="One plan, ₹500 a month, everything included." />

      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-2xl text-ink-primary">{PLAN_LABEL}</p>
            <p className="mt-1 text-[13px] text-ink-secondary">Lumen · billed monthly in INR</p>
          </div>
          <Badge tone={state.entitled ? 'accent' : 'neutral'}>
            {state.subscription?.cancelled_at ? 'Cancelling' : state.entitled ? 'Pro' : 'Free'}
          </Badge>
        </div>

        {/* Honest, always-visible renewal state — no hidden charge dates. */}
        <p className="text-[13px] text-ink-secondary">
          {state.subscription?.cancelled_at
            ? `Cancelled. Pro runs until ${formatDate(
                state.subscription.current_period_end,
              )}, then your account returns to the free tier — you keep every site.`
            : state.entitled
              ? `Next charge on ${formatDate(state.subscription?.current_period_end)}.`
              : `You are on the free tier: ${DAILY_PLATFORM_CREDITS} credits a day, forever. Upgrade for ${PRO_DAILY_PLATFORM_CREDITS} a day.`}
        </p>

        <BillingActions
          entitled={state.entitled}
          hasSubscription={Boolean(state.subscription?.razorpay_subscription_id)}
          email={user.email}
          existingGstin={state.subscription?.gstin ?? null}
          billingConfigured={state.billingConfigured}
        />
      </Card>

      <h2 className="mb-3 mt-10 font-display text-xl text-ink-primary">Invoices</h2>
      {invoices && invoices.length > 0 ? (
        <div className="overflow-hidden rounded-card border border-hairline">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-raised text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-normal">Date</th>
                <th className="px-4 py-3 font-normal">Amount</th>
                <th className="px-4 py-3 font-normal">GSTIN</th>
                <th className="px-4 py-3 font-normal">PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-hairline text-ink-secondary">
                  <td className="px-4 py-3">{formatDate(invoice.issued_at)}</td>
                  <td className="px-4 py-3">{formatInr(invoice.amount_paise)}</td>
                  <td className="px-4 py-3">{invoice.gstin ?? '—'}</td>
                  <td className="px-4 py-3">
                    {invoice.pdf_url ? (
                      <a href={invoice.pdf_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        Download
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-card border border-dashed border-hairline px-4 py-8 text-center text-[13px] text-ink-muted">
          No invoices yet. They appear here after your first charge.
        </p>
      )}
    </div>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

import { SectionHeader } from '@/components/ui/Card';
import { AdminTable, Empty, Stat } from '@/components/admin/Stat';
import { revenueSnapshot } from '@/lib/admin-metrics';
import { formatInr } from '@/lib/razorpay';

export const metadata = { title: 'Revenue' };
export const dynamic = 'force-dynamic';

/**
 * What is actually being paid, and by whom.
 *
 * Its own screen rather than the top third of Operations, because this is the
 * one somebody opens on purpose — and when it shared a page with model spend
 * it also shared that page's thirty days of usage events, which it has no use
 * for and had to wait on.
 */
export default async function AdminRevenuePage() {
  const revenue = await revenueSnapshot();

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <SectionHeader title="Revenue" description="What is being paid every month, and what is leaving." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="MRR" value={formatInr(revenue.mrrPaise)} detail={`${revenue.active} active`} />
        <Stat label="On trial" value={String(revenue.trialing)} detail="not yet paying" />
        <Stat
          label="Churn"
          value={`${revenue.churnRate.toFixed(1)}%`}
          detail={`${revenue.cancelled} cancelled`}
        />
        <Stat
          label="Subscriptions"
          value={String(revenue.total)}
          detail="every one ever started"
        />
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl text-ink-primary">Where the money comes from</h2>
      {revenue.byPlan.length === 0 ? (
        <Empty>Nobody is subscribed yet. MRR will appear here the first time somebody pays.</Empty>
      ) : (
        <AdminTable head={['Plan', 'Subscribers', 'MRR', 'Share']}>
          {revenue.byPlan.map((plan) => (
            <tr key={plan.key} className="border-t border-hairline text-ink-secondary">
              <td className="px-4 py-3 text-ink-primary">{plan.label}</td>
              <td className="px-4 py-3">{plan.count}</td>
              <td className="px-4 py-3">{formatInr(plan.mrrPaise)}</td>
              <td className="px-4 py-3">
                {revenue.mrrPaise > 0
                  ? `${((plan.mrrPaise / revenue.mrrPaise) * 100).toFixed(0)}%`
                  : '—'}
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

      <p className="mt-6 text-[14.5px] leading-relaxed text-ink-muted">
        MRR is summed from the plan each active subscriber is actually on, so a yearly subscription
        counts as its monthly share rather than as a month&rsquo;s worth of a yearly price.
      </p>
    </div>
  );
}

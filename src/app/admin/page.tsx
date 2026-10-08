import { SectionHeader } from '@/components/ui/Card';
import { Stat } from '@/components/admin/Stat';
import { overviewCounts, revenueSnapshot } from '@/lib/admin-metrics';
import { adminStats } from '@/lib/admin';
import { FEATURE_LIST } from '@/lib/features';
import { globalFlags } from '@/lib/features.server';
import { formatInr } from '@/lib/razorpay';

export const metadata = { title: 'Admin' };
export const dynamic = 'force-dynamic';

/**
 * The way in, and nothing else.
 *
 * This page used to be all of it — revenue, thirty days of model spend broken
 * down per model, and the moderation queue, on one request. Everything it
 * showed now has a screen of its own, so what is left is the headline number
 * from each and a way through to the page that explains it. Nothing here is a
 * thing you read; it is a thing you click.
 */
export default async function AdminPage() {
  const [revenue, counts, stats, flags] = await Promise.all([
    revenueSnapshot(),
    overviewCounts(),
    adminStats(),
    globalFlags(),
  ]);

  // Counted off the resolved switches rather than off the stored rows: a
  // feature that defaults to off and has never been touched is still off, and
  // a card that said "0 features off" while one was closed would be a lie.
  const off = FEATURE_LIST.filter((feature) => (flags[feature.key] ?? feature.on) === false).length;

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <SectionHeader title="Overview" description="Where everything stands. Open a card for the detail." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="MRR"
          value={formatInr(revenue.mrrPaise)}
          detail={`${revenue.active} active · ${revenue.trialing} on trial`}
          href="/admin/revenue"
        />
        <Stat
          label="Churn"
          value={`${revenue.churnRate.toFixed(1)}%`}
          detail={`${revenue.cancelled} cancelled`}
          href="/admin/revenue"
        />
        <Stat
          label="Accounts"
          value={String(stats.users)}
          detail={`${stats.projects} site${stats.projects === 1 ? '' : 's'} built`}
          href="/admin/users"
        />
        <Stat
          label="Sites live"
          value={String(counts.sitesReady)}
          detail={`of ${counts.sitesTotal} started`}
          href="/admin/users"
        />
        <Stat
          label="Flagged"
          value={String(counts.flagged)}
          detail={counts.flagged > 0 ? 'waiting on you' : 'nothing waiting'}
          href="/admin/flagged"
          tone={counts.flagged > 0 ? 'alert' : undefined}
        />
        <Stat
          label="Features off"
          value={String(off)}
          detail={off > 0 ? 'hidden from everyone' : 'everything is open'}
          href="/admin/features"
          tone={off > 0 ? 'alert' : undefined}
        />
        <Stat
          label="Errors"
          value={String(counts.unresolvedErrors)}
          detail="recorded in total"
          href="/admin/errors"
          tone={counts.unresolvedErrors > 0 ? 'alert' : undefined}
        />
      </div>

      <p className="mt-8 text-[14.5px] leading-relaxed text-ink-muted">
        Model spend is on its own page — it reads thirty days of usage events and is the slowest
        thing here, so it is not loaded until you ask for it.
      </p>
    </div>
  );
}

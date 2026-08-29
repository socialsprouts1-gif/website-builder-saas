import { Card, SectionHeader } from '@/components/ui/Card';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatInr } from '@/lib/razorpay';
import { PLAN_PRICE_PAISE } from '@/lib/env';

export const metadata = { title: 'Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [subscriptions, usage, projects, flagged] = await Promise.all([
    supabase.from('subscriptions').select('status, cancelled_at, created_at'),
    supabase
      .from('usage_events')
      .select('model, key_source, cost_usd, event_type, created_at')
      .gte('created_at', thirtyDaysAgo)
      .limit(5000),
    supabase.from('projects').select('id, status').eq('is_template', false),
    supabase
      .from('flagged_content')
      .select('id, project_id, reason, detail, created_at')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const rows = subscriptions.data ?? [];
  const active = rows.filter((row) => row.status === 'active').length;
  const trialing = rows.filter((row) => row.status === 'trialing').length;
  const cancelled = rows.filter((row) => Boolean(row.cancelled_at)).length;
  const mrrPaise = active * PLAN_PRICE_PAISE;
  const churnRate = rows.length > 0 ? (cancelled / rows.length) * 100 : 0;

  const events = usage.data ?? [];
  const spendByModel = new Map<string, { cost: number; calls: number }>();
  let platformSpend = 0;
  let byokSpend = 0;

  for (const event of events) {
    const key = event.model ?? 'unknown';
    const entry = spendByModel.get(key) ?? { cost: 0, calls: 0 };
    entry.cost += Number(event.cost_usd ?? 0);
    entry.calls += 1;
    spendByModel.set(key, entry);
    if (event.key_source === 'platform') platformSpend += Number(event.cost_usd ?? 0);
    else byokSpend += Number(event.cost_usd ?? 0);
  }

  const modelRows = [...spendByModel.entries()].sort((a, b) => b[1].cost - a[1].cost);
  const projectRows = projects.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <SectionHeader title="Operations" description="Revenue, model spend and anything needing a look." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="MRR" value={formatInr(mrrPaise)} detail={`${active} active`} />
        <Stat label="On trial" value={String(trialing)} detail="not yet paying" />
        <Stat label="Churn" value={`${churnRate.toFixed(1)}%`} detail={`${cancelled} cancelled`} />
        <Stat label="Sites built" value={String(projectRows.filter((row) => row.status === 'ready').length)} detail={`${projectRows.length} total`} />
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl text-ink-primary">Model spend · last 30 days</h2>
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Stat label="On Lumen's key" value={`$${platformSpend.toFixed(2)}`} detail="this is your cost" />
        <Stat label="On users' own keys" value={`$${byokSpend.toFixed(2)}`} detail="billed to them, not you" />
      </div>

      {modelRows.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline px-4 py-8 text-center text-[13px] text-ink-muted">
          No usage recorded in the last 30 days.
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-hairline">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-raised text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-normal">Model</th>
                <th className="px-4 py-3 font-normal">Calls</th>
                <th className="px-4 py-3 font-normal">Est. cost</th>
              </tr>
            </thead>
            <tbody>
              {modelRows.map(([model, entry]) => (
                <tr key={model} className="border-t border-hairline text-ink-secondary">
                  <td className="px-4 py-3 font-mono text-[12px]">{model}</td>
                  <td className="px-4 py-3">{entry.calls}</td>
                  <td className="px-4 py-3">${entry.cost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 mt-10 font-display text-xl text-ink-primary">Flagged content</h2>
      {(flagged.data ?? []).length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline px-4 py-8 text-center text-[13px] text-ink-muted">
          Nothing flagged. Review this before anything reaches the public showcase.
        </p>
      ) : (
        <ul className="space-y-2">
          {(flagged.data ?? []).map((row) => (
            <li key={row.id} className="rounded-card border border-hairline bg-raised px-4 py-3 text-[13px]">
              <p className="text-ink-primary">{row.reason}</p>
              <p className="mt-1 text-[12px] text-ink-muted">{row.detail ?? row.project_id}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="space-y-1">
      <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className="font-display text-2xl text-ink-primary">{value}</p>
      <p className="text-[12px] text-ink-muted">{detail}</p>
    </Card>
  );
}

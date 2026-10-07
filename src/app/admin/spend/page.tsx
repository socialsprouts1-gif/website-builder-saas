import { SectionHeader } from '@/components/ui/Card';
import { AdminTable, Empty, Stat } from '@/components/admin/Stat';
import { spendSnapshot } from '@/lib/admin-metrics';

export const metadata = { title: 'Model spend' };
export const dynamic = 'force-dynamic';

/**
 * What the models cost, split by whose key paid for it.
 *
 * The distinction is the whole screen: spend on Lumen's key is a cost, and
 * spend on somebody's own key is not. Shown by kind as well as by model,
 * because images are the expensive calls and a 3D build makes a dozen of
 * them — "where did the money go" is a question about kind before it is a
 * question about model.
 */
export default async function AdminSpendPage() {
  const spend = await spendSnapshot(30);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <SectionHeader
        title="Model spend"
        description={`What the last ${spend.days} days of generation cost, and who paid for it.`}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="On Lumen's key"
          value={`$${spend.platformUsd.toFixed(2)}`}
          detail="this is your cost"
        />
        <Stat
          label="On users' own keys"
          value={`$${spend.byokUsd.toFixed(2)}`}
          detail="billed to them, not you"
        />
      </div>

      {spend.truncated ? (
        <p className="mt-4 rounded-card border border-[#e5a05a]/35 bg-[#e5a05a]/10 px-4 py-3 text-[14.5px] text-[#e5a05a]">
          More events than this page reads in one go, so these totals are a floor rather than the
          whole figure.
        </p>
      ) : null}

      <h2 className="mb-3 mt-10 font-display text-xl text-ink-primary">By what it was for</h2>
      {spend.byKind.length === 0 ? (
        <Empty>No usage recorded in the last {spend.days} days.</Empty>
      ) : (
        <AdminTable head={['Kind', 'Calls', 'Est. cost']}>
          {spend.byKind.map((row) => (
            <tr key={row.kind} className="border-t border-hairline text-ink-secondary">
              <td className="px-4 py-3 text-ink-primary">{row.kind}</td>
              <td className="px-4 py-3">{row.calls}</td>
              <td className="px-4 py-3">${row.usd.toFixed(4)}</td>
            </tr>
          ))}
        </AdminTable>
      )}

      <h2 className="mb-3 mt-10 font-display text-xl text-ink-primary">By model</h2>
      {spend.byModel.length === 0 ? (
        <Empty>No usage recorded in the last {spend.days} days.</Empty>
      ) : (
        <AdminTable head={['Model', 'Calls', 'Est. cost']}>
          {spend.byModel.map((row) => (
            <tr key={row.model} className="border-t border-hairline text-ink-secondary">
              <td className="px-4 py-3 font-mono text-[14px]">{row.model}</td>
              <td className="px-4 py-3">{row.calls}</td>
              <td className="px-4 py-3">${row.usd.toFixed(4)}</td>
            </tr>
          ))}
        </AdminTable>
      )}
    </div>
  );
}

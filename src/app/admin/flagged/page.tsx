import { SectionHeader } from '@/components/ui/Card';
import { Empty } from '@/components/admin/Stat';
import { FlaggedQueue } from '@/components/admin/FlaggedQueue';
import { flaggedQueue } from '@/lib/admin-metrics';

export const metadata = { title: 'Flagged' };
export const dynamic = 'force-dynamic';

/**
 * Everything waiting on a judgement.
 *
 * Its own screen because it is the only part of the admin panel that is a
 * queue rather than a report: it has to be worked through and emptied, and
 * buried at the bottom of a page of revenue charts it never was.
 */
export default async function AdminFlaggedPage() {
  const rows = await flaggedQueue();

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <SectionHeader
        title="Flagged"
        description="Anything a build tripped a rule on. Clear this before it reaches the public showcase."
      />

      {rows.length === 0 ? (
        <Empty>Nothing waiting. Flagged builds will appear here as they happen.</Empty>
      ) : (
        <FlaggedQueue rows={rows} />
      )}
    </div>
  );
}

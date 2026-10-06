import { SectionHeader } from '@/components/ui/Card';
import { UserTable } from '@/components/admin/UserTable';
import { requireAdmin } from '@/lib/auth';
import { adminStats, listUsers } from '@/lib/admin';
import { FREE_CREDITS } from '@/lib/env';

export const metadata = { title: 'Users' };
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const [users, stats] = await Promise.all([listUsers(), adminStats()]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <SectionHeader
        title="Users"
        description={`${stats.users} account${stats.users === 1 ? '' : 's'}, ${stats.projects} site${
          stats.projects === 1 ? '' : 's'
        }. New signups get ${FREE_CREDITS} free credits, once.`}
      />

      <UserTable users={users} currentUserId={admin.id} />

      <p className="mt-6 text-[14.5px] leading-relaxed text-ink-muted">
        Extending free access sets the account back to trialing and pushes its end date out from now.
        Ending access stops generation immediately; the account keeps its sites and can subscribe to
        get them back.
      </p>
    </div>
  );
}

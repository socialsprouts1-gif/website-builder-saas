import { AppNav } from '@/components/app/AppNav';
import { isBootstrapAdmin, requireUser } from '@/lib/auth';
import { getKeyStatus } from '@/lib/openai/client';
import { isSchemaInstalled } from '@/lib/supabase/errors';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // Without the tables nothing can be read or written; /setup says which
  // migrations are outstanding instead of letting every page fail oddly.
  if (!(await isSchemaInstalled())) redirect('/setup');

  const keyStatus = await getKeyStatus(user.id).catch(() => null);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AppNav
        email={user.email}
        isAdmin={Boolean(user.profile?.is_admin) || isBootstrapAdmin(user.email)}
        credits={
          keyStatus
            ? {
                used: keyStatus.creditsUsed,
                limit: keyStatus.creditsLimit,
                resetsAt: keyStatus.resetsAt,
                hasOwnKey: keyStatus.hasOwnKey,
                platformConfigured: keyStatus.platformConfigured,
                tier: keyStatus.tier,
                unlimited: keyStatus.unlimited,
              }
            : null
        }
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

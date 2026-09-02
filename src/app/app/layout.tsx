import { AppNav } from '@/components/app/AppNav';
import { isBootstrapAdmin, requireUser } from '@/lib/auth';
import { getKeyStatus } from '@/lib/openai/client';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
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
              }
            : null
        }
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

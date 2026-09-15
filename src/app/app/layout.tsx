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

  // A fixed-height app frame rather than a document that grows.
  //
  // The workspace asks for the viewport's height, and on a phone it was given
  // that height *below* a nav several hundred pixels tall, so the preview sat
  // off the bottom of the screen and read as missing. dvh rather than vh
  // because a phone's address bar makes vh lie.
  return (
    <div className="flex h-screen flex-col [height:100dvh] lg:flex-row">
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
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

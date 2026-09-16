import { AppNav } from '@/components/app/AppNav';
import { ConfirmBanner } from '@/components/app/ConfirmBanner';
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

  // Admins are exempt from the gate, so telling them about it would be a
  // warning about something that is not going to happen.
  const isAdmin = Boolean(user.profile?.is_admin) || isBootstrapAdmin(user.email);
  const needsConfirming = !user.emailConfirmedAt && !isAdmin;

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
        isAdmin={isAdmin}
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
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Said from the first screen rather than at the last step. The check
            itself lives on project creation, which is where someone found out
            after writing a prompt and answering four questions. */}
        {needsConfirming ? <ConfirmBanner email={user.email} /> : null}
        <div className="min-h-0 flex-1">{children}</div>
      </main>
    </div>
  );
}

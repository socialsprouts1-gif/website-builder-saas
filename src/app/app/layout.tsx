import { AppNav } from '@/components/app/AppNav';
import { ConfirmBanner } from '@/components/app/ConfirmBanner';
import { MigrationBanner } from '@/components/app/MigrationBanner';
import { UpgradeDialog } from '@/components/app/UpgradeDialog';
import { isBootstrapAdmin, requireUser } from '@/lib/auth';
import { getKeyStatus } from '@/lib/openai/client';
import { isSchemaInstalled } from '@/lib/supabase/errors';
import { missingFeatures } from '@/lib/supabase/features';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // Without the tables nothing can be read or written; /setup says which
  // migrations are outstanding instead of letting every page fail oddly.
  if (!(await isSchemaInstalled())) redirect('/setup');

  const keyStatus = await getKeyStatus(user.id).catch(() => null);

  // Which migrations are missing, and what each one costs. Cached, so this is
  // one query a minute across the whole app rather than one per request.
  const missing = await missingFeatures().catch(() => []);

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
                balance: keyStatus.balance,
                resetsAt: keyStatus.resetsAt,
                hasOwnKey: keyStatus.hasOwnKey,
                platformConfigured: keyStatus.platformConfigured,
              }
            : null
        }
      />
      {/* The app is a frame, not a document, so it never pans sideways. A
          panel that genuinely needs more width than the phone has — a wide
          table, a code view — scrolls inside itself; the shell around it does
          not move. Without this, one over-wide element anywhere slides the
          whole app off the screen and leaves half of it unreachable. */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
        {/* Said from the first screen rather than at the last step. The check
            itself lives on project creation, which is where someone found out
            after writing a prompt and answering four questions. */}
        {needsConfirming ? <ConfirmBanner email={user.email} /> : null}
        <MigrationBanner missing={missing} />
        <div className="min-h-0 flex-1">{children}</div>
      </main>
      {/* Mounted once, for the whole app. Any request that comes back 402
          raises the event this listens for, so running out of credits opens
          the plan wherever it happens — a build, an edit, a redraw. */}
      <UpgradeDialog />
    </div>
  );
}

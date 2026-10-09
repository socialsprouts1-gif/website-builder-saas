import { AppNav } from '@/components/app/AppNav';
import { hiddenHrefs } from '@/lib/features';
import { featuresFor } from '@/lib/features.server';
import { ConfirmBanner } from '@/components/app/ConfirmBanner';
import { MigrationBanner } from '@/components/app/MigrationBanner';
import { UpgradeDialog } from '@/components/app/UpgradeDialog';
import { FirstRun } from '@/components/app/FirstRun';
import { ClaimReferral } from '@/components/app/ClaimReferral';
import { canAfford, needsUpgrade } from '@/lib/credits';
import { CREDIT_COST } from '@/lib/env';
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

  // Nothing left to build with, and a plan is the way out of that. Admins and
  // anyone on their own OpenAI key are never in this state; neither is a paid
  // account that has merely reached this month's ceiling, because theirs comes
  // back and there is nothing to sell them.
  const outOfCredits = Boolean(
    keyStatus &&
      !keyStatus.hasOwnKey &&
      !canAfford(keyStatus.balance, CREDIT_COST.generation) &&
      needsUpgrade(keyStatus.balance, CREDIT_COST.generation),
  );
  const needsConfirming = !user.emailConfirmedAt && !isAdmin;

  // The switches, resolved once for the shell. An admin is exempt: the founder
  // turning a feature off for the week must not lock themselves out of the
  // thing they are in the middle of building.
  const features = await featuresFor(user.id, { admin: isAdmin });

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
        hidden={hiddenHrefs(features)}
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
      {/* Mounted once, for the whole app. It opens on every screen while the
          free credits are gone, and on any request that comes back 402 or 403
          — a build, an edit, a feature that needs a different plan. */}
      <UpgradeDialog blocked={outOfCredits} />
      <ClaimReferral />
      {/* Five cards explaining what the tool is, on the first visit only.
          Mounted beside the upgrade dialog rather than on one page, because
          the first screen somebody lands on is not always /app — a referral
          link, a confirmation link and a bookmarked project all start
          somewhere else. */}
      <FirstRun />
    </div>
  );
}

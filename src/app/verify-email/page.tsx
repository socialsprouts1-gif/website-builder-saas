import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { ResendConfirmation } from '@/components/auth/ResendConfirmation';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Confirm your email' };
export const dynamic = 'force-dynamic';

/**
 * Where somebody lands between signing up and confirming.
 *
 * There was a banner for this inside the app, which is the right place for
 * somebody already looking at their projects. It is the wrong place for
 * somebody who has just closed the tab, lost the email, and come back not
 * signed in — they need an address to go to, which this is.
 */
export default async function VerifyEmailPage() {
  const user = await getCurrentUser().catch(() => null);

  if (user?.emailConfirmedAt) {
    return (
      <AuthShell title="You are all set" subtitle="That address is confirmed.">
        <div className="space-y-4">
          <p className="rounded-card border border-accent/30 bg-accent-soft px-4 py-3.5 text-[13.5px] leading-relaxed text-ink-primary">
            <strong>{user.email}</strong> is confirmed. Nothing else to do.
          </p>
          <Link
            href="/app"
            className="block rounded-pill bg-accent px-4 py-2.5 text-center text-[14px] text-accent-ink transition hover:opacity-90"
          >
            Go to my sites
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Confirm your email"
      subtitle="One click in your inbox and you are in."
    >
      <div className="space-y-5">
        <p className="text-[13.5px] leading-relaxed text-ink-secondary">
          {user?.email ? (
            <>
              We sent a link to <strong className="text-ink-primary">{user.email}</strong>. Open it and
              your account is ready.
            </>
          ) : (
            <>
              We sent a link to the address you signed up with. Open it and your account is ready.
            </>
          )}
        </p>

        <div className="rounded-card border border-hairline bg-raised p-4">
          <p className="text-[12.5px] uppercase tracking-[0.14em] text-ink-muted">Nothing arrived?</p>
          <ul className="mt-2.5 space-y-1.5 text-[13px] leading-relaxed text-ink-secondary">
            <li>· Look in spam or promotions — it often lands there first.</li>
            <li>· Give it two or three minutes.</li>
            <li>· Check the address was typed correctly when you signed up.</li>
          </ul>
        </div>

        {user?.email ? <ResendConfirmation email={user.email} /> : null}

        <p className="text-center text-[13px] text-ink-muted">
          Wrong address?{' '}
          <Link href="/signup" className="text-accent transition hover:underline">
            Sign up again
          </Link>{' '}
          ·{' '}
          <Link href="/login" className="text-accent transition hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

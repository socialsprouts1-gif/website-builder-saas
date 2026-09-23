import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { CATEGORIES } from '@/lib/categories';
import { requireUser } from '@/lib/auth';
import { noIndex } from '@/lib/metadata';

export const metadata = noIndex('One quick question');

/**
 * The entire onboarding. One question, then straight into building —
 * deliberately not a wizard (spec Section 13).
 *
 * These are links, not submit buttons in a server-action form. The form worked
 * on paper and did nothing you could see: a click had no pressed state, no
 * spinner, and if the action failed there was nowhere for it to say so — the
 * page just sat there, which is indistinguishable from not being clickable at
 * all. A link needs no JavaScript, navigates visibly, opens in a new tab if you
 * want it to, and cannot silently fail. The new-site form already reads
 * ?category= and seeds itself from it, so nothing is lost by going this way.
 */
export default async function OnboardingPage() {
  await requireUser();

  return (
    <AuthShell
      title="What are you building a site for?"
      subtitle="This just pre-fills your first prompt. You can change it later, or skip."
    >
      <div className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/app/new?category=${encodeURIComponent(category.slug)}`}
              className="lumen-raise group rounded-[12px] border border-hairline px-4 py-3 transition hover:border-accent/50 focus:outline-none focus-visible:border-accent"
            >
              <span className="block text-[13.5px] text-ink-primary">{category.label}</span>
              {/* What you are actually choosing, rather than a bare word. */}
              <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-relaxed text-ink-muted">
                {category.seedPrompt}
              </span>
            </Link>
          ))}
        </div>

        <Link
          href="/app/new"
          className="block w-full text-center text-[13px] text-ink-muted transition hover:text-ink-primary"
        >
          Skip this — I will describe it myself
        </Link>
      </div>
    </AuthShell>
  );
}

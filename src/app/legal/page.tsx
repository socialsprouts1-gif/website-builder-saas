import type { Metadata } from 'next';
import Link from 'next/link';
import { COMPANY, LEGAL_GROUPS, documentsInGroup, detail, missingCompanyDetails } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Legal',
  description: 'Lumen’s terms, privacy policy, refund and cancellation policies, and how we handle data.',
};

const BLURB: Record<string, string> = {
  Policies: 'The agreement between you and Lumen, and what happens to your data and your money.',
  'Using Lumen': 'What may be built and published, and how we expect people to behave.',
  Trust: 'How the product is built, how to report a problem, and who it works for.',
};

/**
 * Everything in one place, grouped rather than listed.
 *
 * Fifteen documents in a flat list is a wall. Somebody arriving here wants one
 * of three things — to read the agreement, to check whether they can do
 * something, or to report something — so those are the three groups.
 */
export default function LegalIndexPage() {
  const missing = missingCompanyDetails();

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-[34px] leading-tight text-ink-primary sm:text-[40px]">Legal</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-secondary">
        Written to describe what Lumen actually does, not copied from a template. If a policy here
        does not match the product, that is a bug and we want to hear about it.
      </p>
      <p className="mt-2 text-[13px] text-ink-muted">
        {detail(COMPANY.legalName, 'registered entity name')} · {COMPANY.domain} ·{' '}
        <a href={`mailto:${COMPANY.email}`} className="text-accent hover:underline">
          {COMPANY.email}
        </a>
      </p>

      {missing.length > 0 ? (
        <p className="mt-6 rounded-card border border-[#e5a15a]/30 bg-[#e5a15a]/10 px-4 py-3 text-[12.5px] leading-relaxed text-[#e5a15a]">
          These documents are not finished: the business&apos;s {missing.join(', ')}{' '}
          {missing.length === 1 ? 'is' : 'are'} not filled in yet, and every page says so until they
          are.
        </p>
      ) : null}

      <div className="mt-12 space-y-12">
        {LEGAL_GROUPS.map((group) => (
          <section key={group}>
            <h2 className="font-display text-[20px] text-ink-primary">{group}</h2>
            <p className="mt-1 text-[13.5px] text-ink-muted">{BLURB[group]}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {documentsInGroup(group).map((document) => (
                <Link
                  key={document.slug}
                  href={`/legal/${document.slug}`}
                  className="lumen-raise rounded-card border border-hairline px-4 py-3.5 transition hover:border-accent/40"
                >
                  <span className="block text-[14px] text-ink-primary">{document.title}</span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-muted">
                    {document.summary}
                  </span>
                </Link>
              ))}

              {group === 'Policies' ? (
                <Link
                  href="/legal/cookie-preferences"
                  className="lumen-raise rounded-card border border-hairline px-4 py-3.5 transition hover:border-accent/40"
                >
                  <span className="block text-[14px] text-ink-primary">Cookie Preferences</span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-muted">
                    What is set in your browser, and what you can change.
                  </span>
                </Link>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

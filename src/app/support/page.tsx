import type { Metadata } from 'next';
import Link from 'next/link';
import { COMPANY } from '@/lib/legal/company';

export const metadata: Metadata = {
  title: 'Support',
  description: 'How to reach a person at Lumen, and what to tell them.',
};

/**
 * Where to write, and what to say.
 *
 * Honest about what it is: an email address, answered by the people who built
 * this, not a ticketing system with a promised response time we would then
 * have to meet. Telling somebody what to include is worth more than a form —
 * most support rounds are lost to "which site?" and "what did it say?".
 */

const BEFORE = [
  {
    title: 'A build that will not finish',
    body: 'Open the site and look at the chat. If it says the build stopped, press "Build it again" — a build that lost its connection is the most common thing we see, and restarting it costs nothing.',
  },
  {
    title: 'A published site showing the old version',
    body: 'Changes are live within about a minute. Reload with a hard refresh before assuming it did not save; the version history in the chat panel shows what was actually written and when.',
  },
  {
    title: 'An enquiry or order that never arrived',
    body: 'Check the Results and Shop tabs first. If the form says it sent and nothing is listed, tell us — that is a bug in ours, and we want it.',
  },
  {
    title: 'A payment that was taken twice',
    body: 'Write to us with the date and amount. We refund duplicates without argument.',
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-[34px] leading-tight text-ink-primary sm:text-[40px]">Support</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-secondary">
        Lumen is small. Writing to us reaches the people who built it, not a queue.
      </p>

      <div className="mt-8 rounded-card border border-accent/25 bg-accent-soft/40 p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-accent">Write to us</p>
        <a
          href={`mailto:${COMPANY.email}`}
          className="mt-1.5 block font-display text-[22px] text-ink-primary transition hover:text-accent"
        >
          {COMPANY.email}
        </a>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
          We reply within one working day. If something is broken and costing you customers, put
          “urgent” in the subject and we will look at it first.
        </p>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-[20px] text-ink-primary">What to tell us</h2>
        <p className="mt-1 text-[13.5px] text-ink-muted">
          Four things turn one email into a fix instead of four emails into a fix.
        </p>
        <ol className="mt-5 space-y-3">
          {[
            'Which site — the name as it appears under My sites, or the link.',
            'What you were doing, and what you expected to happen.',
            'What happened instead, word for word if there was a message.',
            'Whether it happens every time, and on which device or browser.',
          ].map((item, index) => (
            <li key={item} className="flex gap-3 text-[14px] leading-relaxed text-ink-secondary">
              <span className="text-ink-muted">{index + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-card border border-hairline bg-raised px-4 py-3 text-[12.5px] leading-relaxed text-ink-muted">
          Never send us a password, an API key, or a customer&apos;s personal details. If we need
          something like that to help, we will tell you a safer way to share it.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-[20px] text-ink-primary">Worth trying first</h2>
        <div className="mt-5 space-y-3">
          {BEFORE.map((item) => (
            <div key={item.title} className="rounded-card border border-hairline bg-raised p-4">
              <p className="text-[14px] text-ink-primary">{item.title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-[20px] text-ink-primary">Other routes</h2>
        <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-ink-secondary">
          <li>
            <Link href="/help" className="text-accent hover:underline">
              Help centre
            </Link>{' '}
            — how the parts of Lumen work.
          </li>
          <li>
            <Link href="/legal/responsible-disclosure" className="text-accent hover:underline">
              Responsible Disclosure
            </Link>{' '}
            — found a security hole? This route, not this one.
          </li>
          <li>
            <a href={`mailto:${COMPANY.grievanceEmail}`} className="text-accent hover:underline">
              {COMPANY.grievanceEmail}
            </a>{' '}
            — a complaint, or a site published on Lumen that should not be.
          </li>
          <li>
            <Link href="/legal/privacy-policy" className="text-accent hover:underline">
              Privacy
            </Link>{' '}
            — a copy of your data, or deletion of it.
          </li>
        </ul>
      </section>
    </div>
  );
}

import type { Metadata } from 'next';
import { TopNav } from '@/components/marketing/TopNav';
import { Footer } from '@/components/marketing/Footer';
import { ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DAILY_PLATFORM_CREDITS, PRO_DAILY_PLATFORM_CREDITS, PLAN_PRICE_LABEL } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'One plan. ₹500 a month. Everything included.',
};

const INCLUDED = [
  `${PRO_DAILY_PLATFORM_CREDITS} credits a day — around twenty sites, or one site and a long afternoon of changes`,
  'Unlimited generations when you bring your own OpenAI key',
  'Unlimited projects, pages and chat iterations',
  'Screenshot-to-site and voice input',
  'Visual editor with version history',
  'The embeddable AI chatbot for every site you build',
  'Every connector — GitHub, Vercel, Netlify, Analytics, Slack, Sheets and more',
  'One-click deploy, GitHub push, or zip export',
  'GST-compliant invoices',
];

const FAQ = [
  {
    q: 'What do I actually get for ₹500?',
    a: `A bigger daily allowance — ${PRO_DAILY_PLATFORM_CREDITS} credits a day instead of ${DAILY_PLATFORM_CREDITS}. Every feature is in the free tier already: voice, screenshot import, the chatbot builder, every connector, and full export. Paying buys throughput, not features.`,
  },
  {
    q: 'What happens when I run out of credits for the day?',
    a: `Generation pauses until midnight UTC, when the balance resets. Your sites stay live and exportable — nothing is taken away. Upgrade for ${PRO_DAILY_PLATFORM_CREDITS} credits a day, or add your own OpenAI API key in Settings for no limit at all, billed to your OpenAI account at their rates.`,
  },
  {
    q: 'How do I cancel?',
    a: 'One click in Settings → Billing. No retention flow, no phone call, no "are you sure" maze. Your plan runs to the end of the period you already paid for, then the account drops back to the free tier — you keep every site.',
  },
  {
    q: 'Do I own the code?',
    a: 'Completely. Export a zip, push to your own GitHub repo, or deploy anywhere. It is plain HTML, CSS and JavaScript with no lock-in and no runtime dependency on Lumen.',
  },
  {
    q: 'Can I get a GST invoice?',
    a: 'Yes. Add your GSTIN at checkout or in Settings → Billing and every invoice is issued as a compliant tax invoice, downloadable as a PDF.',
  },
  {
    q: 'Which AI model does it use?',
    a: "Lumen reads OpenAI's live model list and offers you Best quality, Fast & cheap, or any specific model you want. You can switch model per project, mid-project.",
  },
];

export default function PricingPage() {
  return (
    <>
      <div className="relative">
        <div className="lumen-glow-field" aria-hidden />
        <TopNav />

        <section className="relative mx-auto max-w-shell px-6 pb-16 pt-16 text-center">
          <Badge tone="accent" className="mb-6">One plan · INR</Badge>
          <h1 className="font-display text-[42px] leading-tight text-ink-primary sm:text-[58px]">
            One price. <em className="italic text-accent">Everything included.</em>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[15px] text-ink-secondary">
            We kept the pricing as simple as the product. No seats, no credits to decode, no feature gates.
          </p>
        </section>
      </div>

      <section className="mx-auto max-w-2xl px-6 pb-6">
        <div className="rounded-card border border-hairline bg-raised p-8">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[44px] leading-none text-ink-primary">Free</span>
            <span className="text-sm text-ink-muted">forever, no card</span>
          </div>
          <p className="mt-3 text-sm text-ink-secondary">
            {DAILY_PLATFORM_CREDITS} credits every day — enough to build a site and refine it. Every
            feature is included; the only difference is how much you can generate in a day.
          </p>
          <ul className="mt-6 space-y-2.5">
            {[
              'Building a site costs 3 credits, each change costs 1',
              'Your allowance resets every day at midnight UTC',
              'Unlimited when you bring your own OpenAI key',
              'Export or deploy anything you build — the code is yours',
            ].map((item) => (
              <li key={item} className="flex gap-3 text-sm text-ink-secondary">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-pill bg-ink-muted" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-7">
            <ButtonLink href="/signup" variant="secondary" size="lg" className="w-full">
              Start free →
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 pb-20">
        <div className="rounded-card border border-accent/25 bg-raised p-8">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[52px] leading-none text-ink-primary">{PLAN_PRICE_LABEL}</span>
            <span className="text-sm text-ink-muted">/ month, billed monthly in INR</span>
          </div>
          <p className="mt-3 text-sm text-ink-secondary">
            Cards and UPI via Razorpay. Cancel any time, in one click.
          </p>

          <ul className="mt-8 space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-ink-secondary">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-9">
            <ButtonLink href="/signup" size="lg" className="w-full">
              Start building →
            </ButtonLink>
            <p className="mt-3 text-center text-[12px] text-ink-muted">
              Upgrade when a day&apos;s free credits stop being enough.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 pb-24">
        <h2 className="mb-6 font-display text-2xl text-ink-primary">Questions</h2>
        <div className="space-y-px overflow-hidden rounded-card border border-hairline bg-hairline">
          {FAQ.map((item) => (
            <details key={item.q} className="group bg-raised px-6 py-5">
              <summary className="cursor-pointer list-none text-sm text-ink-primary marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-ink-muted transition group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}

import type { Metadata } from 'next';
import { TopNav } from '@/components/marketing/TopNav';
import { Footer } from '@/components/marketing/Footer';
import { ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DAILY_PLATFORM_CREDITS, PLAN_PRICE_LABEL } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'One plan. ₹500 a month. Everything included.',
};

const INCLUDED = [
  `${DAILY_PLATFORM_CREDITS} credits a day on Lumen's OpenAI key — enough to build and refine a site`,
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
    q: 'Is ₹500 really everything?',
    a: 'Yes. There is one plan. Voice, screenshot import, the chatbot builder and every connector are included — nothing is held back for a higher tier.',
  },
  {
    q: 'What happens when I use up my daily credits?',
    a: `You get ${DAILY_PLATFORM_CREDITS} credits a day on Lumen's own OpenAI key. Building a site costs 3 and each edit costs 1, so a day's allowance covers one site and several rounds of changes. The balance resets at midnight UTC. Add your own OpenAI API key in Settings and there is no limit at all — those calls bill to your OpenAI account at their rates.`,
  },
  {
    q: 'How do I cancel?',
    a: 'One click in Settings → Billing. No retention flow, no phone call, no "are you sure" maze. Your subscription runs to the end of the period you already paid for, and your sites stay exportable.',
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
              One day free to build your first site. No card required to start.
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

import { TopNav } from '@/components/marketing/TopNav';
import { Footer } from '@/components/marketing/Footer';
import { ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FREE_CREDITS } from '@/lib/env';
import { PricingTable } from '@/components/marketing/PricingTable';
import { planFor, priceLabel } from '@/lib/plans';
import { introPlans } from '@/lib/razorpay';
import { JsonLd } from '@/components/seo/JsonLd';
import { pageMetadata } from '@/lib/metadata';
import { breadcrumbJsonLd, softwareApplicationJsonLd } from '@/lib/structured-data';

const PRO = planFor('pro', 'monthly')!;

export const metadata = pageMetadata({
  title: 'Pricing',
  description:
    'Ten credits free. Pro from ₹500 a month, Premium ₹2,000. Monthly or yearly, cancel any time.',
  path: '/pricing',
});

const FAQ = [
  {
    q: 'What is the difference between Professional and Premium?',
    a: 'Two features. Professional gives you your own domain with HTTPS and GST-compliant invoices. Premium adds building straight from your Google Business listing, and the 3D website builder when it lands. Neither has a daily cap — both are a monthly plan you are not expected to think about. Everything else — voice, screenshot import, the shop, the chatbot, every connector, full export — is in the free tier already.',
  },
  {
    q: 'What happens when my free credits run out?',
    a: `Generating new sites pauses. Nothing is taken away: every site you have built stays live, stays published, and can still be edited by hand and exported. To carry on generating, pick a plan — from ${priceLabel(PRO)} — or add your own OpenAI API key in Settings for no limit at all, billed to your OpenAI account at their rates.`,
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
      <JsonLd
        data={[
          softwareApplicationJsonLd(),
          breadcrumbJsonLd([
            { name: 'Lumen', path: '' },
            { name: 'Pricing', path: '/pricing' },
          ]),
        ]}
      />

      <div className="relative">
        <div className="lumen-glow-field" aria-hidden />
        <TopNav />

        <section className="relative mx-auto max-w-shell px-6 pb-16 pt-16 text-center">
          <Badge tone="accent" className="mb-6">Three plans · INR</Badge>
          <h1 className="font-display text-[42px] leading-tight text-ink-primary sm:text-[58px]">
            Start free. <em className="italic text-accent">Pay when it earns it.</em>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[17px] text-ink-secondary">
            {FREE_CREDITS} credits to begin with, and no card. After that a plan buys model time — never
            access to the sites you have already built.
          </p>
        </section>
      </div>

      <section className="mx-auto max-w-shell px-6 pb-20">
        <PricingTable intro={introPlans()} />
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

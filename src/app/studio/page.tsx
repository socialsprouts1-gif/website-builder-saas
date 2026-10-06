import { TopNav } from '@/components/marketing/TopNav';
import { Footer } from '@/components/marketing/Footer';
import { ButtonLink } from '@/components/ui/Button';
import { StudioHero } from '@/components/studio/StudioHero';
import { StudioCategories } from '@/components/studio/StudioCategories';
import { StudioExamples } from '@/components/studio/StudioExamples';
import { StudioPrompt } from '@/components/studio/StudioPrompt';
import { StudioEditor } from '@/components/studio/StudioEditor';
import { StudioProcess } from '@/components/studio/StudioProcess';
import { StudioShowcase } from '@/components/studio/StudioShowcase';
import { JsonLd } from '@/components/seo/JsonLd';
import { pageMetadata } from '@/lib/metadata';
import { breadcrumbJsonLd } from '@/lib/structured-data';
import { STUDIO_BLURB, STUDIO_NAME } from '@/lib/studio';
import { planFor, priceLabel } from '@/lib/plans';

export const metadata = pageMetadata({
  title: STUDIO_NAME,
  description: STUDIO_BLURB,
  path: '/studio',
});

const PREMIUM = planFor('premium', 'monthly')!;

export default function StudioPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Lumen', path: '' },
            { name: '3D Studio', path: '/studio' },
          ]),
        ]}
      />

      <div className="relative">
        <div className="lumen-glow-field" aria-hidden />
        <TopNav />
        <StudioHero />
      </div>

      <StudioCategories />
      <StudioExamples />
      <StudioPrompt />
      <StudioEditor />
      <StudioProcess />
      <StudioShowcase />

      <section className="mx-auto max-w-shell px-6 pb-24">
        <div className="rounded-card border border-accent/30 bg-accent-soft/25 p-8 text-center sm:p-12">
          <p className="font-display text-[32px] leading-tight text-ink-primary sm:text-[40px]">
            Studio opens to Premium first
          </p>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-ink-secondary">
            It is being built now. Premium accounts get it the day it ships, at no extra cost — and
            everything Lumen already does is there today, on every plan.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/pricing" size="lg">
              Premium — {priceLabel(PREMIUM)} →
            </ButtonLink>
            <ButtonLink href="/signup" size="lg" variant="secondary">
              Start free
            </ButtonLink>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

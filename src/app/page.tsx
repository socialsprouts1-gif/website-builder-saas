import { TopNav } from '@/components/marketing/TopNav';
import { Footer } from '@/components/marketing/Footer';
import { HeroPrompt } from '@/components/marketing/HeroPrompt';
import { BetaBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { CodeWindow } from '@/components/ui/CodeWindow';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';

export default async function HomePage() {
  const user = isSupabaseConfigured ? await getSessionUser() : null;

  return (
    <>
      <div className="relative">
        <div className="lumen-glow-field" aria-hidden />
        <TopNav signedIn={Boolean(user)} />

        <section className="relative mx-auto max-w-shell px-6 pb-24 pt-16 text-center sm:pt-24">
          <h1 className="mx-auto max-w-4xl font-display text-[44px] leading-[1.04] tracking-[-0.02em] text-ink-primary sm:text-[64px] lg:text-[76px]">
            Ship a website
            <br />
            <em className="italic text-accent">from a sentence.</em>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-ink-secondary sm:text-base">
            Lumen turns one prompt into a production-grade website — design system, content, animations,
            SEO, and deploy. Iterate in chat, edit visually, ship anywhere.
          </p>

          <div className="mt-10">
            <HeroPrompt />
          </div>

          <div className="mt-10 flex justify-center">
            <BetaBadge />
          </div>
        </section>

        <section className="relative mx-auto max-w-shell px-6 pb-24">
          <CodeWindow title="LUMEN / BISTRO-LUNAIRE" className="animate-fade-up">
            <PreviewMock />
          </CodeWindow>
        </section>
      </div>

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-shell px-6">
          <div className="grid gap-px overflow-hidden bg-hairline sm:grid-cols-3">
            {[
              {
                title: 'One prompt in',
                body: 'Describe the business. Lumen writes the brief, the design system, the copy and the code.',
              },
              {
                title: 'Iterate in chat',
                body: '“Make the hero darker.” “Add a menu page.” Every edit is a diff — your changes survive.',
              },
              {
                title: 'Ship anywhere',
                body: 'Deploy to Vercel, push to GitHub, or export the whole site as a zip. It is your code.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-base px-6 py-10 sm:px-8">
                <h2 className="font-display text-xl text-ink-primary">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-shell px-6 py-24">
        <div className="rounded-card border border-hairline bg-raised px-8 py-14 text-center">
          <h2 className="font-display text-[32px] leading-tight text-ink-primary sm:text-[40px]">
            Everything a small business needs, <em className="italic text-accent">nothing it doesn&apos;t.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-ink-secondary">
            One plan. ₹500 a month. Generation, visual editing, voice, the AI chatbot for your site, and
            every connector — all included.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/signup" size="lg">
              Start building →
            </ButtonLink>
            <ButtonLink href="/pricing" variant="secondary" size="lg">
              See pricing
            </ButtonLink>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

/**
 * A static, hand-built impression of a generated site — this is marketing
 * chrome, not a real preview, so it stays dependency-free and instant.
 */
function PreviewMock() {
  return (
    <div className="grid gap-0 sm:grid-cols-[1.15fr_1fr]">
      <div className="space-y-5 px-8 py-12 text-left">
        <span className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">Bistro Lunaire</span>
        <h3 className="font-display text-3xl leading-tight text-ink-primary">
          Dinner by candlelight, <em className="italic text-accent">seven nights a week.</em>
        </h3>
        <p className="max-w-sm text-sm leading-relaxed text-ink-secondary">
          A twelve-table room in Bandra serving a short seasonal menu. Reservations open thirty days ahead.
        </p>
        <div className="flex gap-2 pt-1">
          <span className="rounded-pill bg-accent px-4 py-2 text-[12px] font-medium text-accent-ink">
            Book a table
          </span>
          <span className="rounded-pill border border-hairline px-4 py-2 text-[12px] text-ink-secondary">
            View menu
          </span>
        </div>
      </div>
      <div className="hidden border-l border-hairline p-6 sm:block">
        <div className="space-y-3">
          {['Amuse — oyster, apple, dill', 'Plat — duck, cherry, farro', 'Dessert — burnt honey tart'].map(
            (line, index) => (
              <div key={line} className="rounded-[10px] border border-hairline bg-raised px-4 py-3">
                <p className="text-[13px] text-ink-primary">{line}</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">₹{[640, 1180, 520][index]}</p>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

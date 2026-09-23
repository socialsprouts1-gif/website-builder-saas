import Link from 'next/link';
import { TopNav } from '@/components/marketing/TopNav';
import { Footer } from '@/components/marketing/Footer';
import { HeroPrompt } from '@/components/marketing/HeroPrompt';
import { MockFrame } from '@/components/marketing/MockFrame';
import { ProductDemo } from '@/components/marketing/ProductDemo';
import { Reveal } from '@/components/marketing/Reveal';
import { ScrollProgress } from '@/components/marketing/ScrollProgress';
import { JsonLd } from '@/components/seo/JsonLd';
import { BetaBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { LogoMark } from '@/components/ui/Logo';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { IDEAS, ideaBySlug } from '@/lib/ideas';
import { INDUSTRIES } from '@/lib/industries';
import {
  BUILDS,
  CAPABILITIES,
  COMPARISON,
  EDIT_EXAMPLES,
  PLANS,
  PUBLISH_FEATURES,
  STEPS,
} from '@/lib/marketing/home';
import { pageMetadata } from '@/lib/metadata';
import { organizationJsonLd, softwareApplicationJsonLd, webSiteJsonLd } from '@/lib/structured-data';

export const metadata = pageMetadata({
  title: 'Lumen — Ship a website from a sentence.',
  description:
    'Lumen is an AI website builder for small businesses. Describe your business in a sentence and it writes the design system, the copy, every page and an online shop if you need one — then publishes it.',
  path: '',
  absoluteTitle: true,
});

/** The six previews in the inspiration strip, in the order they read best. */
const SHOWN_IDEAS = ['bistro', 'estate', 'saas', 'designer', 'roaster', 'salon'];

export default async function HomePage() {
  const user = isSupabaseConfigured ? await getSessionUser() : null;

  return (
    <>
      <JsonLd data={[organizationJsonLd(), webSiteJsonLd(), softwareApplicationJsonLd()]} />
      <ScrollProgress />

      {/* 1 — Hero */}
      <div className="relative">
        <div className="lumen-glow-field" aria-hidden />
        <TopNav signedIn={Boolean(user)} />

        <section className="relative mx-auto max-w-shell px-6 pb-20 pt-16 text-center sm:pt-24">
          <h1 className="mx-auto max-w-4xl font-display text-[44px] leading-[1.04] tracking-[-0.02em] text-ink-primary sm:text-[64px] lg:text-[76px]">
            Ship a website
            <br />
            <em className="italic text-accent">from a sentence.</em>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-ink-secondary sm:text-[17px]">
            Describe your business. Lumen writes the design system, the copy, every page and the shop
            if you need one — then publishes it. Change anything afterwards by saying so.
          </p>

          <div className="mt-10">
            <HeroPrompt />
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <BetaBadge />
            <span className="text-[12.5px] text-ink-muted">
              Free to build · No card until you want your own domain
            </span>
          </div>
        </section>
      </div>

      {/* 2 — From idea to website */}
      <Section id="how">
        <Reveal>
          <Heading eyebrow="How it works" title="From idea to website" accent="in three moves." />
        </Reveal>
        <div className="mt-12 grid gap-px overflow-hidden rounded-card bg-hairline sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal key={step.number} delay={index * 90}>
              <div className="h-full bg-base px-6 py-9 sm:px-8 sm:py-11">
                <span className="font-mono text-[12px] tracking-[0.18em] text-accent">{step.number}</span>
                <h3 className="mt-4 font-display text-[22px] text-ink-primary">{step.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 3 — The demo. The centrepiece of the page. */}
      <Section id="demo" bordered>
        <Reveal>
          <Heading
            eyebrow="The editor"
            title="This is the product,"
            accent="not a screenshot."
            body="Every instruction in the chat is changing the preview beside it. Click a prompt yourself, switch the palette, drop the site to a phone, publish it. All of that is live — the only thing this page does not do is call a model, so nobody is billed for looking."
          />
        </Reveal>
        <div className="mt-12">
          <Reveal>
            <ProductDemo />
          </Reveal>
        </div>
      </Section>

      {/* 4 — What Lumen can build */}
      <Section id="builds" bordered>
        <Reveal>
          <Heading eyebrow="What it builds" title="Six kinds of site," accent="one way of asking." />
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BUILDS.map((build, index) => (
            <Reveal key={build.title} delay={(index % 3) * 80}>
              <Link
                href={build.href}
                className="lumen-raise flex h-full flex-col gap-3 rounded-card border border-hairline bg-raised p-6 transition hover:border-white/25"
              >
                <h3 className="font-display text-[20px] text-ink-primary">{build.title}</h3>
                <p className="text-[13.5px] leading-relaxed text-ink-secondary">{build.body}</p>
                <span className="mt-auto pt-2 text-[12.5px] text-accent">See what it looks like →</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 5 — AI that actually builds */}
      <Section id="capabilities" bordered>
        <Reveal>
          <Heading
            eyebrow="Capabilities"
            title="AI that actually"
            accent="builds the thing."
            body="Not a chat window bolted onto a template gallery. Every item here is something Lumen does today."
          />
        </Reveal>
        <div className="mt-12 grid gap-px overflow-hidden rounded-card bg-hairline sm:grid-cols-2 lg:grid-cols-5">
          {CAPABILITIES.map((capability, index) => (
            <div key={capability.title} className="bg-base p-6">
              <span className="font-mono text-[11px] text-ink-muted">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 text-[14.5px] text-ink-primary">{capability.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-secondary">
                {capability.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 6 — Before and after */}
      <Section id="before-after" bordered>
        <Reveal>
          <Heading eyebrow="Before and after" title="One idea. One prompt." accent="One website." />
        </Reveal>
        <div className="mt-12 grid items-center gap-8 lg:grid-cols-[minmax(0,320px)_1fr]">
          <Reveal>
            <div className="space-y-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">Before</p>
              <div className="rounded-card border border-dashed border-hairline bg-raised/40 px-6 py-10">
                <p className="font-display text-[22px] leading-snug text-ink-secondary">
                  “I need a website for my restaurant.”
                </p>
              </div>
              <p className="flex items-center gap-3 text-[12.5px] text-ink-muted">
                <span aria-hidden className="h-px flex-1 bg-hairline" />
                about a minute
                <span aria-hidden className="h-px flex-1 bg-hairline" />
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">After</p>
              <p className="text-[14px] leading-relaxed text-ink-secondary">
                A whole site: menu, bookings, the room, hours and directions — written, designed and
                published. Not a wireframe, and not one page with the rest to come.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <MockFrame idea={ideaBySlug('bistro') ?? IDEAS[0]} />
          </Reveal>
        </div>
      </Section>

      {/* 7 — Inspiration */}
      <Section id="inspiration" bordered>
        <Reveal>
          <Heading
            eyebrow="Inspiration"
            title="Twelve trades,"
            accent="twelve different designs."
            body="Every one of these is a real design direction the generator builds from — the palette, the type pairing and the arrangement, decided together."
          />
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOWN_IDEAS.map((slug, index) => {
            const idea = ideaBySlug(slug);
            if (!idea) return null;
            return (
              <Reveal key={slug} delay={(index % 3) * 80}>
                <figure className="space-y-3">
                  <MockFrame idea={idea} />
                  <figcaption className="text-[12.5px] text-ink-muted">
                    {idea.business} — {idea.direction.name.toLowerCase()}
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/for" variant="secondary">
            All {INDUSTRIES.length} trades →
          </ButtonLink>
          <ButtonLink href="/templates" variant="secondary">
            Explore templates →
          </ButtonLink>
        </div>
      </Section>

      {/* 8 — Why Lumen */}
      <Section id="why" bordered>
        <Reveal>
          <Heading eyebrow="Why Lumen" title="The old way," accent="and this one." />
        </Reveal>
        <Reveal>
          <div className="mt-12 overflow-hidden rounded-card border border-hairline">
            <div className="grid grid-cols-2 border-b border-hairline bg-raised text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              <span className="px-5 py-3 sm:px-7">Building a site the usual way</span>
              <span className="border-l border-hairline px-5 py-3 sm:px-7">With Lumen</span>
            </div>
            {COMPARISON.map((row) => (
              <div key={row.before} className="grid grid-cols-2 border-b border-hairline last:border-b-0">
                <span className="px-5 py-4 text-[13.5px] text-ink-muted line-through decoration-ink-muted/40 sm:px-7">
                  {row.before}
                </span>
                <span className="border-l border-hairline px-5 py-4 text-[13.5px] text-ink-primary sm:px-7">
                  {row.after}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* 9 — Edit with AI */}
      <Section id="edit" bordered>
        <Reveal>
          <Heading
            eyebrow="Editing"
            title="Say what you want changed."
            accent="It changes."
            body="Every edit is a diff against the site you already have, so the rest of the page survives it — and so does the work you did by hand."
          />
        </Reveal>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EDIT_EXAMPLES.map((example, index) => (
            <Reveal key={example} delay={(index % 3) * 70}>
              <div className="flex h-full items-start gap-3 rounded-card border border-hairline bg-raised p-5">
                <span aria-hidden className="mt-1 text-accent">›</span>
                <p className="text-[14px] leading-relaxed text-ink-primary">{example}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-[13px] text-ink-secondary">
          Or click the thing on the page and change it there — the visual editor edits the same file.
        </p>
      </Section>

      {/* 10 — Publish */}
      <Section id="publish" bordered>
        <Reveal>
          <Heading
            eyebrow="Publishing"
            title="From prompt"
            accent="to production."
            body="Publishing is not an export step you do somewhere else. It is a button, and everything under it is already set up."
          />
        </Reveal>
        <div className="mt-12 grid gap-px overflow-hidden rounded-card bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {PUBLISH_FEATURES.map((feature) => (
            <div key={feature.title} className="bg-base p-6">
              <h3 className="text-[14.5px] text-ink-primary">{feature.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-secondary">{feature.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <ButtonLink href="/signup" size="lg">
            Publish your website →
          </ButtonLink>
        </div>
      </Section>

      {/* 11 — Pricing */}
      <Section id="pricing" bordered>
        <Reveal>
          <Heading
            eyebrow="Pricing"
            title="Free to build."
            accent="₹500 when you need room."
            body="There are no feature gates. The paid plan buys a bigger daily allowance, not a longer list."
          />
        </Reveal>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan, index) => (
            <Reveal key={plan.name} delay={index * 90}>
              <div
                className={`flex h-full flex-col rounded-card border p-7 ${
                  plan.available ? 'border-hairline bg-raised' : 'border-dashed border-hairline bg-raised/30'
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-[22px] text-ink-primary">{plan.name}</h3>
                  <span
                    className={`font-display text-[20px] ${
                      plan.available ? 'text-accent' : 'text-ink-muted'
                    }`}
                  >
                    {plan.price}
                  </span>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary">{plan.note}</p>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-[13.5px] text-ink-secondary">
                      <span
                        aria-hidden
                        className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-pill ${
                          plan.available ? 'bg-accent' : 'bg-ink-muted'
                        }`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-7">
                  <ButtonLink
                    href={plan.href}
                    variant={index === 0 ? 'primary' : 'secondary'}
                    className="w-full"
                  >
                    {plan.cta}
                  </ButtonLink>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 12 — The last word */}
      <section className="relative border-t border-hairline">
        <div className="lumen-glow-field" aria-hidden />
        <div className="relative mx-auto max-w-shell px-6 py-28 text-center sm:py-36">
          <Reveal>
            <div className="flex justify-center">
              <LogoMark size={56} />
            </div>
            <h2 className="mx-auto mt-8 max-w-3xl font-display text-[36px] leading-[1.06] tracking-[-0.02em] text-ink-primary sm:text-[54px]">
              Your next website starts
              <br />
              <em className="italic text-accent">with a sentence.</em>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-[15px] text-ink-secondary">
              Describe it. Lumen builds it. Look at it before you decide anything.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/signup" size="lg">
                Start building free →
              </ButtonLink>
              <ButtonLink href="/how-it-works" variant="secondary" size="lg">
                How it works
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </>
  );
}

function Section({
  id,
  bordered,
  children,
}: {
  id: string;
  bordered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={bordered ? 'border-t border-hairline' : undefined}>
      <div className="mx-auto max-w-shell px-6 py-20 sm:py-24">{children}</div>
    </section>
  );
}

function Heading({
  eyebrow,
  title,
  accent,
  body,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  body?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">{eyebrow}</p>
      <h2 className="mt-4 font-display text-[32px] leading-[1.08] tracking-[-0.02em] text-ink-primary sm:text-[44px]">
        {title} <em className="italic text-accent">{accent}</em>
      </h2>
      {body ? <p className="mt-5 text-[14.5px] leading-relaxed text-ink-secondary">{body}</p> : null}
    </div>
  );
}

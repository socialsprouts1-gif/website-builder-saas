import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TopNav } from '@/components/marketing/TopNav';
import { Footer } from '@/components/marketing/Footer';
import { MockFrame } from '@/components/marketing/MockFrame';
import { JsonLd } from '@/components/seo/JsonLd';
import { ButtonLink } from '@/components/ui/Button';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { INDUSTRIES, ideaFor, industryBySlug, industryPrompt } from '@/lib/industries';
import { pageMetadata } from '@/lib/metadata';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/structured-data';

/**
 * One page per kind of business.
 *
 * Nobody searches for "AI website builder"; they search for "website for my
 * restaurant". The home page can only answer one of those questions, so each
 * trade gets a page that names what it asked for and shows the site Lumen would
 * actually build — the same design direction, the same sections, the same
 * miniature that the ideas gallery renders, because it is the same data.
 */

export function generateStaticParams() {
  return INDUSTRIES.map((industry) => ({ slug: industry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const industry = industryBySlug(slug);
  if (!industry) return pageMetadata({ title: 'Not found', description: '', path: `/for/${slug}`, index: false });

  return pageMetadata({
    title: industry.title,
    description: industry.description,
    path: `/for/${industry.slug}`,
  });
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = industryBySlug(slug);
  if (!industry) notFound();

  const idea = ideaFor(industry);
  const user = isSupabaseConfigured ? await getSessionUser().catch(() => null) : null;
  const start = `/app/new?category=${idea.category}&prompt=${encodeURIComponent(industryPrompt(industry))}`;
  const build = user ? start : `/signup?next=${encodeURIComponent(start)}`;
  const others = INDUSTRIES.filter((entry) => entry.slug !== industry.slug);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Lumen', path: '' },
            { name: 'By trade', path: '/for' },
            { name: industry.name, path: `/for/${industry.slug}` },
          ]),
          faqJsonLd(industry.faqs),
        ]}
      />

      <div className="relative">
        <div className="lumen-glow-field" aria-hidden />
        <TopNav signedIn={Boolean(user)} />

        <nav aria-label="Breadcrumb" className="mx-auto max-w-shell px-6 pt-10">
          <ol className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
            <li>
              <Link href="/" className="transition hover:text-ink-primary">
                Lumen
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/for" className="transition hover:text-ink-primary">
                By trade
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-ink-secondary">{industry.name}</li>
          </ol>
        </nav>

        <section className="relative mx-auto max-w-shell px-6 pb-16 pt-8">
          <h1 className="max-w-3xl font-display text-[38px] leading-[1.08] tracking-[-0.02em] text-ink-primary sm:text-[54px]">
            {industry.h1}
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-secondary sm:text-base">
            {industry.intro}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href={build}>Build this site</ButtonLink>
            <ButtonLink href="/pricing" variant="secondary">
              See what it costs
            </ButtonLink>
          </div>
          <p className="mt-4 text-[12.5px] text-ink-muted">
            Free to build and look at. No card until you want your own domain.
          </p>
        </section>
      </div>

      <section className="mx-auto max-w-shell px-6 pb-20">
        <MockFrame idea={idea} />
        <p className="mt-3 text-[12.5px] text-ink-muted">
          {idea.business} — {idea.direction.name.toLowerCase()}. This is the design direction the
          prompt asks for, not a stock screenshot.
        </p>
      </section>

      <section className="border-t border-hairline">
        <div className="mx-auto grid max-w-shell gap-12 px-6 py-16 md:grid-cols-2">
          <div>
            <h2 className="font-display text-[26px] text-ink-primary sm:text-[32px]">
              What the site comes with
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-secondary">
              Not a blank theme with sections you fill in later. Lumen writes each of these with real
              content for your business, and you change any of it afterwards by saying so in chat.
            </p>
            <ul className="mt-6 space-y-2.5">
              {idea.sections.map((section) => (
                <li key={section} className="flex gap-3 text-[14.5px] text-ink-secondary">
                  <span aria-hidden className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent" />
                  {section}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-[26px] text-ink-primary sm:text-[32px]">
              The design direction
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-secondary">
              {idea.direction.name} — {idea.direction.mood.toLowerCase()}. The palette, the type
              pairing and the amount of motion are decided together, which is the difference between
              a design and a colour scheme.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                idea.direction.palette.bg,
                idea.direction.palette.surface,
                idea.direction.palette.ink,
                idea.direction.palette.muted,
                idea.direction.palette.accent,
              ].map((colour, index) => (
                <span
                  key={`${colour}-${index}`}
                  className="flex h-12 w-12 items-end justify-center rounded-[8px] border border-white/12"
                  style={{ background: colour }}
                >
                  <span className="sr-only">{colour}</span>
                </span>
              ))}
            </div>
            <dl className="mt-6 space-y-2 text-[13.5px]">
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-ink-muted">Navigation</dt>
                <dd className="text-ink-secondary">{idea.nav.join(' · ')}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-ink-muted">Main action</dt>
                <dd className="text-ink-secondary">{idea.cta}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-ink-muted">Layout</dt>
                <dd className="text-ink-secondary capitalize">{idea.direction.archetype}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-shell px-6 py-16">
          <h2 className="font-display text-[26px] text-ink-primary sm:text-[32px]">
            Questions {industry.name.toLowerCase()} ask
          </h2>
          <div className="mt-8 divide-y divide-hairline border-y border-hairline">
            {industry.faqs.map((faq) => (
              <div key={faq.question} className="py-6">
                <h3 className="text-[15.5px] text-ink-primary">{faq.question}</h3>
                <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-secondary">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-shell px-6 py-16">
          <h2 className="font-display text-[22px] text-ink-primary sm:text-[26px]">
            Not quite your trade?
          </h2>
          <ul className="mt-6 flex flex-wrap gap-2">
            {others.map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={`/for/${entry.slug}`}
                  className="inline-flex rounded-pill border border-hairline px-3.5 py-1.5 text-[13px] text-ink-secondary transition hover:border-white/25 hover:text-ink-primary"
                >
                  {entry.name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[13.5px] text-ink-secondary">
            None of these?{' '}
            <Link href="/app/new" className="text-accent hover:underline">
              Describe your business in a sentence
            </Link>{' '}
            — Lumen does not need a template to exist first.
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}

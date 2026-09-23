import Link from 'next/link';
import { TopNav } from '@/components/marketing/TopNav';
import { Footer } from '@/components/marketing/Footer';
import { JsonLd } from '@/components/seo/JsonLd';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { INDUSTRIES, ideaFor } from '@/lib/industries';
import { canonicalUrl, pageMetadata } from '@/lib/metadata';
import { breadcrumbJsonLd } from '@/lib/structured-data';

export const metadata = pageMetadata({
  title: 'Website builders by trade',
  description:
    'A page for each kind of business Lumen builds for — restaurants, gyms, salons, clinics, shops, trades, studios and more — with what the site comes with and what it costs.',
  path: '/for',
});

export default async function ByTradePage() {
  const user = isSupabaseConfigured ? await getSessionUser().catch(() => null) : null;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Lumen', path: '' },
            { name: 'By trade', path: '/for' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: INDUSTRIES.map((industry, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: industry.title,
              url: canonicalUrl(`/for/${industry.slug}`),
            })),
          },
        ]}
      />

      <div className="relative">
        <div className="lumen-glow-field" aria-hidden />
        <TopNav signedIn={Boolean(user)} />
        <section className="relative mx-auto max-w-shell px-6 pb-12 pt-16 text-center">
          <h1 className="font-display text-[40px] leading-tight text-ink-primary sm:text-[56px]">
            Built for <em className="italic text-accent">your trade.</em>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] text-ink-secondary">
            Every business needs a different page. A restaurant needs the menu and a table; a plumber
            needs a phone number the size of a thumb. Pick yours and see what Lumen builds.
          </p>
        </section>
      </div>

      <section className="mx-auto max-w-shell px-6 pb-24">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((industry) => {
            const idea = ideaFor(industry);
            return (
              <li key={industry.slug}>
                <Link
                  href={`/for/${industry.slug}`}
                  className="flex h-full flex-col gap-3 rounded-card border border-hairline bg-raised p-5 transition hover:border-white/25"
                >
                  <div className="flex items-center gap-2">
                    {[idea.direction.palette.bg, idea.direction.palette.surface, idea.direction.palette.accent].map(
                      (colour, index) => (
                        <span
                          key={`${colour}-${index}`}
                          className="h-4 w-4 rounded-[4px] border border-white/12"
                          style={{ background: colour }}
                        />
                      ),
                    )}
                    <span className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                      {industry.name}
                    </span>
                  </div>
                  <p className="text-[15.5px] text-ink-primary">{industry.title}</p>
                  <p className="text-[13px] leading-relaxed text-ink-secondary">
                    {industry.description}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <Footer />
    </>
  );
}

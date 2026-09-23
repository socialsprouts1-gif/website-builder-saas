import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TopNav } from '@/components/marketing/TopNav';
import { Footer } from '@/components/marketing/Footer';
import { TemplatePreview } from '@/components/templates/TemplatePreview';
import { ButtonLink } from '@/components/ui/Button';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { pageMetadata } from '@/lib/metadata';
import {
  BLUEPRINTS,
  blueprintById,
  blueprintCard,
  blueprintDesign,
  industryBySlug,
  sectionCount,
} from '@/lib/templates';

export function generateStaticParams() {
  return BLUEPRINTS.map((blueprint) => ({ id: blueprint.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const blueprint = blueprintById(id);
  if (!blueprint) {
    return pageMetadata({ title: 'Not found', description: '', path: `/templates/${id}`, index: false });
  }

  const industry = industryBySlug(blueprint.industry);
  return pageMetadata({
    title: `${blueprint.name} — ${industry?.label ?? 'website'} template`,
    description: `${blueprint.note} ${sectionCount(blueprint)} sections across ${blueprint.pages.filter((page) => !page.hidden).length} pages, personalised for your business.`,
    path: `/templates/${blueprint.id}`,
  });
}

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const blueprint = blueprintById(id);
  if (!blueprint) notFound();

  const user = isSupabaseConfigured ? await getSessionUser().catch(() => null) : null;
  const card = blueprintCard(blueprint);
  const design = blueprintDesign(blueprint);
  const visible = blueprint.pages.filter((page) => !page.hidden);
  const start = `/app/new?template=${blueprint.id}`;
  const related = BLUEPRINTS.filter(
    (entry) => entry.industry === blueprint.industry && entry.id !== blueprint.id,
  );

  return (
    <>
      <div className="relative">
        <div className="lumen-glow-field" aria-hidden />
        <TopNav signedIn={Boolean(user)} />

        <div className="mx-auto max-w-shell px-6 pt-10">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
              <li>
                <Link href="/templates" className="transition hover:text-ink-primary">
                  Templates
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-ink-secondary">{card.industryLabel}</li>
              <li aria-hidden>/</li>
              <li className="text-ink-secondary">{blueprint.name}</li>
            </ol>
          </nav>
        </div>

        <section className="relative mx-auto max-w-shell px-6 pb-10 pt-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="font-display text-[38px] leading-tight text-ink-primary sm:text-[50px]">
                {blueprint.name}
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">{blueprint.note}</p>
              <p className="mt-4 text-[13px] text-ink-muted">
                {card.industryLabel} · <span className="capitalize">{blueprint.style}</span> ·{' '}
                {card.sections} sections · {card.pages} pages · built around “{blueprint.action}”
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={user ? start : `/signup?next=${encodeURIComponent(start)}`} size="lg">
                Use this template →
              </ButtonLink>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-shell px-6 pb-16">
        <TemplatePreview id={blueprint.id} pages={visible.map((page) => ({ path: page.path, title: page.title }))} />
        <p className="mt-3 text-[12.5px] text-ink-muted">
          A live render of the template, not a screenshot. The business in it is a stand-in — your words and
          your colours replace it, and the structure you see is the structure you get.
        </p>
      </section>

      <section className="border-t border-hairline">
        <div className="mx-auto grid max-w-shell gap-12 px-6 py-16 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-[26px] text-ink-primary sm:text-[32px]">What is on each page</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
              This is the part Lumen will not improvise. The model writes your content into these sections;
              it does not get to decide that your clinic does not need a treatments page.
            </p>
            <div className="mt-8 space-y-6">
              {visible.map((page) => (
                <div key={page.path}>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                    {page.title} · {page.sections.length} sections
                  </p>
                  <ol className="mt-2 flex flex-wrap gap-1.5">
                    {page.sections.map((kind, index) => (
                      <li
                        key={`${kind}-${index}`}
                        className="rounded-pill border border-hairline px-2.5 py-1 text-[11.5px] capitalize text-ink-secondary"
                      >
                        {kind === 'beforeafter' ? 'before & after' : kind}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display text-[26px] text-ink-primary sm:text-[32px]">Its design system</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
              Decided together rather than picked one at a time, which is the difference between a design
              and a colour scheme. A luxury hotel and a children’s school do not get the same one.
            </p>
            <dl className="mt-8 divide-y divide-hairline border-y border-hairline text-[13.5px]">
              {[
                ['Headings', design.shape.fonts.display.split(',')[0].replace(/"/g, '')],
                ['Body', design.shape.fonts.body.split(',')[0].replace(/"/g, '')],
                ['Rhythm', design.shape.density],
                ['Corners', design.shape.radius === '0px' ? 'Square' : design.shape.radius],
                ['Texture', design.shape.texture],
                ['Motion', design.motion],
                ['Depth', design.depth],
                ['Colour direction', design.paletteBrief],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-4 py-3">
                  <dt className="w-32 shrink-0 text-ink-muted">{label}</dt>
                  <dd className="text-ink-secondary first-letter:capitalize">{value}</dd>
                </div>
              ))}
            </dl>

            <h3 className="mt-10 text-[15px] text-ink-primary">Suits</h3>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {blueprint.businessTypes.map((type) => (
                <li
                  key={type}
                  className="rounded-pill border border-hairline px-3 py-1.5 text-[12.5px] text-ink-secondary"
                >
                  {type}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="border-t border-hairline">
          <div className="mx-auto max-w-shell px-6 py-16">
            <h2 className="font-display text-[22px] text-ink-primary sm:text-[26px]">
              Other {card.industryLabel.toLowerCase()} templates
            </h2>
            <ul className="mt-6 flex flex-wrap gap-2">
              {related.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={`/templates/${entry.id}`}
                    className="inline-flex rounded-pill border border-hairline px-3.5 py-1.5 text-[13px] text-ink-secondary transition hover:border-white/25 hover:text-ink-primary"
                  >
                    {entry.name} — <span className="ml-1 capitalize text-ink-muted">{entry.style}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <Footer />
    </>
  );
}

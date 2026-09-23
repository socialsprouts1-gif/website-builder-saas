import { TopNav } from '@/components/marketing/TopNav';
import { Footer } from '@/components/marketing/Footer';
import { TemplateGallery, type TemplateCard } from '@/components/marketing/TemplateGallery';
import { TemplateLibrary } from '@/components/templates/TemplateLibrary';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { pageMetadata } from '@/lib/metadata';
import { BLUEPRINTS, TEMPLATE_INDUSTRIES, blueprintCard } from '@/lib/templates';

export const metadata = pageMetadata({
  title: 'Website templates',
  description:
    'Professionally structured website templates for restaurants, clinics, shops, gyms, agencies and more — each one a complete site, personalised by AI for your business.',
  path: '/templates',
});

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  let shared: TemplateCard[] = [];
  let signedIn = false;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [{ data }, user] = await Promise.all([
      supabase
        .from('templates')
        .select('slug, name, category, description, project_id')
        .eq('is_published', true)
        .order('sort_order', { ascending: true }),
      getSessionUser(),
    ]);

    signedIn = Boolean(user);
    shared = (data ?? []).map((row) => ({
      slug: row.slug,
      name: row.name,
      category: row.category,
      description: row.description,
      projectId: row.project_id,
    }));
  }

  const cards = BLUEPRINTS.map(blueprintCard);
  const industries = TEMPLATE_INDUSTRIES.map((industry) => ({
    slug: industry.slug,
    label: industry.label,
    count: BLUEPRINTS.filter((blueprint) => blueprint.industry === industry.slug).length,
  })).filter((industry) => industry.count > 0);

  return (
    <>
      <div className="relative">
        <div className="lumen-glow-field" aria-hidden />
        <TopNav signedIn={signedIn} />
        <section className="relative mx-auto max-w-shell px-5 pb-10 pt-12 text-center sm:px-6 sm:pb-12 sm:pt-16">
          <h1 className="mx-auto max-w-3xl font-display text-[40px] leading-tight text-ink-primary sm:text-[56px]">
            Start from something <em className="italic text-accent">finished.</em>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-secondary">
            {cards.length} templates across {industries.length} industries. Each one decides the sections,
            the pages and the design system — {Math.round(
              cards.reduce((total, card) => total + card.sections, 0) / cards.length,
            )}{' '}
            sections on average, not a blank page. Lumen writes your business into it.
          </p>
        </section>
      </div>

      <section className="mx-auto max-w-shell px-5 pb-16 sm:px-6 sm:pb-24">
        <TemplateLibrary cards={cards} industries={industries} />
      </section>

      {shared.length > 0 ? (
        <section className="border-t border-hairline">
          <div className="mx-auto max-w-shell px-5 py-16 sm:px-6">
            <h2 className="font-display text-[26px] text-ink-primary sm:text-[32px]">
              Sites other people published
            </h2>
            <p className="mt-3 max-w-2xl text-[14px] text-ink-secondary">
              Finished Lumen sites shared as starting points. Copying one gives you the project, not just
              the structure.
            </p>
            <div className="mt-8">
              <TemplateGallery templates={shared} signedIn={signedIn} />
            </div>
          </div>
        </section>
      ) : null}

      <Footer />
    </>
  );
}

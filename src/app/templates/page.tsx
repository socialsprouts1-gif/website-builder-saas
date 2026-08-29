import type { Metadata } from 'next';
import { TopNav } from '@/components/marketing/TopNav';
import { Footer } from '@/components/marketing/Footer';
import { TemplateGallery, type TemplateCard } from '@/components/marketing/TemplateGallery';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Templates',
  description: 'Start from a finished site, then make it yours in chat.',
};

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  let templates: TemplateCard[] = [];
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
    templates = (data ?? []).map((row) => ({
      slug: row.slug,
      name: row.name,
      category: row.category,
      description: row.description,
      projectId: row.project_id,
    }));
  }

  return (
    <>
      <div className="relative">
        <div className="lumen-glow-field" aria-hidden />
        <TopNav signedIn={signedIn} />
        <section className="relative mx-auto max-w-shell px-6 pb-12 pt-16 text-center">
          <h1 className="font-display text-[40px] leading-tight text-ink-primary sm:text-[56px]">
            Start from something <em className="italic text-accent">finished.</em>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-ink-secondary">
            Every template is a real generated site. Copy one and it becomes your project — same chat, same
            visual editor, same everything.
          </p>
        </section>
      </div>

      <section className="mx-auto max-w-shell px-6 pb-24">
        <TemplateGallery templates={templates} signedIn={signedIn} />
      </section>

      <Footer />
    </>
  );
}

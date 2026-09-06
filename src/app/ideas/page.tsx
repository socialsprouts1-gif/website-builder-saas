import type { Metadata } from 'next';
import { TopNav } from '@/components/marketing/TopNav';
import { Footer } from '@/components/marketing/Footer';
import { IdeaGallery, IdeaFooterNote } from '@/components/ideas/IdeaGallery';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Ideas',
  description:
    'What a website for your kind of business should look like — worked examples for restaurants, gyms, salons, clinics, shops and more.',
};

export const dynamic = 'force-dynamic';

export default async function IdeasPage() {
  const user = isSupabaseConfigured ? await getSessionUser().catch(() => null) : null;

  return (
    <>
      <div className="relative">
        <div className="lumen-glow-field" aria-hidden />
        <TopNav signedIn={Boolean(user)} />
        <section className="relative mx-auto max-w-shell px-6 pb-12 pt-16 text-center">
          <h1 className="font-display text-[40px] leading-tight text-ink-primary sm:text-[56px]">
            What yours could <em className="italic text-accent">look like.</em>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-ink-secondary">
            A dozen kinds of business, each with the sections it actually needs and a design direction to
            match. Pick the one closest to yours and Lumen builds it in about a minute.
          </p>
        </section>
      </div>

      <section className="mx-auto max-w-shell px-6 pb-24">
        <IdeaGallery signedIn={Boolean(user)} />
        <IdeaFooterNote />
      </section>

      <Footer />
    </>
  );
}

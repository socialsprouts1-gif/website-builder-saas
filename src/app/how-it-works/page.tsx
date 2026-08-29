import type { Metadata } from 'next';
import { TopNav } from '@/components/marketing/TopNav';
import { Footer } from '@/components/marketing/Footer';
import { ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'From one sentence to a deployed website: the four steps Lumen runs for you.',
};

const STEPS = [
  {
    step: '01',
    title: 'Describe it, upload it, or say it',
    body: 'Type a sentence, drop in a screenshot of a layout you like, or hold the mic and talk. All three land in the same generator, so everything after this point works identically.',
  },
  {
    step: '02',
    title: 'Lumen writes the brief',
    body: 'Before any code, Lumen decides what your site actually needs: which pages, what tone, which conversion action — a reservation form for a bistro, a class timetable for a gym.',
  },
  {
    step: '03',
    title: 'A design system, just for you',
    body: 'Palette, font pairing, spacing scale — generated per project so two Lumen sites never look like the same template. Contrast is checked so the result is readable, not just pretty.',
  },
  {
    step: '04',
    title: 'Real code, real copy',
    body: 'Responsive HTML, CSS and JavaScript with genuine written content — menu items, prices, staff bios — plus SEO tags, a sitemap and reveal-on-scroll motion. No lorem ipsum, ever.',
  },
  {
    step: '05',
    title: 'Iterate in chat or by clicking',
    body: '“Make the hero darker.” “Add a menu page.” Each request is a surgical diff, so your earlier edits survive. Or switch to visual mode and edit text and images directly on the page.',
  },
  {
    step: '06',
    title: 'Ship it',
    body: 'Deploy to Vercel in a click, push to a GitHub repo, or export a zip and host it wherever you like. Add your AI chatbot and connect your tools when you are ready.',
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <div className="relative">
        <div className="lumen-glow-field" aria-hidden />
        <TopNav />
        <section className="relative mx-auto max-w-shell px-6 pb-16 pt-16 text-center">
          <Badge tone="accent" className="mb-6">The whole pipeline</Badge>
          <h1 className="mx-auto max-w-3xl font-display text-[40px] leading-[1.06] text-ink-primary sm:text-[58px]">
            One sentence in. <em className="italic text-accent">A finished site out.</em>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] text-ink-secondary">
            No page builder, no drag-and-drop grid, no template to fight. Here is exactly what happens
            between your prompt and your live site.
          </p>
        </section>
      </div>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <ol className="space-y-px overflow-hidden rounded-card border border-hairline bg-hairline">
          {STEPS.map((item) => (
            <li key={item.step} className="bg-raised px-7 py-8">
              <div className="flex gap-6">
                <span className="font-mono text-[12px] text-accent">{item.step}</span>
                <div className="space-y-2">
                  <h2 className="font-display text-xl text-ink-primary">{item.title}</h2>
                  <p className="text-sm leading-relaxed text-ink-secondary">{item.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 text-center">
          <ButtonLink href="/signup" size="lg">Start building →</ButtonLink>
        </div>
      </section>

      <Footer />
    </>
  );
}

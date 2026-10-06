import { Heading } from '@/components/studio/StudioCategories';
import { STUDIO_STEPS } from '@/lib/studio';

/** Four steps, numbered, because the question is always "what do I actually do". */
export function StudioProcess() {
  return (
    <section className="mx-auto max-w-shell px-6 py-16">
      <Heading eyebrow="How it works" title="From idea to 3D website" centered />

      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STUDIO_STEPS.map((step) => (
          <li
            key={step.number}
            className="relative overflow-hidden rounded-card border border-hairline bg-raised p-6"
          >
            <span
              className="pointer-events-none absolute -right-2 -top-6 font-display text-[88px] leading-none text-white/[0.04]"
              aria-hidden
            >
              {step.number}
            </span>
            <p className="text-[12.5px] uppercase tracking-[0.18em] text-accent">{step.number}</p>
            <p className="mt-2 font-display text-[24px] leading-tight text-ink-primary">
              {step.title}
            </p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-secondary">{step.blurb}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

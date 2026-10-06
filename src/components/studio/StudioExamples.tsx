import { Scene } from '@/components/studio/Scene';
import { Heading } from '@/components/studio/StudioCategories';
import { STUDIO_EXAMPLES } from '@/lib/studio';

/**
 * Six worked examples, each in its own palette.
 *
 * The palettes are the argument. A showcase where every card is the same lime
 * green says "this is one template"; six different ones say the tool takes a
 * brand and builds in it, which is the thing somebody is deciding about.
 */
export function StudioExamples() {
  return (
    <section className="mx-auto max-w-shell px-6 py-16">
      <Heading
        eyebrow="Worked examples"
        title="What a finished one looks like"
        blurb="Six briefs, each built as a full experience rather than a page with a model dropped into it."
      />

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {STUDIO_EXAMPLES.map((example) => (
          <li
            key={example.id}
            className="group overflow-hidden rounded-card border border-hairline bg-raised transition hover:border-white/25"
          >
            <Scene
              shape={example.shape}
              tint={example.tint}
              live={false}
              className="h-44 transition-transform duration-500 group-hover:scale-[1.04]"
            />
            <div className="p-5">
              <p className="text-[12.5px] uppercase tracking-[0.16em] text-ink-muted">
                {example.label}
              </p>
              <p className="mt-2 font-display text-[22px] leading-tight text-ink-primary">
                {example.title}
              </p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-secondary">{example.blurb}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

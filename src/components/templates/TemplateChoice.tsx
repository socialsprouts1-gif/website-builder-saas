'use client';

import { PageThumb } from '@/components/ui/PageThumb';
import { cn } from '@/components/ui/cn';
import type { BlueprintCard } from '@/lib/templates';

/**
 * "Which of these should it look like?", asked with pictures.
 *
 * This was a row of three text cards above the prompt box — a name, a style
 * word and a sentence — which asked somebody to choose a design they had never
 * seen. Nobody can answer that, so nobody did, and the choice that decides
 * every page of the site was made by whoever gave up first.
 *
 * So it is a real render of each one, and it is asked inside the questions
 * rather than beside the prompt: it is a question like any other, it has the
 * same skip as any other, and "let Lumen decide" is one of the answers rather
 * than something you have to infer from carrying on.
 */
export function TemplateChoice({
  templates,
  chosen,
  onChoose,
}: {
  templates: BlueprintCard[];
  /** A blueprint id, or null for "decide for me". */
  chosen: string | null;
  onChoose: (id: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <ul className="grid gap-3 sm:grid-cols-2">
        {templates.map((card) => {
          const active = chosen === card.id;
          return (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => onChoose(card.id)}
                aria-pressed={active}
                className={cn(
                  'block w-full overflow-hidden rounded-card border text-left transition',
                  active
                    ? 'border-accent/60 bg-accent-soft'
                    : 'border-hairline bg-raised hover:border-white/20',
                )}
              >
                <PageThumb
                  src={`/api/blueprints/${card.id}/index.html`}
                  title={`${card.name} preview`}
                  className="aspect-[16/11] border-b border-hairline"
                />
                <span className="flex items-start gap-2.5 p-3.5">
                  <span
                    className={cn(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-pill border text-[11px] font-bold',
                      active ? 'border-accent bg-accent text-accent-ink' : 'border-white/25',
                    )}
                  >
                    {active ? '✓' : ''}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[16px] text-ink-primary">{card.name}</span>
                    <span className="mt-0.5 block text-[13.5px] capitalize text-ink-muted">
                      {card.style} · {card.sections} sections · {card.pages} pages
                    </span>
                    <span className="mt-1 block text-[14.5px] leading-relaxed text-ink-secondary">
                      {card.note}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            onClick={() => onChoose(null)}
            aria-pressed={chosen === null}
            className={cn(
              'flex h-full w-full flex-col justify-center gap-2 rounded-card border px-4 py-6 text-left transition',
              chosen === null
                ? 'border-accent/60 bg-accent-soft'
                : 'border-dashed border-hairline bg-raised hover:border-white/20',
            )}
          >
            <span className="text-[16px] text-ink-primary">Let Lumen decide</span>
            <span className="text-[14.5px] leading-relaxed text-ink-secondary">
              It reads what you wrote and works out the pages, the sections and the design itself. Good
              when none of these is quite your business.
            </span>
          </button>
        </li>
      </ul>

      <p className="text-[14px] leading-relaxed text-ink-muted">
        Every one of these is a real page, rendered now — not a picture of one.{' '}
        <a href="/templates" target="_blank" rel="noreferrer" className="text-accent hover:underline">
          See all {templates.length > 0 ? 'the templates' : 'templates'} ↗
        </a>{' '}
        to look at any of them full size first.
      </p>
    </div>
  );
}

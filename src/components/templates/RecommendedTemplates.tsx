'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { BlueprintCard } from '@/lib/templates';

/**
 * Three templates for what somebody just typed, before anything is generated.
 *
 * This replaces the step where a model was handed a sentence and asked to
 * invent a structure. "Create a website for my gym" now means: this is a gym,
 * here are three gym templates, pick the one that looks right — and the
 * structure is then something the owner chose and previewed rather than
 * something a model decided on their behalf and they found out about later.
 *
 * Typing more still works exactly as it did; this appears beside it.
 */
export function RecommendedTemplates({ prompt }: { prompt: string }) {
  const [state, setState] = useState<{
    templates: BlueprintCard[];
    industryLabel: string | null;
  } | null>(null);

  useEffect(() => {
    const text = prompt.trim();
    if (text.length < 8) {
      setState(null);
      return;
    }

    // Debounced, so a sentence being typed is one request and not forty.
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/templates/recommend', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ prompt: text }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as { templates: BlueprintCard[]; industryLabel: string | null };
        if (!cancelled) setState(data);
      } catch {
        // A recommendation is an offer, not a requirement. If it cannot be
        // fetched the prompt box still works, which is the thing that matters.
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [prompt]);

  if (!state?.templates.length) return null;

  return (
    <section className="rounded-card border border-hairline bg-raised p-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">
        {state.industryLabel ? `Templates for ${state.industryLabel.toLowerCase()}` : 'Somewhere to start'}
      </p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
        Starting from one of these decides the pages, the sections and the design before anything is
        written — and you answer questions about your business instead of writing a prompt.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {state.templates.map((card) => (
          <li key={card.id}>
            <Link
              href={`/app/new?template=${card.id}`}
              className="flex h-full flex-col gap-1.5 rounded-[10px] border border-hairline p-4 transition hover:border-white/25"
            >
              <span className="text-[14.5px] text-ink-primary">{card.name}</span>
              <span className="text-[11.5px] capitalize text-ink-muted">
                {card.style} · {card.sections} sections
              </span>
              <span className="text-[12.5px] leading-relaxed text-ink-secondary">{card.note}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12.5px] text-ink-muted">
        Or carry on below and Lumen will work the structure out itself.
      </p>
    </section>
  );
}

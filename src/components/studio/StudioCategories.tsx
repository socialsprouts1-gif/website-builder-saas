'use client';

import { useState } from 'react';
import { Scene } from '@/components/studio/Scene';
import { cn } from '@/components/ui/cn';
import { STUDIO_CATEGORIES } from '@/lib/studio';

/**
 * The eight kinds of thing the Studio makes.
 *
 * Selectable rather than a static grid: the large panel beside them is the
 * point, and a row of eight equal thumbnails is a row nobody looks at twice.
 * Only the chosen scene animates, which is also why there are not eight of them
 * drifting at once.
 */
export function StudioCategories() {
  const [active, setActive] = useState(STUDIO_CATEGORIES[0].id);
  const chosen = STUDIO_CATEGORIES.find((entry) => entry.id === active) ?? STUDIO_CATEGORIES[0];

  return (
    <section className="mx-auto max-w-shell px-6 py-16">
      <Heading
        eyebrow="What it builds"
        title="Eight kinds of experience"
        blurb="Pick a starting point and Lumen builds the scene, the interactions and the page around it. All eight are in development — this is what they will make."
      />

      <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        {/* min-w-0 on both tracks. A grid item's automatic minimum width is
            its content, so a long line inside either column stretches the
            whole grid past the screen rather than wrapping inside it. */}
        <ul className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {STUDIO_CATEGORIES.map((category) => {
            const selected = category.id === chosen.id;
            return (
              // And on the item too: a grid item's own automatic minimum is its
              // content as well, so a nowrap line inside it overflows the track
              // it was given however narrow that track is.
              <li key={category.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setActive(category.id)}
                  aria-pressed={selected}
                  className={cn(
                    'flex w-full items-center gap-3.5 rounded-card border px-3.5 py-3 text-left transition',
                    selected
                      ? 'border-accent/55 bg-accent-soft'
                      : 'border-hairline bg-raised hover:border-white/20',
                  )}
                >
                  <Scene
                    shape={category.shape}
                    live={false}
                    dim
                    className="h-12 w-16 shrink-0 rounded-[8px] border border-hairline"
                    tint={selected ? ['#d7ff3e', '#4f6616'] : ['#8e8e84', '#3a3a34']}
                  />
                  {/* flex-1 as well as min-w-0: a flex item without it sizes
                      to its longest line, so `truncate` had nothing to truncate
                      against and the blurb pushed the whole card past the
                      screen on a phone. */}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15.5px] font-semibold text-ink-primary">
                      {category.label}
                    </span>
                    <span className="mt-0.5 block truncate text-[14px] text-ink-muted lg:whitespace-normal">
                      {category.blurb}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="min-w-0 overflow-hidden rounded-card border border-hairline bg-raised">
          <Scene
            key={chosen.id}
            shape={chosen.shape}
            className="h-[280px] sm:h-[420px]"
            tint={['#d7ff3e', '#4f6616']}
          />
          <div className="border-t border-hairline p-6">
            <p className="font-display text-[24px] leading-tight text-ink-primary">{chosen.label}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">{chosen.blurb}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Heading({
  eyebrow,
  title,
  blurb,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
  centered?: boolean;
}) {
  return (
    <div className={cn('max-w-2xl', centered && 'mx-auto text-center')}>
      <p className="text-[12.5px] uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
      <h2 className="mt-3 font-display text-[34px] leading-tight text-ink-primary sm:text-[42px]">
        {title}
      </h2>
      {blurb ? (
        <p className="mt-3 text-[16px] leading-relaxed text-ink-secondary">{blurb}</p>
      ) : null}
    </div>
  );
}

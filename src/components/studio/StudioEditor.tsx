'use client';

import { useState } from 'react';
import { Scene } from '@/components/studio/Scene';
import { Heading } from '@/components/studio/StudioCategories';
import { cn } from '@/components/ui/cn';
import {
  STUDIO_CONTROLS,
  STUDIO_EDITOR_PANELS,
  STUDIO_TIMELINE,
  STUDIO_TIMELINE_SECONDS,
} from '@/lib/studio';

/**
 * The editor, as it will be.
 *
 * Closer to a motion tool than to a page builder, which is the whole claim:
 * panels down one side, the scene in the middle, the controls under it and a
 * timeline beneath that. It is a mock — the panels switch, nothing renders —
 * and the section says so, because a mock that pretends to be live is how a
 * demo becomes a complaint.
 */
export function StudioEditor() {
  const [panel, setPanel] = useState<string>(STUDIO_EDITOR_PANELS[0]);
  const [control, setControl] = useState<string>(STUDIO_CONTROLS[0].label);

  return (
    <section className="mx-auto max-w-shell px-6 py-16">
      <Heading
        eyebrow="The editor"
        title="A creative tool, not a page builder"
        blurb="Scenes, models, cameras, lights, materials and interactions — each on its own panel, with a timeline underneath."
      />

      <div className="mt-10 overflow-hidden rounded-card border border-hairline bg-raised">
        <div className="grid lg:grid-cols-[180px_1fr]">
          <nav className="flex gap-1 overflow-x-auto border-b border-hairline p-2 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r">
            {STUDIO_EDITOR_PANELS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPanel(item)}
                aria-pressed={panel === item}
                className={cn(
                  'shrink-0 rounded-[9px] px-3 py-2 text-left text-[14.5px] font-medium transition',
                  panel === item
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink-secondary hover:bg-white/5 hover:text-ink-primary',
                )}
              >
                {item}
              </button>
            ))}
          </nav>

          <div>
            <div className="relative">
              <Scene shape="product" className="h-[260px] sm:h-[360px]" tint={['#d7ff3e', '#4f6616']} />
              <span className="absolute left-4 top-4 rounded-pill border border-white/15 bg-black/55 px-3 py-1 text-[13px] font-medium text-ink-primary">
                {panel}
              </span>
              <span className="absolute right-4 top-4 rounded-pill border border-white/15 bg-black/55 px-3 py-1 text-[13px] text-ink-muted">
                1920 × 1080 · 60 fps
              </span>
            </div>

            <div className="border-t border-hairline p-4">
              <ul className="flex flex-wrap gap-1.5">
                {STUDIO_CONTROLS.map((item) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => setControl(item.label)}
                      aria-pressed={control === item.label}
                      className={cn(
                        'rounded-pill border px-3 py-1.5 text-[13.5px] transition',
                        control === item.label
                          ? 'border-accent/55 bg-accent-soft text-ink-primary'
                          : 'border-hairline text-ink-secondary hover:border-white/25',
                      )}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[14px] text-ink-muted">
                {STUDIO_CONTROLS.find((item) => item.label === control)?.group} control · the same set
                on every scene, so nothing has to be relearned per project.
              </p>
            </div>

            <Timeline />
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[14px] text-ink-muted">
        A preview of the interface. The panels switch; the renderer behind them is what is being built.
      </p>
    </section>
  );
}

/**
 * The animation timeline.
 *
 * Six tracks over five seconds, with the clips where they actually overlap —
 * the camera move finishing as the text starts, particles running underneath
 * the whole thing. A timeline where every track is one bar of equal length is
 * a picture of a timeline rather than a timeline.
 */
function Timeline() {
  const seconds = Array.from({ length: STUDIO_TIMELINE_SECONDS + 1 }, (_, index) => index);

  return (
    <div className="border-t border-hairline bg-[var(--bg-base-deep)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] uppercase tracking-[0.16em] text-ink-muted">Timeline</p>
        <p className="text-[13.5px] text-ink-muted tabular-nums">00:00 — 00:05</p>
      </div>

      <div className="mt-3 flex gap-3">
        <div className="w-20 shrink-0">
          <div className="h-5" />
          {STUDIO_TIMELINE.map((track) => (
            <p key={track.label} className="h-7 text-[13.5px] leading-7 text-ink-secondary">
              {track.label}
            </p>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex h-5 justify-between text-[12px] text-ink-muted tabular-nums">
            {seconds.map((second) => (
              <span key={second}>{second}s</span>
            ))}
          </div>

          <div className="relative">
            {/* The ruler the clips sit on. */}
            <div className="pointer-events-none absolute inset-0 flex justify-between" aria-hidden>
              {seconds.map((second) => (
                <span key={second} className="w-px bg-white/10" />
              ))}
            </div>

            {STUDIO_TIMELINE.map((track) => (
              <div key={track.label} className="relative h-7 py-1">
                <div className="h-full rounded-[5px] bg-white/[0.06]" />
                {track.clips.map(([start, end], index) => (
                  <span
                    key={index}
                    // color-mix rather than bg-accent/55: the accent is a CSS
                    // variable, and Tailwind's opacity modifier cannot add an
                    // alpha channel to one — which is why the clips drew as a
                    // glowing outline around nothing.
                    className="absolute inset-y-1 rounded-[5px] border"
                    style={{
                      left: `${(start / STUDIO_TIMELINE_SECONDS) * 100}%`,
                      width: `${((end - start) / STUDIO_TIMELINE_SECONDS) * 100}%`,
                      background: 'color-mix(in srgb, var(--accent) 55%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--accent) 80%, transparent)',
                    }}
                  />
                ))}
              </div>
            ))}

            {/* The playhead, parked rather than running: a cursor sweeping a
                mock timeline forever is motion that means nothing. */}
            <span className="pointer-events-none absolute inset-y-0 left-[44%] w-px bg-accent" aria-hidden>
              <span className="absolute -left-1 -top-0.5 h-2 w-2 rotate-45 bg-accent" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

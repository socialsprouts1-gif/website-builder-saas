'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/components/ui/cn';

export type BuildStageId = 'brief' | 'design' | 'code' | 'persist' | 'done';

/**
 * The build screen. Generation takes the better part of a minute, which is long
 * enough that a single spinner reads as a hang — so this shows the actual
 * pipeline stages, in order, as the server reports them.
 *
 * It deliberately never shows the code being written. Watching HTML scroll past
 * tells a restaurant owner nothing; watching their site get planned, designed
 * and assembled tells them exactly where it is up to.
 */

const STEPS: { id: BuildStageId; label: string; detail: string }[] = [
  { id: 'brief', label: 'Reading the brief', detail: 'Who this is for, and what it has to say.' },
  { id: 'design', label: 'Designing the system', detail: 'Palette, typography, spacing, motion.' },
  { id: 'code', label: 'Assembling the pages', detail: 'Section by section, in real HTML and CSS.' },
  { id: 'persist', label: 'Saving version one', detail: 'So you can always come back to it.' },
];

export function BuildingStage({
  stage,
  message,
  files,
  percent,
  startedAt,
}: {
  stage: BuildStageId;
  message: string | null;
  files: string[];
  /** 0-100, computed by the server so every watcher agrees. */
  percent: number;
  /** When the build began, from the job row. */
  startedAt?: string | null;
}) {
  const activeIndex = STEPS.findIndex((step) => step.id === stage);
  // 'persist' and 'done' both sit past the last visible step.
  const reached = activeIndex === -1 ? STEPS.length : activeIndex;

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-8 px-6 py-10 lg:flex-row lg:gap-14 lg:px-12"
    >
      <BuildScene stage={stage} />

      <div className="w-full max-w-sm lg:max-w-md">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-display text-[22px] leading-tight text-ink-primary">
            {message ?? 'Building your site…'}
          </p>
          <p
            className="shrink-0 font-display text-[26px] leading-none text-accent tabular-nums"
            aria-label={`${percent} percent complete`}
          >
            {percent}%
          </p>
        </div>
        <Elapsed startedAt={startedAt} />

        <ProgressBar percent={percent} />

        <ol className="mt-6 space-y-1">
          {STEPS.map((step, index) => (
            <Step
              key={step.id}
              label={step.label}
              detail={step.detail}
              state={index < reached ? 'done' : index === reached ? 'active' : 'pending'}
            />
          ))}
        </ol>

        <FileTicker files={files} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the scene --

/** Which slab lights up for each stage — the stack fills bottom to top. */
const LIT: Record<BuildStageId, number> = { brief: 1, design: 2, code: 4, persist: 5, done: 5 };

const SLABS = [
  { bars: [72, 40], tall: true },
  { bars: [30, 30, 30] },
  { bars: [55, 80] },
  { bars: [30, 30, 30] },
  { bars: [46] },
];

/**
 * A CSS-only isometric stack: the page's sections, floating apart in space and
 * settling into place as the build progresses. No WebGL and no library — it is
 * transforms on ten elements, so it costs nothing and cannot fail to load.
 */
function BuildScene({ stage }: { stage: BuildStageId }) {
  const lit = LIT[stage] ?? 1;

  return (
    <div className="relative shrink-0" aria-hidden>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.07] blur-[70px]" />

      <div className="relative h-[320px] w-[320px]" style={{ perspective: '1000px' }}>
        <div className="absolute inset-0 animate-orbit" style={{ transformStyle: 'preserve-3d' }}>
          {/* The plate the stack builds on, so the lowest slab has a floor. */}
          <div
            className="absolute left-1/2 top-1/2 h-[132px] w-[228px] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-white/[0.07] bg-white/[0.015]"
            style={{ transform: 'translateZ(-92px)' }}
          />

          {SLABS.map((slab, index) => {
            const active = index < lit;
            return (
              <div
                key={index}
                className={cn(
                  'absolute left-1/2 top-1/2 h-[104px] w-[184px] -translate-x-1/2 -translate-y-1/2',
                  'rounded-[12px] border transition-all duration-700 ease-out',
                  active
                    ? 'border-accent/50 bg-accent/[0.09] shadow-[0_0_22px_-6px_var(--accent)]'
                    : 'border-white/[0.11] bg-white/[0.03]',
                )}
                style={{
                  // Unfinished sections hang a little above where they belong,
                  // then drop into the stack as the build reaches them.
                  transform: `translateZ(${(index - 2) * 36 + (active ? 0 : 20)}px)`,
                  opacity: active ? 1 : 0.55,
                }}
              >
                <div className="flex h-full flex-col justify-center gap-2.5 px-5">
                  {slab.bars.map((width, bar) => (
                    <span
                      key={bar}
                      className={cn(
                        'block rounded-pill transition-colors duration-700',
                        slab.tall && bar === 0 ? 'h-3' : 'h-1.5',
                        active ? 'bg-accent/75' : 'bg-white/[0.16]',
                      )}
                      style={{ width: `${width}%` }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ the list --

function Step({
  label,
  detail,
  state,
}: {
  label: string;
  detail: string;
  state: 'done' | 'active' | 'pending';
}) {
  return (
    <li
      className={cn(
        'flex gap-3 rounded-[10px] px-2.5 py-2 transition-colors',
        state === 'active' && 'bg-accent-soft',
      )}
    >
      <Marker state={state} />
      <div className="min-w-0">
        <p
          className={cn(
            'text-[13px] leading-tight transition-colors',
            state === 'pending' ? 'text-ink-muted' : 'text-ink-primary',
          )}
        >
          {label}
        </p>
        {state === 'active' ? (
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-muted">{detail}</p>
        ) : null}
      </div>
    </li>
  );
}

function Marker({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'done') {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-pill bg-accent text-[9px] font-bold text-accent-ink">
        ✓
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        <span className="h-2 w-2 animate-pulse-dot rounded-pill bg-accent" />
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
      <span className="h-1.5 w-1.5 rounded-pill border border-white/20" />
    </span>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      className="mt-5 h-[4px] w-full overflow-hidden rounded-pill bg-white/8"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-pill bg-accent transition-[width] duration-700 ease-out"
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
      />
    </div>
  );
}

/** Names only, never contents — enough to show progress without a code dump. */
function FileTicker({ files }: { files: string[] }) {
  const recent = useMemo(() => files.slice(-3).reverse(), [files]);
  if (recent.length === 0) return null;

  return (
    <div className="mt-5 border-t border-hairline pt-4">
      <p className="text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
        Written · {files.length}
      </p>
      <ul className="mt-2 space-y-1">
        {recent.map((file, index) => (
          <li
            key={file}
            className={cn(
              'truncate font-mono text-[11.5px] transition-opacity',
              index === 0 ? 'text-accent' : 'text-ink-muted opacity-60',
            )}
          >
            {file}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * How long the build has been running — measured from when it started, not
 * from when this tab opened. The build outlives the page, so a timer that
 * resets on every visit was reporting the wrong thing entirely.
 */
function Elapsed({ startedAt }: { startedAt?: string | null }) {
  const start = useMemo(() => {
    const parsed = startedAt ? Date.parse(startedAt) : Number.NaN;
    // A clock skewed ahead of the server would otherwise show a negative age.
    return Number.isNaN(parsed) ? Date.now() : Math.min(parsed, Date.now());
  }, [startedAt]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  return (
    <p className="mt-1.5 text-[12px] text-ink-muted">
      {seconds < 60 ? `${seconds}s elapsed` : `${Math.floor(seconds / 60)}m ${seconds % 60}s elapsed`}
      {seconds > 90 ? ' — a detailed site takes a little longer.' : ''}
    </p>
  );
}

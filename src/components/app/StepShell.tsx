'use client';

import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';

/**
 * One screen of a one-question-at-a-time flow.
 *
 * It exists so every step of every flow has the same chrome, and in particular
 * the same way out. Skipping used to be a grey sentence at the end of a row,
 * which is not a button and did not read as one — somebody who did not want to
 * answer anything could not see how to stop answering. Here it is a button, it
 * is always on screen, and it says what it does.
 */
export function StepShell({
  index,
  total,
  label,
  title,
  help,
  aside,
  children,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  onSkip,
  skipLabel = 'Skip this',
  onSkipAll,
  skipAllLabel = 'Skip the rest and build',
  busy = false,
}: {
  /** Zero-based, when the length of the flow is known. */
  index?: number;
  total?: number;
  /** Shown instead of the dots when it is not. */
  label?: string;
  title: string;
  help?: string;
  /** A line under the buttons — what happens next, what this costs. */
  aside?: React.ReactNode;
  children?: React.ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
  onSkipAll?: () => void;
  skipAllLabel?: string;
  busy?: boolean;
}) {
  const dots = typeof index === 'number' && typeof total === 'number' && total > 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-hidden>
          {dots
            ? Array.from({ length: total! }, (_, position) => (
                <span
                  key={position}
                  className={cn(
                    'h-1 rounded-pill transition-all',
                    position === index
                      ? 'w-6 bg-accent'
                      : position < index!
                        ? 'w-3 bg-accent/45'
                        : 'w-3 bg-white/25',
                  )}
                />
              ))
            : null}
        </div>
        <p className="text-[11.5px] text-ink-muted">
          {dots ? `${index! + 1} of ${total}` : (label ?? '')}
        </p>
      </div>

      <div>
        <h2 className="font-display text-[24px] leading-tight text-ink-primary">{title}</h2>
        {help ? <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{help}</p> : null}
      </div>

      {children}

      <div className="space-y-3 border-t border-hairline pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {onBack ? (
            <Button variant="ghost" onClick={onBack} disabled={busy}>
              Back
            </Button>
          ) : null}
          <Button onClick={onNext} disabled={busy || nextDisabled}>
            {nextLabel}
          </Button>
          {onSkip ? (
            <Button variant="secondary" onClick={onSkip} disabled={busy}>
              {skipLabel}
            </Button>
          ) : null}
          {onSkipAll ? (
            <Button variant="secondary" onClick={onSkipAll} disabled={busy} className="sm:ml-auto">
              {skipAllLabel} →
            </Button>
          ) : null}
        </div>
        {aside ? <div className="text-[12.5px] leading-relaxed text-ink-muted">{aside}</div> : null}
      </div>
    </div>
  );
}

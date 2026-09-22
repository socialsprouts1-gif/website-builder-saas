import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';

/**
 * Every full-page dead end, from one place.
 *
 * Not found, not allowed, broken, down for maintenance, offline, signed out:
 * six situations that had six different treatments or none at all. They are
 * one screen with different words, because the shape of the answer is always
 * the same — say what happened in plain language, say whether it is the
 * person's fault, and give them somewhere to go that is not the browser's
 * back button.
 *
 * A code is shown only where it means something to the person reading it. "500"
 * helps somebody writing to support; "we lost it" helps nobody.
 */
export interface StatusAction {
  href: string;
  label: string;
  tone?: 'primary' | 'quiet';
}

export function StatusScreen({
  code,
  title,
  accent,
  message,
  detail,
  actions = [],
  children,
}: {
  /** Shown small, above the heading. Omit where a number adds nothing. */
  code?: string;
  title: string;
  /** The last word or two of the title, emphasised. */
  accent?: string;
  message: string;
  /** A second, quieter line — what to try, or what it is not. */
  detail?: string;
  actions?: StatusAction[];
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <div className="lumen-glow-field" aria-hidden />

      <div className="relative w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>

        {code ? (
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">{code}</p>
        ) : null}

        <h1 className="font-display text-[34px] leading-tight text-ink-primary sm:text-[40px]">
          {title}
          {accent ? (
            <>
              {' '}
              <em className="italic text-accent">{accent}</em>
            </>
          ) : null}
        </h1>

        <p className="mx-auto max-w-sm text-[14.5px] leading-relaxed text-ink-secondary">{message}</p>

        {detail ? (
          <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-ink-muted">{detail}</p>
        ) : null}

        {children}

        {actions.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            {actions.map((action) =>
              action.tone === 'quiet' ? (
                <Link
                  key={action.href}
                  href={action.href}
                  className="text-[13px] text-ink-muted transition hover:text-ink-primary"
                >
                  {action.label}
                </Link>
              ) : (
                <ButtonLink key={action.href} href={action.href}>
                  {action.label}
                </ButtonLink>
              ),
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The same screen, for a client boundary that needs a retry button. */
export function StatusRetry({
  onRetry,
  label = 'Try again',
  className,
}: {
  onRetry: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className={cn(
        'rounded-pill bg-accent px-5 py-2.5 text-[14px] text-accent-ink transition hover:opacity-90',
        className,
      )}
    >
      {label}
    </button>
  );
}

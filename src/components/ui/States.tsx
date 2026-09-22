import Link from 'next/link';
import { cn } from './cn';

/**
 * The five things a panel can be saying instead of showing content.
 *
 * Empty, loading, failed, succeeded, or "your search found nothing" — which is
 * not the same as empty and should never be worded as though it were. "No
 * products yet" to somebody who has forty products and typed a typo is a small
 * insult.
 *
 * Gathered here because they were being written inline, slightly differently,
 * on every screen: a muted paragraph in one place, a dashed box in another, a
 * bare "Loading..." in a third. One set means a fix to the wording or the
 * spacing lands everywhere at once.
 */

/** Nothing has been created yet — the beginning, not a failure. */
export function EmptyState({
  title,
  message,
  action,
  className,
}: {
  title: string;
  message?: string;
  action?: { href: string; label: string } | React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-card border border-dashed border-hairline px-5 py-10 text-center',
        className,
      )}
    >
      <p className="text-[14px] text-ink-primary">{title}</p>
      {message ? (
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-muted">{message}</p>
      ) : null}
      {action ? (
        <div className="mt-4 flex justify-center">
          {isLink(action) ? (
            <Link
              href={action.href}
              className="rounded-pill bg-accent px-4 py-2 text-[13.5px] text-accent-ink transition hover:opacity-90"
            >
              {action.label}
            </Link>
          ) : (
            action
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A search or filter matched nothing.
 *
 * Deliberately different from empty: it names what was searched for, and the
 * way out is to clear the filter rather than to create something.
 */
export function NoResults({
  query,
  onClear,
  className,
}: {
  query?: string;
  /** Whatever clears the filter — a button, a link. */
  onClear?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-card border border-hairline px-5 py-10 text-center', className)}>
      <p className="text-[14px] text-ink-primary">
        {query ? <>Nothing matches “{query}”.</> : 'Nothing matches that.'}
      </p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-muted">
        Check the spelling, or try a shorter word.
      </p>
      {onClear ? <div className="mt-4 flex justify-center">{onClear}</div> : null}
    </div>
  );
}

/** Something is happening. Says what, because a bare spinner says nothing. */
export function LoadingState({
  label = 'Loading…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-center gap-2.5 px-5 py-10', className)} role="status">
      <span aria-hidden className="h-1.5 w-1.5 animate-pulse-dot rounded-pill bg-accent" />
      <span className="text-[13px] text-ink-muted">{label}</span>
    </div>
  );
}

/** A row of grey blocks, for where the shape of the content is known. */
export function Skeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)} aria-hidden>
      {Array.from({ length: rows }).map((_unused, index) => (
        <span
          key={index}
          className="block h-11 w-full animate-pulse rounded-card bg-white/[0.04]"
          style={{ animationDelay: `${index * 90}ms` }}
        />
      ))}
    </div>
  );
}

/**
 * Something failed.
 *
 * Always says what to do next, even when that is only "try again" — an error
 * with no next step leaves somebody staring at a red box.
 */
export function ErrorState({
  message,
  retry,
  className,
}: {
  message: string;
  retry?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-card border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-3.5',
        className,
      )}
      role="alert"
    >
      <p className="text-[13px] leading-relaxed text-[#e5735a]">{message}</p>
      {retry ? <div className="mt-3">{retry}</div> : null}
    </div>
  );
}

/** Something worked. Quiet, and it does not linger by itself. */
export function SuccessState({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'rounded-card border border-accent/30 bg-accent-soft px-4 py-3 text-[13px] leading-relaxed text-ink-primary',
        className,
      )}
      role="status"
    >
      {message}
    </p>
  );
}

function isLink(value: unknown): value is { href: string; label: string } {
  return Boolean(value) && typeof value === 'object' && 'href' in (value as object);
}

import { cn } from './cn';

/**
 * macOS-style window chrome used to frame every live preview in the product —
 * the same motif as the marketing hero's preview panel.
 */
export function CodeWindow({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-window border border-hairline bg-raised shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]',
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-hairline px-3 py-2.5 sm:px-4">
        {/* The window chrome and the title are decoration; the actions are the
            controls. On a phone the decoration gets out of the way. */}
        <span className="hidden gap-1.5 sm:flex">
          <span className="h-2.5 w-2.5 rounded-pill bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-pill bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-pill bg-white/15" />
        </span>
        <span className="hidden truncate font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted sm:block">
          {title}
        </span>
        {actions ? (
          <span className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">{actions}</span>
        ) : null}
      </div>
      <div className={cn('bg-[var(--bg-base-deep)]', bodyClassName)}>{children}</div>
    </div>
  );
}

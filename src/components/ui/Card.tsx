import { cn } from './cn';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-card border border-hairline bg-raised p-5', className)}>{children}</div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1.5">
        <h1 className="font-display text-[28px] leading-tight text-ink-primary">{title}</h1>
        {description ? <p className="max-w-xl text-sm text-ink-secondary">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-hairline bg-raised/40 px-6 py-14 text-center">
      <h2 className="font-display text-xl text-ink-primary">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-secondary">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

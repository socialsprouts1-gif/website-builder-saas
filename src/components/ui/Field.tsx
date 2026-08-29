import { cn } from './cn';

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="block text-[13px] text-ink-secondary">{label}</span>
      {children}
      {hint ? <span className="block text-[12px] text-ink-muted">{hint}</span> : null}
    </label>
  );
}

const controlBase =
  'w-full rounded-[10px] border border-hairline bg-raised px-3.5 py-2.5 text-sm text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-accent/45';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlBase, 'resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlBase, 'appearance-none pr-9', className)} {...props} />;
}

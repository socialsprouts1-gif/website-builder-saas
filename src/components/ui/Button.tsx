'use client';

import Link from 'next/link';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-110 border border-transparent font-medium',
  secondary: 'bg-transparent text-ink-primary border border-hairline hover:bg-white/5',
  ghost: 'bg-transparent text-ink-secondary border border-transparent hover:text-ink-primary',
  danger: 'bg-transparent text-[#e5735a] border border-[#e5735a]/35 hover:bg-[#e5735a]/10',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-[13px]',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-6 text-[15px]',
};

function classesFor(variant: Variant, size: Size, className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-pill transition',
    'disabled:cursor-not-allowed disabled:opacity-45',
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={classesFor(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  target,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  target?: string;
}) {
  return (
    <Link href={href} target={target} className={classesFor(variant, size, className)}>
      {children}
    </Link>
  );
}

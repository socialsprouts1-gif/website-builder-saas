import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="lumen-glow-field" aria-hidden />
      <div className="relative mx-auto flex w-full max-w-shell items-center px-6 py-6">
        <Logo />
        <Link href="/" className="ml-auto text-[13px] text-ink-muted transition hover:text-ink-primary">
          ← Back to site
        </Link>
      </div>

      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-20">
        <div className="mb-8 text-center">
          <h1 className="font-display text-[34px] leading-tight text-ink-primary">{title}</h1>
          <p className="mt-2 text-sm text-ink-secondary">{subtitle}</p>
        </div>
        <div className="rounded-card border border-hairline bg-raised p-6">{children}</div>
      </main>
    </div>
  );
}

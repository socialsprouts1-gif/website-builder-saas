import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="lumen-glow-field" aria-hidden />
      <div className="relative space-y-6">
        <Logo />
        <h1 className="font-display text-[40px] leading-tight text-ink-primary">
          Nothing here <em className="italic text-accent">yet.</em>
        </h1>
        <p className="max-w-sm text-sm text-ink-secondary">
          That page does not exist. It may have been a site you deleted, or a link that moved.
        </p>
        <div className="flex justify-center gap-3">
          <ButtonLink href="/app">Your sites</ButtonLink>
          <Link href="/" className="self-center text-[13px] text-ink-muted hover:text-ink-primary">
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

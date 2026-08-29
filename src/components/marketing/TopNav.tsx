'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';

const LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/showcase', label: 'Showcase' },
  { href: '/templates', label: 'Templates' },
];

export function TopNav({ signedIn = false }: { signedIn?: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-colors duration-300',
        scrolled ? 'border-b border-hairline bg-raised/85 backdrop-blur-xl' : 'bg-transparent',
      )}
    >
      <nav className="mx-auto flex h-[68px] max-w-shell items-center gap-6 px-6">
        <Logo />
        <div className="mx-auto hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13.5px] text-ink-muted transition hover:text-ink-primary"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/pricing" className="text-[13.5px] text-ink-muted transition hover:text-ink-primary">
            Pricing
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-3 md:ml-0">
          {signedIn ? (
            <ButtonLink href="/app" size="sm">
              Open Lumen →
            </ButtonLink>
          ) : (
            <>
              <Link href="/login" className="hidden text-[13.5px] text-ink-muted transition hover:text-ink-primary sm:block">
                Log in
              </Link>
              <ButtonLink href="/signup" size="sm">
                Start building →
              </ButtonLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

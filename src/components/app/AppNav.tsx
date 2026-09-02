'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { CreditMeter } from '@/components/app/CreditMeter';
import { cn } from '@/components/ui/cn';

/**
 * Flat left nav. Every entry is a full page — no nested settings menus,
 * no accordions (spec Section 17).
 */
const GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: 'Build',
    items: [
      { href: '/app', label: 'My sites' },
      { href: '/app/new', label: 'New site' },
      { href: '/templates', label: 'Templates' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/app/settings/account', label: 'Account' },
      { href: '/app/settings/billing', label: 'Billing' },
      { href: '/app/settings/api-keys', label: 'API keys' },
      { href: '/app/settings/connectors', label: 'Connectors' },
    ],
  },
];

export interface CreditSummary {
  used: number;
  limit: number;
  resetsAt: string;
  hasOwnKey: boolean;
  platformConfigured: boolean;
}

export function AppNav({
  email,
  isAdmin,
  credits,
}: {
  email: string;
  isAdmin: boolean;
  credits: CreditSummary | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col gap-8 border-b border-hairline px-5 py-5 lg:h-screen lg:w-[232px] lg:border-b-0 lg:border-r lg:py-6">
      <Logo href="/app" />

      <nav className="flex flex-1 flex-col gap-7 overflow-y-auto">
        {GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pb-1 text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">{group.title}</p>
            {group.items.map((item) => {
              const active = item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block rounded-[9px] px-3 py-2 text-[13.5px] transition',
                    active ? 'bg-accent-soft text-accent' : 'text-ink-secondary hover:bg-white/5 hover:text-ink-primary',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        {isAdmin ? (
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">Internal</p>
            <Link
              href="/admin"
              className="block rounded-[9px] px-3 py-2 text-[13.5px] text-ink-secondary transition hover:bg-white/5 hover:text-ink-primary"
            >
              Admin
            </Link>
          </div>
        ) : null}
      </nav>

      {credits ? (
        <div className="pt-1">
          <CreditMeter {...credits} variant="nav" />
        </div>
      ) : null}

      <div className="space-y-2 border-t border-hairline pt-4">
        <p className="truncate px-3 text-[12px] text-ink-muted" title={email}>
          {email}
        </p>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full rounded-[9px] px-3 py-2 text-left text-[13px] text-ink-muted transition hover:bg-white/5 hover:text-ink-primary"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

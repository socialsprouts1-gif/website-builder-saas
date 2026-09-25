'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { CreditMeter } from '@/components/app/CreditMeter';
import { cn } from '@/components/ui/cn';

/**
 * Flat left nav. Every entry is a full page — no nested settings menus,
 * no accordions (spec Section 17).
 *
 * Grouped as workspace and account, because those are two different questions:
 * one is about the sites, the other is about the person paying for them.
 *
 * Every entry here is a page that exists. It is an easy nav to pad out with
 * things that sound right — a Team tab, an Analytics tab — and every one of
 * those is a click that ends in a 404 or, worse, an empty screen that looks
 * broken rather than absent.
 */
const GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: 'Workspace',
    items: [
      { href: '/app', label: 'My sites' },
      { href: '/app/new', label: 'New site' },
      { href: '/app/google', label: 'From Google' },
      { href: '/templates', label: 'Templates' },
      { href: '/app/deployments', label: 'Deployments' },
      { href: '/app/history', label: 'Version history' },
      { href: '/app/settings/connectors', label: 'Connectors' },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/app/settings/billing', label: 'Plans & billing' },
      { href: '/app/settings/account', label: 'Settings' },
      { href: '/app/settings/api-keys', label: 'API keys' },
      { href: '/app/trash', label: 'Trash' },
    ],
  },
];

export interface CreditSummary {
  used: number;
  limit: number;
  resetsAt: string;
  hasOwnKey: boolean;
  platformConfigured: boolean;
  tier: 'admin' | 'pro' | 'free';
  unlimited: boolean;
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
  const [open, setOpen] = useState(false);

  // Following a link is a navigation, not a reason to leave the menu covering
  // the page you just asked for.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <aside
      className={cn(
        'flex w-full shrink-0 flex-col border-b border-hairline px-5 lg:h-screen lg:w-[232px]',
        'lg:gap-8 lg:border-b-0 lg:border-r lg:py-6',
        // On a phone this was the whole nav stacked full-width: a logo, eight
        // links, the credit meter and the sign-out, about five hundred pixels
        // of it above every page before any content began. It is a bar now,
        // and everything else is behind the button on it.
        open ? 'gap-6 py-5' : 'gap-0 py-3 lg:gap-8',
      )}
    >
      <div className="flex items-center justify-between lg:block">
        <div>
          <Logo href="/app" />
          <p className="mt-1.5 hidden px-[38px] text-[9.5px] uppercase tracking-[0.22em] text-ink-muted lg:block">
            Build · Ship · Iterate
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="rounded-[9px] border border-hairline px-3 py-1.5 text-[13px] text-ink-secondary transition hover:text-ink-primary lg:hidden"
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      <nav
        className={cn(
          'flex-1 flex-col gap-7 overflow-y-auto',
          open ? 'flex' : 'hidden lg:flex',
        )}
      >
        {GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pb-1 text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">{group.title}</p>
            {group.items.map((item) => {
              // Exact for the section roots, so "My sites" does not stay lit
              // on every page under /app and Settings does not light up for
              // its siblings.
              const active =
                item.href === '/app' || item.href.startsWith('/app/settings/')
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
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
              Admin panel
            </Link>
          </div>
        ) : null}
      </nav>

      {credits ? (
        <div className={cn('pt-1', open ? 'block' : 'hidden lg:block')}>
          <CreditMeter {...credits} variant="nav" />
        </div>
      ) : null}

      <div
        className={cn(
          'space-y-2 border-t border-hairline pt-4',
          open ? 'block' : 'hidden lg:block',
        )}
      >
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

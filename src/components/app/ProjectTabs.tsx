'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/components/ui/cn';

/** Each project surface is its own page with its own tab — never a modal. */
export function ProjectTabs({ projectId, name }: { projectId: string; name: string }) {
  const pathname = usePathname();
  const base = `/app/project/${projectId}`;

  const tabs = [
    { href: base, label: 'Workspace' },
    { href: `${base}/editor`, label: 'Editor' },
    { href: `${base}/leads`, label: 'Enquiries' },
    { href: `${base}/chatbot`, label: 'Chatbot' },
    { href: `${base}/connectors`, label: 'Connectors' },
    { href: `${base}/deploy`, label: 'Deploy' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-4 py-2.5 sm:px-6 sm:py-3">
      <Link href="/app" className="text-[13px] text-ink-muted transition hover:text-ink-primary">
        ← Sites
      </Link>
      <span className="truncate font-display text-[17px] text-ink-primary">{name}</span>
      {/* Sideways on a phone, rather than wrapping five tabs into three rows. */}
      <nav className="-mx-4 flex w-full gap-1 overflow-x-auto px-4 sm:mx-0 sm:ml-auto sm:w-auto sm:px-0">
        {tabs.map((tab) => {
          const active = tab.href === base ? pathname === base : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'shrink-0 rounded-pill px-3.5 py-1.5 text-[13px] transition',
                active ? 'bg-accent-soft text-accent' : 'text-ink-secondary hover:text-ink-primary',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

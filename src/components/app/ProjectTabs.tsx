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
    { href: `${base}/chatbot`, label: 'Chatbot' },
    { href: `${base}/connectors`, label: 'Connectors' },
    { href: `${base}/deploy`, label: 'Deploy' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-hairline px-6 py-3">
      <Link href="/app" className="text-[13px] text-ink-muted transition hover:text-ink-primary">
        ← Sites
      </Link>
      <span className="truncate font-display text-[17px] text-ink-primary">{name}</span>
      <nav className="ml-auto flex gap-1">
        {tabs.map((tab) => {
          const active = tab.href === base ? pathname === base : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'rounded-pill px-3.5 py-1.5 text-[13px] transition',
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

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/components/ui/cn';
import { projectTabs } from '@/components/app/project-nav';

/**
 * The tabs across the top of a project.
 *
 * Icons as well as words, because seven words in a row at one size and one
 * weight is a list nobody reads — the complaint was that it was "not
 * understandable", and it was right: nothing in it said which was the thing
 * you were on, which was next, or what any of them did.
 *
 * So each tab has a mark, the order is the order you actually use them in,
 * and the one you should go to next is pointed at.
 */

type Icon = (props: { className?: string }) => React.ReactElement;

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Mark(body: React.ReactNode): Icon {
  function Glyph({ className }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>
        {body}
      </svg>
    );
  }
  return Glyph;
}

const ICONS: Record<string, Icon> = {
  workspace: Mark(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M9 9v11" />
    </>,
  ),
  editor: Mark(
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </>,
  ),
  shop: Mark(
    <>
      <path d="M3 7h18l-1.4 11.2a2 2 0 01-2 1.8H6.4a2 2 0 01-2-1.8z" />
      <path d="M8.5 7V5.5a3.5 3.5 0 017 0V7" />
    </>,
  ),
  results: Mark(
    <>
      <path d="M4 19V10M10 19V5M16 19v-6M22 19H2" />
    </>,
  ),
  chatbot: Mark(
    <>
      <path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.9 8.9 0 01-4-.9L3 21l1.9-5a8.4 8.4 0 01-.9-4 8.4 8.4 0 018.4-8.4h.6a8.4 8.4 0 018 8z" />
    </>,
  ),
  connectors: Mark(
    <>
      <path d="M10 13a5 5 0 007.5.5l3-3A5 5 0 0013.5 3.5L11.7 5.2" />
      <path d="M14 11a5 5 0 00-7.5-.5l-3 3A5 5 0 0010.5 20.5l1.8-1.7" />
    </>,
  ),
  deploy: Mark(
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 21v-9M4 7.5l8 4.5 8-4.5" />
    </>,
  ),
};

export function ProjectTabs({
  projectId,
  name,
  nextStep,
}: {
  projectId: string;
  name: string;
  /**
   * The tab to point at.
   *
   * A site that has just been generated has an obvious next move — open the
   * editor and change something — and nothing on screen said so. The arrow is
   * only ever on one tab, and only while there is a reason for it.
   */
  nextStep?: string;
}) {
  const pathname = usePathname();
  const base = `/app/project/${projectId}`;
  const tabs = projectTabs(projectId);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-4 py-2.5 sm:px-6 sm:py-3">
      <Link href="/app" className="text-[15px] text-ink-muted transition hover:text-ink-primary">
        ← Sites
      </Link>
      <span className="truncate font-display text-[18.5px] text-ink-primary">{name}</span>

      {/* Sideways on a phone, rather than wrapping seven tabs into three rows. */}
      <nav className="-mx-4 flex w-full gap-1 overflow-x-auto px-4 sm:mx-0 sm:ml-auto sm:w-auto sm:px-0">
        {tabs.map((tab) => {
          const active = tab.href === base ? pathname === base : pathname.startsWith(tab.href);
          const Icon = ICONS[tab.key];
          const pointed = nextStep === tab.key && !active;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex shrink-0 items-center gap-2 rounded-pill px-3.5 py-2 text-[15px] transition',
                active
                  ? 'bg-accent-soft text-accent'
                  : 'text-ink-secondary hover:bg-white/5 hover:text-ink-primary',
                pointed && 'text-accent',
              )}
            >
              {Icon ? <Icon className="h-[17px] w-[17px] shrink-0" /> : null}
              <span>{tab.label}</span>

              {pointed ? (
                <>
                  {/* A dot rather than a word: the tab already says what it is,
                      and a "next" badge on a row of seven tabs is more words in
                      a place that already had too many. */}
                  <span className="lumen-nudge absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" />
                  <span className="sr-only">Suggested next step</span>
                </>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

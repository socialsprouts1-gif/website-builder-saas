'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { Button, ButtonLink } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { IDEAS, promptFor, type Idea } from '@/lib/ideas';
import { CATEGORIES } from '@/lib/categories';
import { SiteMock, MOCK_SIZE } from '@/components/ideas/SiteMock';

/**
 * Browse worked examples. Each card is a real miniature of the site the prompt
 * below it would build, so the choice is made by looking rather than reading.
 */
export function IdeaGallery({ signedIn }: { signedIn: boolean }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const used = useMemo(
    () => CATEGORIES.filter((category) => IDEAS.some((idea) => idea.category === category.slug)),
    [],
  );
  const visible = filter ? IDEAS.filter((idea) => idea.category === filter) : IDEAS;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-center gap-2">
        <CategoryChip label="Every business" active={filter === null} onClick={() => setFilter(null)} />
        {used.map((category) => (
          <CategoryChip
            key={category.slug}
            label={category.label}
            active={filter === category.slug}
            onClick={() => setFilter(filter === category.slug ? null : category.slug)}
          />
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {visible.map((idea) => (
          <IdeaCard
            key={idea.slug}
            idea={idea}
            signedIn={signedIn}
            open={open === idea.slug}
            onToggle={() => setOpen((current) => (current === idea.slug ? null : idea.slug))}
          />
        ))}
      </div>
    </div>
  );
}

function IdeaCard({
  idea,
  signedIn,
  open,
  onToggle,
}: {
  idea: Idea;
  signedIn: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const prompt = promptFor(idea);
  const start = `/app/new?category=${idea.category}&prompt=${encodeURIComponent(prompt)}`;

  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-raised">
      <Preview idea={idea} />

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] text-ink-primary">{idea.business}</p>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">
              {idea.direction.name} — {idea.direction.mood.toLowerCase()}
            </p>
          </div>
          <Swatches idea={idea} />
        </div>

        <ul className="flex flex-wrap gap-1.5">
          {idea.sections.map((section) => (
            <li
              key={section}
              className="rounded-pill border border-hairline px-2.5 py-1 text-[11.5px] text-ink-secondary"
            >
              {section}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink
            href={signedIn ? start : `/signup?next=${encodeURIComponent(start)}`}
            size="sm"
          >
            Build this
          </ButtonLink>
          <Button size="sm" variant="secondary" onClick={onToggle}>
            {open ? 'Hide the brief' : 'See the brief'}
          </Button>
        </div>

        {open ? (
          <div className="space-y-3 rounded-[10px] border border-hairline bg-[var(--bg-base-deep)] p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">
              What Lumen will be told
            </p>
            <p className="text-[12.5px] leading-relaxed text-ink-secondary">{prompt}</p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(prompt).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                });
              }}
              className="text-[12px] text-accent transition hover:underline"
            >
              {copied ? 'Copied' : 'Copy this prompt'}
            </button>
            <p className="text-[11.5px] leading-relaxed text-ink-muted">
              Edit any of it on the next screen — swap the colours, the sections, the tone. This is a
              starting point, not a template you are stuck inside.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The mock is drawn at full page width and scaled down, so its proportions are
 * a real page's rather than a squashed card's.
 */
function Preview({ idea }: { idea: Idea }) {
  const scale = 0.52;
  return (
    <div
      className="relative overflow-hidden border-b border-hairline"
      style={{ height: MOCK_SIZE.height * scale }}
    >
      <div
        className="origin-top-left"
        style={{ transform: `scale(${scale})`, width: MOCK_SIZE.width, height: MOCK_SIZE.height }}
      >
        <SiteMock idea={idea} />
      </div>
    </div>
  );
}

function Swatches({ idea }: { idea: Idea }) {
  const p = idea.direction.palette;
  return (
    <div className="flex shrink-0 gap-1" title={`${p.bg} · ${p.ink} · ${p.accent}`}>
      {[p.bg, p.surface, p.ink, p.accent].map((colour, index) => (
        <span
          key={`${colour}-${index}`}
          className={cn('h-5 w-5 rounded-[5px] border border-white/12')}
          style={{ background: colour }}
        />
      ))}
    </div>
  );
}

export function IdeaFooterNote() {
  return (
    <p className="mt-12 text-center text-[13px] text-ink-secondary">
      None of these fit?{' '}
      <Link href="/app/new" className="text-accent hover:underline">
        Describe your business in a sentence
      </Link>{' '}
      — that is the whole point.
    </p>
  );
}

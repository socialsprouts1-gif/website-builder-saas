'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, ButtonLink } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { EmptyState } from '@/components/ui/Card';
import type { BlueprintCard, BlueprintFeature, BlueprintStyle } from '@/lib/templates';

export interface LibraryIndustry {
  slug: string;
  label: string;
  count: number;
}

const STYLES: BlueprintStyle[] = [
  'modern', 'premium', 'minimal', 'bold', 'editorial', 'warm', 'clinical', 'playful',
];

const FEATURES: { id: BlueprintFeature; label: string }[] = [
  { id: 'shop', label: 'Shop & checkout' },
  { id: 'booking', label: 'Booking' },
  { id: 'listings', label: 'Listings' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'courses', label: 'Courses' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'landing', label: 'Landing page' },
  { id: 'multipage', label: 'Multi-page' },
];

/**
 * The library.
 *
 * Filtering happens here rather than on the server because the whole catalogue
 * is a few kilobytes of data that ships with the page — a round trip per chip
 * would be slower and would make the filters feel like a form.
 */
export function TemplateLibrary({
  cards,
  industries,
}: {
  cards: BlueprintCard[];
  industries: LibraryIndustry[];
}) {
  const [industry, setIndustry] = useState<string | null>(null);
  const [style, setStyle] = useState<BlueprintStyle | null>(null);
  const [feature, setFeature] = useState<BlueprintFeature | null>(null);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return cards.filter((card) => {
      if (industry && card.industryLabel !== industries.find((i) => i.slug === industry)?.label) return false;
      if (style && card.style !== style) return false;
      if (feature && !card.features.includes(feature)) return false;
      if (!words.length) return true;
      const haystack = [card.name, card.note, card.industryLabel, card.style, ...card.businessTypes]
        .join(' ')
        .toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }, [cards, industries, industry, style, feature, query]);

  const filtered = Boolean(industry || style || feature || query.trim());

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <label className="block">
          <span className="sr-only">Search templates</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search — “dentist”, “coffee shop”, “online store”…"
            className="w-full rounded-pill border border-hairline bg-raised px-5 py-3.5 text-[15px] text-ink-primary outline-none placeholder:text-ink-muted focus-visible:border-white/30"
          />
        </label>

        <Row label="Industry">
          <Chip active={!industry} onClick={() => setIndustry(null)}>
            All
          </Chip>
          {industries.map((entry) => (
            <Chip
              key={entry.slug}
              active={industry === entry.slug}
              onClick={() => setIndustry(industry === entry.slug ? null : entry.slug)}
            >
              {entry.label}
              <span className="ml-1.5 text-ink-muted">{entry.count}</span>
            </Chip>
          ))}
        </Row>

        <Row label="Style">
          {STYLES.map((entry) => (
            <Chip key={entry} active={style === entry} onClick={() => setStyle(style === entry ? null : entry)}>
              <span className="capitalize">{entry}</span>
            </Chip>
          ))}
        </Row>

        <Row label="Needs">
          {FEATURES.map((entry) => (
            <Chip
              key={entry.id}
              active={feature === entry.id}
              onClick={() => setFeature(feature === entry.id ? null : entry.id)}
            >
              {entry.label}
            </Chip>
          ))}
        </Row>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-hairline py-3">
        <p className="text-[13px] text-ink-secondary">
          {visible.length} {visible.length === 1 ? 'template' : 'templates'}
          {filtered ? ' matching' : ' in the library'}
        </p>
        {filtered ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setIndustry(null);
              setStyle(null);
              setFeature(null);
              setQuery('');
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nothing matches that"
          description="Try a broader word, or describe the business instead and Lumen will recommend three."
          action={<ButtonLink href="/app/new">Describe your business</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((card) => (
            <li key={card.id}>
              <TemplateCardView card={card} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TemplateCardView({ card }: { card: BlueprintCard }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-hairline bg-raised">
      <Link
        href={`/templates/${card.id}`}
        className="group block border-b border-hairline"
        aria-label={`Preview the ${card.name} template`}
      >
        {/* A real render of the template, scaled into the card. It is an iframe
            rather than a screenshot so it can never be out of date, and it is
            inert — pointer events go to the link, not the page inside. */}
        <span
          className="lumen-scale-frame block aspect-[4/3] bg-[var(--bg-base-deep)]"
          style={{ ['--frame-width' as string]: '1280px' }}
        >
          <iframe
            src={`/api/blueprints/${card.id}/index.html`}
            title={`${card.name} preview`}
            loading="lazy"
            tabIndex={-1}
            aria-hidden
            sandbox="allow-scripts"
            className="pointer-events-none border-0"
            style={{ width: 1280, height: 960 }}
          />
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-[19px] text-ink-primary">{card.name}</h3>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">
            {card.industryLabel} · <span className="capitalize">{card.style}</span>
          </p>
        </div>
        <p className="text-[13px] leading-relaxed text-ink-secondary">{card.note}</p>
        <ul className="flex flex-wrap gap-1.5">
          {card.businessTypes.slice(0, 3).map((type) => (
            <li key={type} className="rounded-pill border border-hairline px-2.5 py-1 text-[11px] text-ink-secondary">
              {type}
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-ink-muted">
          {card.sections} sections · {card.pages} pages
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <ButtonLink href={`/app/new?template=${card.id}`} size="sm">
            Use template
          </ButtonLink>
          <ButtonLink href={`/templates/${card.id}`} size="sm" variant="secondary">
            Preview
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] uppercase tracking-[0.14em] text-ink-muted">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-pill border px-3 py-1.5 text-[12.5px] transition',
        active
          ? 'border-accent/60 bg-accent-soft text-ink-primary'
          : 'border-hairline text-ink-secondary hover:border-white/25 hover:text-ink-primary',
      )}
    >
      {children}
    </button>
  );
}

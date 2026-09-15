'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/components/ui/cn';

interface PlaceReview {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
}

interface PlacePhoto {
  name: string;
  attributions: string[];
  /** Present when the listing was read from the page rather than the API. */
  url?: string;
}

interface PlaceProfile {
  placeId: string;
  name: string;
  category: string | null;
  summary: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  hours: string[];
  reviews: PlaceReview[];
  photos: PlacePhoto[];
}

/**
 * Build a site from a business's own Google listing.
 *
 * Two steps on purpose: find the listing, then confirm it is the right one.
 * A chain has forty branches with the same name, and building the wrong shop's
 * website is a worse outcome than one extra click.
 */
export function GoogleImport() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [place, setPlace] = useState<PlaceProfile | null>(null);
  const [looking, setLooking] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // What the owner typed over the top of what was found.
  const [fixes, setFixes] = useState<Record<string, string>>({});

  async function find() {
    if (!url.trim()) return;
    setLooking(true);
    setError(null);
    setPlace(null);
    setFixes({});
    try {
      const response = await fetch('/api/google/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'That lookup failed');
      setPlace(payload.place);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That lookup failed');
    } finally {
      setLooking(false);
    }
  }

  async function build() {
    if (!place) return;
    setBuilding(true);
    setError(null);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt: `A website for ${place.name}${place.category ? `, a ${place.category.toLowerCase()}` : ''}${place.address ? ` at ${place.address}` : ''}.`,
          inputMode: 'google',
          googleUrl: url,
          googleFixes: fixes,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not start the build');
      router.push(`/app/project/${payload.projectId}?job=${payload.jobId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start the build');
      setBuilding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[240px] flex-1">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') find();
            }}
            placeholder="https://maps.app.goo.gl/… or your business name and town"
            aria-label="Google listing link"
          />
        </div>
        <Button onClick={find} disabled={looking || !url.trim()}>
          {looking ? 'Looking…' : 'Find my business'}
        </Button>
      </div>
      <p className="text-[12px] leading-relaxed text-ink-muted">
        On your Google listing press <strong className="text-ink-secondary">Share</strong> and copy the link.
        Typing the business name and town works too. Lumen reads what is publicly on the listing — some
        businesses show a phone number and hours there and some do not, so check what comes back and fill in
        anything missing before you build.
      </p>

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-3 text-[13px] text-[#e5735a]">
          {error}
        </p>
      ) : null}

      {place ? (
        <div className="space-y-5 rounded-card border border-accent/25 bg-raised p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-[20px] leading-tight text-ink-primary">{place.name}</p>
              {place.category ? <p className="mt-0.5 text-[12.5px] text-ink-muted">{place.category}</p> : null}
            </div>
            {place.rating ? (
              <Badge tone="accent" className="shrink-0">
                {place.rating.toFixed(1)}★ · {place.reviewCount ?? 0} reviews
              </Badge>
            ) : null}
          </div>

          {/* Editable, not just displayed. Reading a listing off the page finds
              the name and the photographs reliably and the phone number only
              sometimes, so the gaps are asked for rather than invented. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Fix
              label="Address"
              found={place.address}
              value={fixes.address}
              onChange={(value) => setFixes((current) => ({ ...current, address: value }))}
              placeholder="12 Hill Road, Bandra West, Mumbai"
            />
            <Fix
              label="Phone"
              found={place.phone}
              value={fixes.phone}
              onChange={(value) => setFixes((current) => ({ ...current, phone: value }))}
              placeholder="+91 98765 43210"
            />
            <Fix
              label="Website"
              found={place.website}
              value={fixes.website}
              onChange={(value) => setFixes((current) => ({ ...current, website: value }))}
              placeholder="https://your-site.in"
            />
            <div className="min-w-0">
              <p className="text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">Opening hours</p>
              <p className="mt-1.5 text-[12.5px] text-ink-secondary">
                {place.hours.length > 0
                  ? `${place.hours.length} days read from your listing`
                  : 'Not found — you can add them after the site is built'}
              </p>
            </div>
          </div>

          {place.photos.length > 0 ? (
            <div>
              <p className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
                {place.photos.length} photos — these go straight into the site
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {place.photos.map((photo) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={photo.name}
                    src={photo.url ?? `/api/google/photo?name=${encodeURIComponent(photo.name)}&w=400`}
                    alt={`${place.name}`}
                    loading="lazy"
                    className="h-24 w-32 shrink-0 rounded-[8px] border border-hairline object-cover"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {place.reviews.length > 0 ? (
            <div>
              <p className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
                {place.reviews.length} reviews — quoted on the site, with names
              </p>
              <ul className="space-y-2">
                {place.reviews.slice(0, 2).map((review) => (
                  <li key={`${review.author}-${review.relativeTime}`} className="text-[12.5px] text-ink-secondary">
                    <span className="text-accent">{'★'.repeat(Math.max(1, Math.round(review.rating)))}</span>{' '}
                    <span className="text-ink-muted">{review.author}</span> — “
                    {review.text.slice(0, 120)}
                    {review.text.length > 120 ? '…' : ''}”
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
            <Button onClick={build} disabled={building}>
              {building ? 'Starting…' : 'Build this site'}
            </Button>
            <button
              type="button"
              onClick={() => setPlace(null)}
              className={cn('text-[12.5px] text-ink-muted transition hover:text-ink-primary')}
            >
              Not my business
            </button>
            {place.mapsUrl ? (
              <a
                href={place.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-[12px] text-accent hover:underline"
              >
                Check on Google ↗
              </a>
            ) : null}
          </div>

          <p className="text-[11.5px] leading-relaxed text-ink-muted">
            Photos and reviews come from your Google listing and are copied into your site, credited to their
            authors. Use photos you have the right to publish — customer-contributed images belong to whoever
            took them.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One fact, as read and as corrected.
 *
 * A found value is shown in the field so it can be edited in place; a missing
 * one leaves the field empty and says so, which is the difference between "we
 * could not find this" and "this business has no phone number".
 */
function Fix({
  label,
  found,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  found: string | null;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">{label}</span>
        {!found && !value ? (
          <span className="text-[10.5px] text-ink-muted">not found</span>
        ) : null}
      </span>
      <input
        value={value ?? found ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="lumen-well mt-1.5 w-full rounded-[9px] border border-hairline px-2.5 py-1.5 text-[12.5px] text-ink-primary outline-none focus:border-accent/50"
      />
    </label>
  );
}

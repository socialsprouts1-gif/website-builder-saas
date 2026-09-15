'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';

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
  services?: string[];
  note?: string;
  reviews: PlaceReview[];
  photos: PlacePhoto[];
}

/**
 * Build a site from a business's own Google listing.
 *
 * Paste the link, check it found the right place, build. The middle step is a
 * glance, not a form: a chain has forty branches with the same name and
 * building the wrong shop's website is worse than one extra click, but that is
 * all it is there for. Corrections sit behind a disclosure because most
 * listings need none, and a screen that opens with empty fields reads as "fill
 * this in first" — on a page whose entire promise is that you do not have to.
 */
export function GoogleImport() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [place, setPlace] = useState<PlaceProfile | null>(null);
  const [looking, setLooking] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  // What the owner typed over the top of what was found.
  const [fixes, setFixes] = useState<Record<string, string>>({});

  const value = (key: 'name' | 'address' | 'phone') => fixes[key] ?? place?.[key] ?? '';

  async function find() {
    if (!url.trim()) return;
    setLooking(true);
    setError(null);
    setPlace(null);
    setFixes({});
    setFixing(false);
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
    const name = value('name') || place.name;
    const address = value('address');
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt: `A website for ${name}${place.category ? `, a ${place.category.toLowerCase()}` : ''}${address ? ` at ${address}` : ''}.`,
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
        Typing the business name and town works too. Lumen reads your name, address, hours, photographs and
        reviews off the listing and writes the site from those — nothing to fill in.
      </p>

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-3 text-[13px] text-[#e5735a]">
          {error}
        </p>
      ) : null}

      {place ? (
        <div className="lumen-panel space-y-5 rounded-card border border-accent/25 bg-raised p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">Is this you?</p>
              <p className="mt-1 font-display text-[22px] leading-tight text-ink-primary">
                {value('name') || place.name}
              </p>
              {/* Everything found, on one line — a summary to glance at rather
                  than four boxes to read through. */}
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                {[
                  place.category,
                  value('address') || null,
                  value('phone') || null,
                  place.hours.length > 0 ? `${place.hours.length} days of opening hours` : null,
                  place.services && place.services.length > 0
                    ? `${place.services.length} services`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Google shows no other details for this listing.'}
              </p>
              {place.services && place.services.length > 0 ? (
                // Shown, because this is the part that decides whether the site
                // is about this business or about a business like it.
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-secondary">
                  {place.services.slice(0, 6).join(' · ')}
                  {place.services.length > 6 ? ' …' : ''}
                </p>
              ) : null}
            </div>
            {place.rating ? (
              <Badge tone="accent" className="shrink-0">
                {place.rating.toFixed(1)}★ · {place.reviewCount ?? 0} reviews
              </Badge>
            ) : null}
          </div>

          {place.note ? (
            // Said out loud, because a thin listing that looks fine produces a
            // website about nothing and no clue as to why.
            <div className="rounded-[10px] border border-[#e5a15a]/30 bg-[#e5a15a]/10 px-3.5 py-3">
              <p className="text-[12.5px] leading-relaxed text-[#e5a15a]">
                Google gave up very little for this link. {place.note}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
                Build it anyway and the site will be about your business but short on detail — or press{' '}
                <strong className="text-ink-secondary">Something wrong? Fix it</strong> and type your address
                and phone number first. Adding your own photos afterwards makes the biggest difference.
              </p>
            </div>
          ) : null}

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
              {building ? 'Starting…' : 'Build my website'}
            </Button>
            <button
              type="button"
              onClick={() => setFixing((open) => !open)}
              className="text-[12.5px] text-ink-muted transition hover:text-ink-primary"
              aria-expanded={fixing}
            >
              {fixing ? 'Hide corrections' : 'Something wrong? Fix it'}
            </button>
            <button
              type="button"
              onClick={() => setPlace(null)}
              className="text-[12.5px] text-ink-muted transition hover:text-ink-primary"
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

          {/* Corrections, only when asked for. Reading a listing off the page
              finds the name and the photographs reliably and the phone number
              only sometimes — but a gap here is not a job for the owner, it is
              something they can add later in the editor. */}
          {fixing ? (
            <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-3">
              <Fix
                label="Business name"
                found={place.name}
                value={fixes.name}
                onChange={(next) => setFixes((current) => ({ ...current, name: next }))}
                placeholder="Sharma Dental Clinic"
              />
              <Fix
                label="Address"
                found={place.address}
                value={fixes.address}
                onChange={(next) => setFixes((current) => ({ ...current, address: next }))}
                placeholder="12 Hill Road, Bandra West, Mumbai"
              />
              <Fix
                label="Phone"
                found={place.phone}
                value={fixes.phone}
                onChange={(next) => setFixes((current) => ({ ...current, phone: next }))}
                placeholder="+91 98765 43210"
              />
            </div>
          ) : null}

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
        {!found && !value ? <span className="text-[10.5px] text-ink-muted">not found</span> : null}
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

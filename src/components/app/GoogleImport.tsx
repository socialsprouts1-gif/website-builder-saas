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
export function GoogleImport({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [place, setPlace] = useState<PlaceProfile | null>(null);
  const [looking, setLooking] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function find() {
    if (!url.trim()) return;
    setLooking(true);
    setError(null);
    setPlace(null);
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

  if (!configured) {
    return (
      <div className="rounded-card border border-hairline bg-raised px-5 py-6 text-[13px] leading-relaxed text-ink-secondary">
        <p className="text-ink-primary">Google lookup is not set up on this deployment yet.</p>
        <p className="mt-2 text-ink-muted">
          It needs a Google Places API key in <code className="text-ink-secondary">GOOGLE_PLACES_API_KEY</code>.
          Create one in the Google Cloud console, enable the <em>Places API (New)</em>, and restrict the key to
          that API.
        </p>
      </div>
    );
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
        Typing the business name and town works too.
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

          <dl className="grid gap-2 text-[12.5px] sm:grid-cols-2">
            <Fact label="Address" value={place.address} />
            <Fact label="Phone" value={place.phone} />
            <Fact label="Hours" value={place.hours[0] ? `${place.hours.length} days listed` : null} />
            <Fact label="Website" value={place.website} />
          </dl>

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
                    src={`/api/google/photo?name=${encodeURIComponent(photo.name)}&w=400`}
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

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">{label}</dt>
      <dd className="truncate text-ink-secondary">{value}</dd>
    </div>
  );
}

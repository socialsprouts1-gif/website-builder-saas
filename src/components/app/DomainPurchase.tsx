'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { cn } from '@/components/ui/cn';

interface DomainOffer {
  domain: string;
  available: boolean;
  price?: number;
  years?: number;
}

/**
 * Search for a domain and buy it on the user's own Vercel account.
 *
 * Buying spends real money, so nothing happens on one click: the price is
 * shown, then restated in a confirmation the user has to press separately, and
 * the server re-quotes before charging. Lumen never holds the card — the charge
 * lands on the Vercel account whose token they connected.
 */
export function DomainPurchase({
  projectId,
  onBought,
}: {
  projectId: string;
  onBought: (domain: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [offers, setOffers] = useState<DomainOffer[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState<DomainOffer | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(body: Record<string, unknown>) {
    const response = await fetch(`/api/projects/${projectId}/domain`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? 'That did not work');
    return payload;
  }

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setOffers(null);
    setConfirming(null);
    try {
      const payload = await post({ action: 'search', query });
      setOffers(payload.offers ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not search for that name');
    } finally {
      setSearching(false);
    }
  }

  async function buy(offer: DomainOffer) {
    setBuying(offer.domain);
    setError(null);
    try {
      await post({ action: 'buy', domain: offer.domain, expectedPrice: offer.price });
      onBought(offer.domain);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not buy that domain');
      setConfirming(null);
    } finally {
      setBuying(null);
    }
  }

  const taken = offers?.filter((offer) => !offer.available) ?? [];
  const free = offers?.filter((offer) => offer.available) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="" className="min-w-[220px] flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') search();
            }}
            placeholder="ironworks"
            aria-label="Domain name to search for"
          />
        </Field>
        <Button onClick={search} disabled={searching || !query.trim()}>
          {searching ? 'Searching…' : 'Search'}
        </Button>
      </div>
      <p className="text-[12px] text-ink-muted">
        Type the name only — Lumen checks every common ending for you.
      </p>

      {offers && free.length === 0 && taken.length > 0 ? (
        <p className="rounded-[10px] border border-hairline bg-raised px-4 py-3 text-[13px] text-ink-secondary">
          Every ending for that name is taken. Try adding your city or trade — “ironworks-pune”,
          “ironworksgym”.
        </p>
      ) : null}

      {free.length > 0 ? (
        <ul className="space-y-2">
          {free.map((offer) => (
            <li
              key={offer.domain}
              className={cn(
                'rounded-[10px] border p-3 transition',
                confirming?.domain === offer.domain
                  ? 'border-accent/40 bg-accent-soft'
                  : 'border-hairline bg-raised',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[13.5px] text-ink-primary">{offer.domain}</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-muted">
                    {offer.price === undefined
                      ? 'Available — Vercel would not quote a price'
                      : `$${offer.price.toFixed(2)} for ${offer.years ?? 1} year${(offer.years ?? 1) > 1 ? 's' : ''}, renews yearly`}
                  </p>
                </div>
                {offer.price === undefined ? null : confirming?.domain === offer.domain ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setConfirming(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => buy(offer)} disabled={buying !== null}>
                      {buying === offer.domain ? 'Buying…' : `Charge $${offer.price.toFixed(2)}`}
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setConfirming(offer)}>
                    Buy
                  </Button>
                )}
              </div>

              {confirming?.domain === offer.domain ? (
                <p className="mt-3 border-t border-accent/20 pt-3 text-[12px] leading-relaxed text-ink-secondary">
                  This charges <strong className="text-ink-primary">${offer.price?.toFixed(2)}</strong> to
                  the Vercel account you connected, registers{' '}
                  <strong className="text-ink-primary">{offer.domain}</strong> in your name and points it at
                  this site. Domain registrations cannot be refunded.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {taken.length > 0 && free.length > 0 ? (
        <p className="text-[11.5px] text-ink-muted">
          Taken: {taken.map((offer) => offer.domain).join(', ')}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-3 text-[13px] text-[#e5735a]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

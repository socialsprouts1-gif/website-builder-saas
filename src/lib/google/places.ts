import 'server-only';
import { env } from '@/lib/env';
import { coordinatesFrom, isShortLink, parseGoogleUrl } from './urls';

/**
 * Reading a business's own Google listing, through the Places API.
 *
 * Not by scraping maps.google.com: that breaks Google's terms, and the page is
 * a JavaScript application behind bot detection, so it would also simply stop
 * working. The Places API returns the same facts under a licence.
 */

const PLACES = 'https://places.googleapis.com/v1';

const DETAIL_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'shortFormattedAddress',
  'internationalPhoneNumber',
  'nationalPhoneNumber',
  'websiteUri',
  'googleMapsUri',
  'rating',
  'userRatingCount',
  'primaryTypeDisplayName',
  'editorialSummary',
  'regularOpeningHours',
  'reviews',
  'photos',
  'location',
].join(',');

export interface PlaceReview {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
}

export interface PlacePhoto {
  /** The Places photo resource name; media is fetched through our own route. */
  name: string;
  width: number;
  height: number;
  attributions: string[];
}

export interface PlaceProfile {
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

export class PlacesNotConfiguredError extends Error {
  constructor() {
    super('Google lookup is not set up on this deployment — add GOOGLE_PLACES_API_KEY.');
    this.name = 'PlacesNotConfiguredError';
  }
}

export const isPlacesConfigured = (): boolean => Boolean(env.googlePlacesKey);

/** Short links only reveal the real one by being followed. */
async function expandShortLink(url: string): Promise<string> {
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    return response.url || url;
  } catch {
    return url;
  }
}

async function placesFetch<T>(path: string, init?: RequestInit & { fields?: string }): Promise<T> {
  const key = env.googlePlacesKey;
  if (!key) throw new PlacesNotConfiguredError();

  const response = await fetch(`${PLACES}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'X-Goog-Api-Key': key,
      ...(init?.fields ? { 'X-Goog-FieldMask': init.fields } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string; status?: string };
  };

  if (!response.ok) {
    const message = payload.error?.message ?? `Google returned ${response.status}`;
    // The two failures worth naming: a key that is not allowed to do this, and
    // one that has not had the Places API turned on.
    if (response.status === 403) {
      throw new Error(`Google rejected the request: ${message}. Check the key's API restrictions.`);
    }
    throw new Error(message);
  }

  return payload;
}

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: { text?: string };
  editorialSummary?: { text?: string };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  reviews?: {
    authorAttribution?: { displayName?: string };
    rating?: number;
    text?: { text?: string };
    originalText?: { text?: string };
    relativePublishTimeDescription?: string;
  }[];
  photos?: { name?: string; widthPx?: number; heightPx?: number; authorAttributions?: { displayName?: string }[] }[];
}

function toProfile(raw: RawPlace): PlaceProfile | null {
  if (!raw.id || !raw.displayName?.text) return null;

  return {
    placeId: raw.id,
    name: raw.displayName.text,
    category: raw.primaryTypeDisplayName?.text ?? null,
    summary: raw.editorialSummary?.text ?? null,
    address: raw.formattedAddress ?? raw.shortFormattedAddress ?? null,
    phone: raw.nationalPhoneNumber ?? raw.internationalPhoneNumber ?? null,
    website: raw.websiteUri ?? null,
    mapsUrl: raw.googleMapsUri ?? null,
    rating: typeof raw.rating === 'number' ? raw.rating : null,
    reviewCount: typeof raw.userRatingCount === 'number' ? raw.userRatingCount : null,
    hours: raw.regularOpeningHours?.weekdayDescriptions ?? [],
    reviews: (raw.reviews ?? [])
      .map((review) => ({
        author: review.authorAttribution?.displayName ?? 'A Google reviewer',
        rating: review.rating ?? 0,
        text: (review.text?.text ?? review.originalText?.text ?? '').trim(),
        relativeTime: review.relativePublishTimeDescription ?? '',
      }))
      .filter((review) => review.text.length > 0),
    photos: (raw.photos ?? [])
      .filter((photo): photo is { name: string; widthPx?: number; heightPx?: number; authorAttributions?: { displayName?: string }[] } =>
        typeof photo.name === 'string',
      )
      .slice(0, 8)
      .map((photo) => ({
        name: photo.name,
        width: photo.widthPx ?? 0,
        height: photo.heightPx ?? 0,
        attributions: (photo.authorAttributions ?? [])
          .map((author) => author.displayName ?? '')
          .filter(Boolean),
      })),
  };
}

/** Resolves whatever was pasted into one business's listing. */
export async function lookupPlace(input: string): Promise<PlaceProfile | null> {
  let target = input.trim();
  if (isShortLink(target)) target = await expandShortLink(target);

  const parsed = parseGoogleUrl(target);
  if (!parsed) return null;

  if (parsed.kind === 'place_id') {
    const raw = await placesFetch<RawPlace>(`/places/${encodeURIComponent(parsed.value)}`, {
      method: 'GET',
      fields: DETAIL_FIELDS,
    });
    return toProfile(raw);
  }

  // A cid has no direct lookup, so it falls back to searching whatever else the
  // link carried — which for a cid link is usually nothing, hence the message.
  const query = parsed.kind === 'query' ? parsed.value : '';
  if (!query) return null;

  const near = coordinatesFrom(target);
  const search = await placesFetch<{ places?: RawPlace[] }>('/places:searchText', {
    method: 'POST',
    fields: DETAIL_FIELDS.split(',')
      .map((field) => `places.${field}`)
      .join(','),
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 1,
      // Coordinates from the link keep a chain's other branches out of the way.
      ...(near
        ? { locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 2000 } } }
        : {}),
    }),
  });

  const first = search.places?.[0];
  return first ? toProfile(first) : null;
}

/** Where a photo's bytes come from. The key never leaves the server. */
export function photoMediaUrl(photoName: string, maxWidthPx = 1600): string | null {
  const key = env.googlePlacesKey;
  if (!key) return null;
  return `${PLACES}/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${encodeURIComponent(key)}`;
}

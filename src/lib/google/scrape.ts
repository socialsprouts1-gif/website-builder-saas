import 'server-only';
import type { PlacePhoto, PlaceProfile, PlaceReview } from './places';

/**
 * Reading a Google listing from the page itself, with no API key.
 *
 * The Places API needs a key, a billing account and a project, which is three
 * things to set up before anyone can try the feature once. This path needs
 * none of them: it fetches the link the owner pasted and reads what is on the
 * page — the same facts any visitor can see.
 *
 * Four independent extractors run over the same HTML and their results are
 * merged, best first. They are independent on purpose: Google's markup changes
 * without notice, and when one stops matching the others still produce a usable
 * listing rather than nothing. Whatever is missing is asked for in the UI
 * instead of being invented.
 *
 * When a Places key IS configured the API path runs first and this is the
 * fallback, because the API is stable and this is not.
 */

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 4_000_000;
const MAX_PHOTOS = 8;

export class ListingUnreadableError extends Error {
  constructor(
    message: string,
    readonly reason: 'blocked' | 'consent' | 'not_found' | 'network',
  ) {
    super(message);
    this.name = 'ListingUnreadableError';
  }
}

// ------------------------------------------------------------------ fetch --

/** Follows share links and asks for the English page, which parses predictably. */
export function normaliseMapsUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  // Only Google's own hosts. A pasted link is user input, and this code makes
  // a server-side request with it — it must not become a way to have Lumen
  // fetch arbitrary internal addresses on someone's behalf.
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const allowed =
    host === 'google.com' ||
    host === 'maps.google.com' ||
    host === 'maps.app.goo.gl' ||
    host === 'goo.gl' ||
    host === 'g.co' ||
    host === 'share.google' ||
    /^google\.[a-z.]{2,6}$/.test(host) ||
    /^maps\.google\.[a-z.]{2,6}$/.test(host);
  if (!allowed) return null;

  url.searchParams.set('hl', 'en');
  return url.toString();
}

async function getHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        'accept-language': 'en-GB,en;q=0.9',
        accept: 'text/html,application/xhtml+xml',
      },
    });

    if (response.status === 404) {
      throw new ListingUnreadableError('That listing does not exist any more.', 'not_found');
    }
    if (!response.ok) {
      throw new ListingUnreadableError(
        `Google answered ${response.status} when Lumen asked for that page.`,
        'blocked',
      );
    }

    const finalUrl = response.url || url;
    if (/consent\.google\./i.test(finalUrl)) {
      throw new ListingUnreadableError(
        'Google asked for a cookie consent instead of the listing.',
        'consent',
      );
    }

    const text = await response.text();
    return { html: text.slice(0, MAX_HTML_BYTES), finalUrl };
  } catch (cause) {
    if (cause instanceof ListingUnreadableError) throw cause;
    throw new ListingUnreadableError(
      cause instanceof Error && cause.name === 'AbortError'
        ? 'Google took too long to answer.'
        : 'Lumen could not reach that page.',
      'network',
    );
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------- extractors --

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_full, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_full, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/** Escaped JSON inside a script tag, as Google embeds it. */
function unescapeJsString(value: string): string {
  return value
    .replace(/\\u003d/gi, '=')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003c/gi, '<')
    .replace(/\\u003e/gi, '>')
    .replace(/\\u([0-9a-f]{4})/gi, (_full, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"');
}

export function metaTag(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${key}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return decodeEntities(match[1]).trim() || null;
  }
  return null;
}

/**
 * Names that are Google's, not the business's.
 *
 * A share link does not always land on a listing — it can land on a search
 * results page, whose title is simply "Google Search". Taken at face value that
 * produced a site for a business called Google Search, which is worse than
 * admitting the listing could not be read.
 */
const NOT_A_BUSINESS =
  /^(google|google maps|google search|google images|google my business|maps|search|untitled|error|sign in|before you continue)$/i;

/** "Business Name - Google Maps" is the page title, not the business name. */
export function cleanName(raw: string | null): string | null {
  if (!raw) return null;
  const name = raw
    .replace(/\s*[-–—|]\s*Google\s*(Maps|Search|Images)?\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name || name.length > 120) return null;
  return NOT_A_BUSINESS.test(name) ? null : name;
}

/** A query or a path segment, as a business name rather than a URL fragment. */
function tidyLinkName(raw: string): string | null {
  let value = raw;
  try {
    value = decodeURIComponent(raw.replace(/\+/g, ' '));
  } catch {
    value = raw.replace(/\+/g, ' ');
  }

  value = value.replace(/\s+/g, ' ').trim();
  if (!value || value.length > 80) return null;
  // Coordinates, ids and raw links are not names.
  if (/^[-\d.,\s]+$/.test(value)) return null;
  if (/^(place_id|cid|ftid|data)\s*[:=]/i.test(value)) return null;
  if (/https?:\/\//i.test(value)) return null;
  if (!/[a-z]/i.test(value)) return null;

  // A typed search is usually all lower case; a name is not.
  if (value === value.toLowerCase()) {
    value = value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  }
  return NOT_A_BUSINESS.test(value) ? null : value;
}

/**
 * The business name carried by the link itself.
 *
 * Maps place links spell it in the path (/maps/place/Sharma+Dental+Clinic/…)
 * and a share link that resolves to a search keeps it in ?q=. Both survive the
 * markup changing underneath, which is exactly when the other extractors stop
 * finding anything.
 */
export function nameFromUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const place = /\/maps\/place\/([^/@?#]+)/.exec(parsed.pathname);
  if (place) {
    const fromPath = tidyLinkName(place[1]);
    if (fromPath) return fromPath;
  }

  for (const key of ['q', 'query', 'text']) {
    const value = parsed.searchParams.get(key);
    if (!value) continue;
    const fromQuery = tidyLinkName(value);
    if (fromQuery) return fromQuery;
  }

  return null;
}

/**
 * og:description on a Maps listing reads like
 * "★★★★★ · Hotel · 23 Old Airport Road, Bengaluru" — rating, category, address,
 * in that order, separated by middots. Not every listing has all three.
 */
export function splitDescription(description: string | null): {
  rating: number | null;
  category: string | null;
  address: string | null;
} {
  // Google's own boilerplate, served when the link lands on a search page
  // rather than a listing. It is not this business's address.
  if (!description || /search the world's information|google llc/i.test(description)) {
    return { rating: null, category: null, address: null };
  }

  const parts = description
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);

  let rating: number | null = null;
  let category: string | null = null;
  let address: string | null = null;

  for (const part of parts) {
    const stars = /^[★☆]+$/.test(part);
    const numeric = /^(\d(?:\.\d)?)\s*(?:★|stars?)?$/i.exec(part);

    if (stars) {
      rating = part.split('').filter((character) => character === '★').length;
      continue;
    }
    if (numeric && rating === null) {
      rating = Number(numeric[1]);
      continue;
    }
    // An address has a number or a comma in it; a category is a short phrase.
    if (!category && part.length < 40 && !/\d/.test(part) && !part.includes(',')) {
      category = part;
      continue;
    }
    if (!address && (part.includes(',') || /\d/.test(part))) address = part;
  }

  return { rating, category, address };
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Opening hours, wherever they sit in the embedded data. */
export function extractHours(html: string): string[] {
  const found = new Map<string, string>();

  // The common shape is ["Monday",["9 am–9 pm"]] inside the initialisation blob.
  const pattern = new RegExp(`\\\\?"(${DAYS.join('|')})\\\\?"\\s*,\\s*\\[\\s*\\\\?"([^"\\\\\\]]{2,40})`, 'gi');
  for (const match of html.matchAll(pattern)) {
    const day = match[1];
    const hours = match[2].trim();
    const key = day.toLowerCase();
    if (!found.has(key) && hours) found.set(key, `${day}: ${hours}`);
  }

  return DAYS.map((day) => found.get(day.toLowerCase())).filter((line): line is string =>
    Boolean(line),
  );
}

/** A phone number the listing actually publishes, not one lifted out of noise. */
export function extractPhone(html: string): string | null {
  const candidates: string[] = [];

  for (const match of html.matchAll(/tel:(\+?[\d\s().-]{7,20})/g)) candidates.push(match[1]);
  for (const match of html.matchAll(/\\?"(\+\d[\d\s().-]{7,18}\d)\\?"/g)) candidates.push(match[1]);

  for (const candidate of candidates) {
    const cleaned = decodeEntities(candidate).replace(/\s+/g, ' ').trim();
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15) return cleaned;
  }
  return null;
}

/** The business's own website, if the listing links one. */
export function extractWebsite(html: string): string | null {
  const pattern = /https?:\/\/[^\s"'\\<>]{4,200}/g;
  const skip =
    /(google|gstatic|googleapis|googleusercontent|ggpht|schema\.org|w3\.org|youtube\.com|youtu\.be|facebook\.com|instagram\.com|goo\.gl)/i;

  for (const match of html.matchAll(pattern)) {
    const candidate = unescapeJsString(match[0]).replace(/[),.]+$/, '');
    if (skip.test(candidate)) continue;
    try {
      const url = new URL(candidate);
      if (url.hostname.includes('.') && !url.hostname.endsWith('.local')) return url.toString();
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Photos, as direct image URLs.
 *
 * Google's own CDN serves these without a key, and the size suffix is
 * normalised so a thumbnail does not end up as a hero image. They are copied
 * into the project's storage before the site is built — a generated site has to
 * keep working when it is exported somewhere else.
 */
export function extractPhotos(html: string): PlacePhoto[] {
  const seen = new Set<string>();
  const photos: PlacePhoto[] = [];

  for (const match of html.matchAll(/https:\/\/lh\d\.googleusercontent\.com\/[\w\-/]+/g)) {
    const base = unescapeJsString(match[0]);
    // Ignore avatars and icons: reviewer photos live under /a/ and /a-/.
    if (/\/a[-/]/.test(base)) continue;
    if (seen.has(base)) continue;
    seen.add(base);

    photos.push({ name: base, width: 1600, height: 1200, attributions: [], url: `${base}=w1600-h1200-k-no` });
    if (photos.length >= MAX_PHOTOS) break;
  }

  return photos;
}

/** Review snippets, when the page carries them. */
export function extractReviews(html: string): PlaceReview[] {
  const reviews: PlaceReview[] = [];
  const pattern = /\\?"([^"\\]{40,400})\\?"\s*,\s*\[\s*\\?"([1-5])\\?"/g;

  for (const match of html.matchAll(pattern)) {
    const text = decodeEntities(unescapeJsString(match[1])).trim();
    if (!/[a-z]/i.test(text) || text.includes('http')) continue;
    reviews.push({ author: 'A Google reviewer', rating: Number(match[2]), text, relativeTime: '' });
    if (reviews.length >= 4) break;
  }
  return reviews;
}

export function extractReviewCount(html: string): number | null {
  const match = /([\d,]{1,12})\s*(?:Google\s*)?reviews?/i.exec(html);
  if (!match) return null;
  const count = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(count) && count > 0 ? count : null;
}

/** Structured data, when a page bothers to publish it. */
export function extractJsonLd(html: string): Partial<PlaceProfile> {
  const out: Partial<PlaceProfile> = {};

  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    let data: unknown;
    try {
      data = JSON.parse(match[1].trim());
    } catch {
      continue;
    }

    const nodes = Array.isArray(data) ? data : [data];
    for (const raw of nodes) {
      const node = raw as Record<string, unknown>;
      if (typeof node.name === 'string' && !out.name) out.name = node.name;
      if (typeof node.telephone === 'string' && !out.phone) out.phone = node.telephone;
      if (typeof node.url === 'string' && !out.website) out.website = node.url;

      const address = node.address as Record<string, unknown> | string | undefined;
      if (!out.address && typeof address === 'string') out.address = address;
      if (!out.address && address && typeof address === 'object') {
        const parts = ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode']
          .map((key) => address[key])
          .filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
        if (parts.length > 0) out.address = parts.join(', ');
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------- the job --

/** Everything the page gives up, merged into the shape the generator expects. */
export function parseListing(html: string, sourceUrl: string): PlaceProfile | null {
  const jsonLd = extractJsonLd(html);
  const description = metaTag(html, 'og:description') ?? metaTag(html, 'description');
  const fromDescription = splitDescription(description);

  const name =
    cleanName(jsonLd.name ?? null) ??
    cleanName(metaTag(html, 'og:title')) ??
    cleanName(/<title>([^<]{1,200})<\/title>/i.exec(html)?.[1] ?? null) ??
    nameFromUrl(sourceUrl);

  if (!name) return null;

  const photos = extractPhotos(html);
  const ogImage = metaTag(html, 'og:image');
  if (ogImage && !photos.some((photo) => photo.url === ogImage)) {
    photos.unshift({ name: ogImage, width: 1200, height: 900, attributions: [], url: ogImage });
  }

  return {
    placeId: '',
    name,
    category: fromDescription.category,
    summary: null,
    address: jsonLd.address ?? fromDescription.address ?? null,
    phone: jsonLd.phone ?? extractPhone(html),
    website: jsonLd.website ?? extractWebsite(html),
    mapsUrl: sourceUrl,
    rating: fromDescription.rating,
    reviewCount: extractReviewCount(html),
    hours: extractHours(html),
    reviews: extractReviews(html),
    photos: photos.slice(0, MAX_PHOTOS),
  };
}

/** Fetches a pasted Google link and reads the listing off the page. */
export async function scrapeListing(input: string): Promise<PlaceProfile | null> {
  const url = normaliseMapsUrl(input);
  if (!url) return null;

  const { html, finalUrl } = await getHtml(url);
  return parseListing(html, finalUrl);
}

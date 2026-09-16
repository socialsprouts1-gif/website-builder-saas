import 'server-only';
import { openaiFor, resolveApiKey } from '@/lib/openai/client';
import { getModelCatalog } from '@/lib/openai/models';
import { recordUsage } from '@/lib/usage';
import { noteError } from '@/lib/errors';
import type { PlaceProfile } from './places';

/**
 * Reading a Google listing with the model instead of with regular expressions.
 *
 * The regexes find a name and some photographs and very little else, because
 * Google's page is an application: the facts live inside an escaped JSON blob
 * whose shape changes without notice, and a pattern written against today's
 * shape quietly returns nothing tomorrow. That is how a real shop in Akola
 * became a website with a generic headline and invented services — the build
 * was working from a brief that contained a name and nothing else.
 *
 * So the page is reduced to the parts that could plausibly hold the listing and
 * the model is asked to pick the facts out. It does not need to know Google's
 * markup, which is exactly the property the regexes lacked.
 */

const MAX_DIGEST_CHARS = 28_000;
const MAX_STRING_LITERALS = 900;

function decodeEscapes(value: string): string {
  return value
    .replace(/\\u([0-9a-f]{4})/gi, (_full, code: string) => {
      const point = parseInt(code, 16);
      // Surrogates on their own turn into replacement characters and add noise.
      return point >= 0xd800 && point <= 0xdfff ? ' ' : String.fromCodePoint(point);
    })
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"');
}

/**
 * The page, cut down to what could possibly be the listing.
 *
 * Four passes, because the facts sit in four different places depending on
 * which version of the page Google served: the meta tags, the attributes Maps
 * puts on its own buttons (`data-item-id="address"` and friends), the visible
 * text, and the string literals inside the initialisation blob.
 */
export function digestForModel(html: string): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  const push = (label: string, value: string) => {
    const text = decodeEscapes(value).replace(/\s+/g, ' ').trim();
    if (text.length < 2 || text.length > 400) return;
    const key = `${label}:${text.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(`${label}: ${text}`);
  };

  const title = /<title[^>]*>([\s\S]{1,300}?)<\/title>/i.exec(html);
  if (title) push('TITLE', title[1]);

  for (const match of html.matchAll(
    /<meta[^>]+(?:property|name|itemprop)=["']([^"']+)["'][^>]*content=["']([^"']*)["']/gi,
  )) {
    if (/title|description|image|site_name|street|locality|region|postal|phone|latitude|longitude/i.test(match[1])) {
      push(`META ${match[1]}`, match[2]);
    }
  }

  // Maps labels its own controls, and those labels are the facts spelled out.
  for (const match of html.matchAll(/data-item-id=["']([^"']+)["']/gi)) push('ITEM', match[1]);
  for (const match of html.matchAll(/aria-label=["']([^"']{4,200})["']/gi)) push('LABEL', match[1]);
  for (const match of html.matchAll(/href=["']tel:([^"']+)["']/gi)) push('TEL', match[1]);

  // Visible text, with the machinery taken out.
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (visible.length > 40) parts.push(`TEXT: ${visible.slice(0, 6000)}`);

  // Whatever is in the initialisation blob, as plain strings. Mostly noise; the
  // address, the hours and the review text are in there too.
  let literals = 0;
  for (const match of html.matchAll(/\\?"([^"\\\n]{4,200})\\?"/g)) {
    if (literals >= MAX_STRING_LITERALS) break;
    const value = match[1];
    // Identifiers, URLs and base64-looking runs are never the answer.
    if (/^[\w./:-]+$/.test(value) && !/\s/.test(value)) continue;
    if (/^https?:/i.test(value)) continue;
    if (!/[a-z]/i.test(value)) continue;
    push('DATA', value);
    literals += 1;
  }

  return parts.join('\n').slice(0, MAX_DIGEST_CHARS);
}

const SYSTEM = `You read a Google Maps or Google Business listing page and return what it says about ONE business.

Return JSON only, shaped:
{"name":string|null,"category":string|null,"description":string|null,"address":string|null,
 "phone":string|null,"website":string|null,"rating":number|null,"reviewCount":number|null,
 "hours":string[],"services":string[],
 "reviews":[{"author":string,"rating":number,"text":string}]}

Rules:
- Only what the page actually says. If a fact is not there, use null or an empty array. Never guess, never fill in a plausible address or a typical phone number.
- "name" is the business, never "Google", "Google Maps" or "Google Search".
- "hours" as one string per day, e.g. "Monday: 9 am-9 pm".
- "services" are the things this business actually offers, as named on the page — categories, menu items, treatments, products. Empty array if the page does not name any.
- "reviews" verbatim, never edited or improved. Empty array if none are on the page.
- "website" is the business's own site, never a google.com address.`;

interface ModelListing {
  name?: string | null;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  hours?: unknown;
  services?: unknown;
  reviews?: unknown;
}

const text = (value: unknown, cap = 300): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed.toLowerCase() !== 'null' ? trimmed.slice(0, cap) : null;
};

const list = (value: unknown, cap: number): string[] =>
  Array.isArray(value)
    ? value.map((item) => text(item, 200)).filter((item): item is string => Boolean(item)).slice(0, cap)
    : [];

/** Asks the model to read the page. Returns null rather than throwing. */
export async function readListingWithModel(
  html: string,
  userId: string,
): Promise<Partial<PlaceProfile> | null> {
  try {
    const { apiKey, source } = await resolveApiKey(userId, 'listing');
    const catalog = await getModelCatalog(apiKey);
    const model = catalog.fast?.id ?? catalog.quality?.id;
    if (!model) return null;

    const response = await openaiFor(apiKey).chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: digestForModel(html) },
      ],
    });

    await recordUsage({
      userId,
      eventType: 'listing',
      model,
      keySource: source,
      tokensIn: response.usage?.prompt_tokens,
      tokensOut: response.usage?.completion_tokens,
    });

    const raw = JSON.parse(response.choices[0]?.message?.content ?? '{}') as ModelListing;
    return shape(raw);
  } catch (cause) {
    // The regex path already produced something; this was the improvement on
    // top of it, and an improvement that fails must not take the rest with it.
    noteError({ scope: 'google.readListing', error: cause, userId });
    return null;
  }
}

/** The model's answer, clamped into the shape the rest of the code expects. */
export function shape(raw: ModelListing): Partial<PlaceProfile> {
  const reviews = Array.isArray(raw.reviews)
    ? raw.reviews
        .map((item) => {
          const entry = item as Record<string, unknown>;
          const body = text(entry.text, 600);
          if (!body) return null;
          const rating = Number(entry.rating);
          return {
            author: text(entry.author, 80) ?? 'A Google reviewer',
            rating: Number.isFinite(rating) ? Math.min(5, Math.max(1, Math.round(rating))) : 5,
            text: body,
            relativeTime: '',
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .slice(0, 5)
    : [];

  const website = text(raw.website, 300);
  const rating = Number(raw.rating);
  const reviewCount = Number(raw.reviewCount);

  return {
    name: text(raw.name, 120) ?? undefined,
    category: text(raw.category, 80),
    summary: text(raw.description, 600),
    address: text(raw.address, 300),
    phone: text(raw.phone, 40),
    // A google.com address is the page we were reading, not their website.
    website: website && !/(^|\.)google\.[a-z.]+\//i.test(website) ? website : null,
    rating: Number.isFinite(rating) && rating > 0 ? rating : null,
    reviewCount: Number.isFinite(reviewCount) && reviewCount > 0 ? Math.round(reviewCount) : null,
    hours: list(raw.hours, 7),
    services: list(raw.services, 12),
    reviews,
  };
}

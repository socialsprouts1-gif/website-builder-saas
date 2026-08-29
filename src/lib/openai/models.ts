import 'server-only';
import OpenAI from 'openai';

/**
 * Model catalog (spec Section 6).
 *
 * Nothing here hardcodes a permanent dropdown. At request time we fetch
 * GET /v1/models with whichever key is active, cache it briefly, and bucket the
 * live IDs into three things a small-business owner can actually reason about.
 * The seeds below are only a fallback for when that call fails — they were the
 * lineup when this was written and are expected to age.
 */

export type ModelBucket = 'quality' | 'fast' | 'custom';

export interface ModelOption {
  id: string;
  label: string;
  bucket: ModelBucket;
  description?: string;
}

export interface ModelCatalog {
  quality: ModelOption | null;
  fast: ModelOption | null;
  all: ModelOption[];
  vision: string;
  image: string;
  transcription: string;
  embedding: string;
  stale: boolean;
  fetchedAt: string;
}

/** Fallback lineup. Illustrative only — the live fetch above always wins. */
export const SEED_MODELS = {
  quality: 'gpt-5.6-sol',
  mid: 'gpt-5.6',
  fast: 'gpt-5.6-mini',
  code: 'gpt-5.3-codex',
  vision: 'gpt-5.6',
  image: 'gpt-image-2',
  transcription: 'gpt-live-transcribe',
  transcriptionFallback: 'gpt-4o-transcribe',
  embedding: 'text-embedding-3-small',
} as const;

/**
 * Admin-configurable override, for when OpenAI's naming shifts in a way the
 * heuristics below misread. Set LUMEN_MODEL_OVERRIDES to JSON like
 * {"quality":"gpt-6","fast":"gpt-6-mini"}.
 */
function overrides(): Partial<Record<'quality' | 'fast' | 'vision' | 'image' | 'transcription' | 'embedding', string>> {
  try {
    return JSON.parse(process.env.LUMEN_MODEL_OVERRIDES ?? '{}');
  } catch {
    return {};
  }
}

const SMALL_HINTS = ['-mini', '-nano', '-small', '-lite', '-flash', '-turbo'];
const NON_CHAT_HINTS = [
  'embedding', 'whisper', 'tts', 'dall-e', 'image', 'transcribe', 'realtime',
  'moderation', 'audio', 'search', 'computer-use', 'sora', 'live-transcribe',
];

function isChatModel(id: string): boolean {
  return !NON_CHAT_HINTS.some((hint) => id.includes(hint));
}

function isSmall(id: string): boolean {
  return SMALL_HINTS.some((hint) => id.includes(hint));
}

/**
 * Ranks by generation number then by suffix weight, so a newer family wins
 * without the ranking needing to know that family's name in advance.
 */
function scoreModel(id: string): number {
  const version = /(\d+)(?:\.(\d+))?/.exec(id.replace(/^[a-z-]*/, ''));
  const major = version ? Number(version[1]) : 0;
  const minor = version?.[2] ? Number(version[2]) : 0;
  let score = major * 100 + minor;
  if (id.startsWith('gpt-')) score += 500;
  if (id.includes('codex')) score += 20;
  if (isSmall(id)) score -= 400;
  return score;
}

function humanize(id: string): string {
  return id
    .replace(/[-_]/g, ' ')
    .replace(/\bgpt\b/i, 'GPT')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function pickFirstMatch(ids: string[], predicate: (id: string) => boolean, fallback: string): string {
  const matches = ids.filter(predicate).sort((a, b) => scoreModel(b) - scoreModel(a));
  return matches[0] ?? fallback;
}

type CacheEntry = { catalog: ModelCatalog; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function cacheKey(apiKey: string): string {
  return apiKey.slice(-8);
}

export function fallbackCatalog(stale = true): ModelCatalog {
  const custom = overrides();
  const seed = (id: string, bucket: ModelBucket, description: string): ModelOption => ({
    id,
    label: humanize(id),
    bucket,
    description,
  });

  const quality = custom.quality ?? SEED_MODELS.quality;
  const fast = custom.fast ?? SEED_MODELS.fast;

  return {
    quality: seed(quality, 'quality', 'Best quality — deepest reasoning, richest sites.'),
    fast: seed(fast, 'fast', 'Fast & cheap — great for quick iterations.'),
    all: [
      seed(quality, 'quality', ''),
      seed(SEED_MODELS.mid, 'custom', ''),
      seed(fast, 'fast', ''),
      seed(SEED_MODELS.code, 'custom', ''),
    ],
    vision: custom.vision ?? SEED_MODELS.vision,
    image: custom.image ?? SEED_MODELS.image,
    transcription: custom.transcription ?? SEED_MODELS.transcription,
    embedding: custom.embedding ?? SEED_MODELS.embedding,
    stale,
    fetchedAt: new Date().toISOString(),
  };
}

/** Live model list, bucketed. Falls back to the seeds rather than throwing. */
export async function getModelCatalog(apiKey: string): Promise<ModelCatalog> {
  const key = cacheKey(apiKey);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.catalog;

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.models.list();
    const ids = response.data.map((model) => model.id).sort();
    if (ids.length === 0) throw new Error('empty model list');

    const custom = overrides();
    const chat = ids.filter(isChatModel);

    const qualityId =
      custom.quality ?? pickFirstMatch(chat, (id) => !isSmall(id), SEED_MODELS.quality);
    const fastId = custom.fast ?? pickFirstMatch(chat, isSmall, SEED_MODELS.fast);

    const catalog: ModelCatalog = {
      quality: {
        id: qualityId,
        label: humanize(qualityId),
        bucket: 'quality',
        description: 'Best quality — deepest reasoning, richest sites.',
      },
      fast: {
        id: fastId,
        label: humanize(fastId),
        bucket: 'fast',
        description: 'Fast & cheap — great for quick iterations.',
      },
      all: ids.map((id) => ({
        id,
        label: humanize(id),
        bucket: id === qualityId ? 'quality' : id === fastId ? 'fast' : 'custom',
      })),
      vision: custom.vision ?? pickFirstMatch(chat, (id) => !isSmall(id), SEED_MODELS.vision),
      image:
        custom.image ??
        pickFirstMatch(ids, (id) => id.includes('image') && !id.includes('dall-e'), SEED_MODELS.image),
      transcription:
        custom.transcription ??
        pickFirstMatch(ids, (id) => id.includes('transcribe'), SEED_MODELS.transcriptionFallback),
      embedding:
        custom.embedding ?? pickFirstMatch(ids, (id) => id.includes('embedding'), SEED_MODELS.embedding),
      stale: false,
      fetchedAt: new Date().toISOString(),
    };

    cache.set(key, { catalog, expiresAt: Date.now() + CACHE_TTL_MS });
    return catalog;
  } catch {
    const catalog = fallbackCatalog(true);
    // Short-cache the fallback so a transient outage doesn't hammer the API.
    cache.set(key, { catalog, expiresAt: Date.now() + 60_000 });
    return catalog;
  }
}

/**
 * Resolves a requested model against the live catalog, failing over to the next
 * best option instead of letting a retired ID crash a generation.
 */
export function resolveModel(catalog: ModelCatalog, requested?: string | null): { model: string; substituted: boolean } {
  if (requested && catalog.all.some((option) => option.id === requested)) {
    return { model: requested, substituted: false };
  }
  const fallback = catalog.quality?.id ?? catalog.fast?.id ?? SEED_MODELS.quality;
  return { model: fallback, substituted: Boolean(requested) };
}

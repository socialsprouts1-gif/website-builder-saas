import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { openaiFor, resolveApiKey } from '@/lib/openai/client';
import { getModelCatalog } from '@/lib/openai/models';
import { recordUsage } from '@/lib/usage';
import { uploadAsset } from '@/lib/generation/storage';
import { noteError } from '@/lib/errors';

/**
 * Photographing a shop's catalogue.
 *
 * A shop whose every product is a grey placeholder does not look unfinished,
 * it looks broken — and "generate the product images" is the thing people ask
 * for by name when they ask for a shop. The pictures are made from each
 * product's own title and description, so what arrives is a photograph of that
 * product rather than four generic shots of a business.
 *
 * Deliberately the last step of a build. It is the slowest and the most
 * expensive part, and the site is already saved and viewable before it starts,
 * so nobody waits on it to see what they asked for.
 */

/** How many to photograph at once. Wide enough to be quick, narrow enough not
 *  to queue behind the account's own rate limit, where every request comes
 *  back slower and a refusal costs a retry. */
const CONCURRENCY = 4;

/** And how many in total, so one build cannot spend an afternoon's budget. */
export const MAX_PHOTOGRAPHS = 24;

export interface Photographable {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  category: string | null;
}

/**
 * What to ask for, for one product.
 *
 * A product photograph, not a lifestyle scene: one object, plain sweep, even
 * light, nothing else in frame. That is what a shop grid needs — a mood shot
 * at 300 pixels square is a brown blur.
 */
export function productPrompt(product: Photographable, business: string): string {
  const what = [product.title, product.summary ?? product.description ?? '']
    .filter(Boolean)
    .join('. ')
    .slice(0, 300);

  return (
    `Professional e-commerce product photograph of: ${what}. ` +
    `Sold by ${business}. ` +
    'One single product, centred, filling most of the frame, on a plain seamless light background. ' +
    'Soft even studio lighting, gentle shadow beneath, sharp focus, true colour, square composition. ' +
    'No text, no logos, no packaging branding, no watermark, no people, no props, no collage.'
  );
}

export interface PhotographResult {
  photographed: number;
  failed: number;
}

/**
 * Gives every product without a picture one.
 *
 * Products that already have an image are left alone, so running this twice —
 * or running it after an owner has uploaded their own photographs — never
 * overwrites somebody's real picture with a generated one.
 */
export async function photographCatalogue(params: {
  projectId: string;
  userId: string;
  business: string;
  /** Called after each batch, so a two-minute run is not two minutes of silence. */
  onProgress?: (done: number, total: number) => void;
}): Promise<PhotographResult> {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from('shop_products')
    .select('id, title, summary, description, category, images')
    .eq('project_id', params.projectId)
    .order('position', { ascending: true })
    .limit(MAX_PHOTOGRAPHS);

  // Migration 0015 has not been run, or there is no shop. Not an error.
  if (error || !rows || rows.length === 0) return { photographed: 0, failed: 0 };

  const waiting = rows.filter((row) => !Array.isArray(row.images) || row.images.length === 0);
  if (waiting.length === 0) return { photographed: 0, failed: 0 };

  const { apiKey, source } = await resolveApiKey(params.userId, 'image');
  const catalogue = await getModelCatalog(apiKey);
  const client = openaiFor(apiKey);
  const model = catalogue.image;

  let photographed = 0;
  let failed = 0;

  for (let start = 0; start < waiting.length; start += CONCURRENCY) {
    const batch = waiting.slice(start, start + CONCURRENCY);

    const settled = await Promise.allSettled(
      batch.map(async (row) => {
        const response = await client.images.generate({
          model,
          prompt: productPrompt(row as Photographable, params.business),
          n: 1,
          // Square, because a product grid is square. Asking for a wide image
          // and cropping it to a tile throws away half of what was paid for.
          size: '1024x1024',
        });

        const first = response.data?.[0];
        if (!first) throw new Error('No image came back');

        const bytes = first.b64_json
          ? Buffer.from(first.b64_json, 'base64')
          : Buffer.from(await (await fetch(first.url!)).arrayBuffer());

        const url = await uploadAsset({
          projectId: params.projectId,
          fileName: `product-${row.id}.png`,
          body: bytes,
          contentType: 'image/png',
        });

        await admin.from('shop_products').update({ images: [url] }).eq('id', row.id);

        await recordUsage({
          userId: params.userId,
          projectId: params.projectId,
          eventType: 'image',
          model,
          keySource: source,
        });

        return url;
      }),
    );

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        photographed += 1;
        continue;
      }
      failed += 1;
      await noteError({
        scope: 'shop.photograph',
        error: result.reason,
        projectId: params.projectId,
        userId: params.userId,
      });
    }

    params.onProgress?.(photographed + failed, waiting.length);
  }

  return { photographed, failed };
}

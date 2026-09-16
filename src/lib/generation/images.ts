import 'server-only';
import { openaiFor, resolveApiKey } from '@/lib/openai/client';
import { getModelCatalog } from '@/lib/openai/models';
import { recordUsage } from '@/lib/usage';
import { uploadAsset } from './storage';
import { noteError } from '@/lib/errors';

/**
 * Photographs for a site that has none, made rather than found.
 *
 * A generated site's weakest point is its pictures: stock imagery that belongs
 * to some other business, or no imagery at all, which is worse. This makes a
 * small set that is actually of this business — its room, its counter, its
 * work — and hands back hosted links.
 *
 * Deliberately not part of the build. An image takes ten to twenty seconds and
 * costs real money, and the build is a thing someone is watching a bar for, so
 * this is asked for once the site exists and runs on its own.
 */

export interface GeneratedImage {
  url: string;
  /** Where it is meant to go, in words the editor can act on. */
  role: string;
}

/**
 * What to make, and what each one is for.
 *
 * Four, because that is a hero and enough supporting pictures for a home page
 * without the wait becoming its own problem.
 */
function briefs(business: string, kind: string, brief: string): { role: string; prompt: string }[] {
  const subject = `${business}, ${kind}`.trim();
  const context = brief.slice(0, 300);

  // No logos, no signage, no recognisable faces: a made-up brand name rendered
  // into a photograph reads as fake, and a recognisable person in a picture of
  // a business nobody has photographed is a claim that is not true.
  const house =
    'Photorealistic, natural light, shallow depth of field, editorial photography. ' +
    'No text, no logos, no signage, no watermarks, no recognisable faces.';

  return [
    {
      role: 'the hero image at the top of the home page',
      prompt: `A wide establishing photograph for the website of ${subject}. ${context}. Inviting, uncluttered, room to place a headline over it. ${house}`,
    },
    {
      role: 'the about or story section',
      prompt: `A photograph of the interior or working space of ${subject}. ${context}. Warm and lived-in, showing the craft rather than posing for the camera. ${house}`,
    },
    {
      role: 'a gallery or feature card',
      prompt: `A close detail photograph of the work or products of ${subject}. ${context}. Tight framing, texture, one clear subject. ${house}`,
    },
    {
      role: 'a second gallery or feature card',
      prompt: `A photograph of ${subject} from a customer's point of view — what someone sees when they arrive. ${context}. ${house}`,
    },
  ];
}

/**
 * Makes the images and puts them in the project's own storage.
 *
 * One failure does not sink the set: each is settled on its own, and whatever
 * came back is returned. An empty result is reported honestly by the caller
 * rather than dressed up as success.
 */
export async function generateSiteImages(params: {
  projectId: string;
  userId: string;
  business: string;
  kind: string;
  brief: string;
}): Promise<GeneratedImage[]> {
  const { apiKey, source } = await resolveApiKey(params.userId, 'image');
  const catalog = await getModelCatalog(apiKey);
  const client = openaiFor(apiKey);
  const model = catalog.image;

  const results = await Promise.allSettled(
    briefs(params.business, params.kind, params.brief).map(async ({ role, prompt }) => {
      const response = await client.images.generate({
        model,
        prompt,
        n: 1,
        size: '1536x1024',
      });

      const first = response.data?.[0];
      if (!first) throw new Error('No image came back');

      // Depending on the model the bytes come back inline or behind a URL that
      // expires, so either way they are copied into storage — a site has to
      // keep working long after any signed link would have died.
      const bytes = first.b64_json
        ? Buffer.from(first.b64_json, 'base64')
        : Buffer.from(await (await fetch(first.url!)).arrayBuffer());

      const url = await uploadAsset({
        projectId: params.projectId,
        fileName: `generated-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.png`,
        body: bytes,
        contentType: 'image/png',
      });

      await recordUsage({
        userId: params.userId,
        projectId: params.projectId,
        eventType: 'image',
        model,
        keySource: source,
      });

      return { url, role };
    }),
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      noteError({
        scope: 'images.generate',
        error: result.reason,
        userId: params.userId,
        projectId: params.projectId,
        detail: { model },
      });
    }
  }

  return results
    .filter((result): result is PromiseFulfilledResult<GeneratedImage> => result.status === 'fulfilled')
    .map((result) => result.value);
}

/**
 * Photographs that were made but never made it onto the page.
 *
 * Making four pictures takes about a minute and costs real money, and the
 * browser used to be the only place that knew the URLs: close the tab while it
 * ran and the images sat in storage, paid for, with nothing pointing at them,
 * while the site went on offering to make them all over again. This compares
 * what is in the bucket against what the site actually links to, so the offer
 * can be "put the ones you already have in" rather than "make some more".
 */
export function unplacedImages(urls: string[], siteFiles: string[]): string[] {
  const site = siteFiles.join('\n');
  return urls.filter((url) => {
    // The stored path is what survives a CDN prefix change or a re-signed URL;
    // matching on the whole URL would miss a picture that is plainly there.
    const key = url.split('/').pop();
    return Boolean(key) && !site.includes(key!);
  });
}

/** The instruction that puts them in the page, for the ordinary editor. */
export function imageInstruction(images: { url: string; role?: string }[]): string {
  const lines = images.map((image) =>
    image.role ? `- ${image.url} — for ${image.role}` : `- ${image.url}`,
  );
  return (
    'Put these hosted images into the site. They are already online, so link each one as-is in an ' +
    '<img> tag with a descriptive alt attribute, sized and cropped by CSS the way the existing ' +
    'images on the site are. Replace any placeholder or stock image you find first.\n\n' +
    `${lines.join('\n')}`
  );
}

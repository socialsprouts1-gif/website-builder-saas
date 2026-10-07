import 'server-only';
import { openaiFor, resolveApiKey } from '@/lib/openai/client';
import { getModelCatalog } from '@/lib/openai/models';
import { recordUsage } from '@/lib/usage';
import { uploadAsset } from './storage';
import { noteError } from '@/lib/errors';
import type { Section } from './kit/sections';

/**
 * The photographs a 3D scene is made of.
 *
 * This is the part that was missing, and it was the whole thing. The scene can
 * place objects at six depths with blur and parallax and shadow, and if the
 * objects are grey rectangles it still looks like a diagram. What makes the
 * reference site read as three-dimensional is that the things floating in it
 * are real photographs of real jars, cut out, lit from one side, at an angle.
 *
 * So a 3D build makes them. Three differences from the ordinary site imagery
 * in `images.ts`, all of them necessary rather than nice:
 *
 *   transparent — a cut-out, not a photograph of a product on a white square.
 *                 A rectangle with a background cannot float in front of
 *                 anything; it just covers it.
 *   angled      — shot slightly from above and turned, because an object
 *                 photographed straight on is a flat shape however it is
 *                 placed, and the tilt is what the depth cues have to work on.
 *   consistent  — one lighting direction across the whole set, named in every
 *                 prompt. Six products lit from six directions read as six
 *                 cut-outs pasted together, which is exactly the look this is
 *                 trying to get away from.
 *
 * It is slow and it costs money, and that is the right trade. A 3D site that
 * builds in forty seconds and looks like a wireframe is worse than one that
 * takes four minutes and looks like the thing that was asked for.
 */

/** How many go in a scene. Six is what `PLACES` in the float scene can hold. */
export const MAX_SCENE_SHOTS = 6;

/** In flight at once. The image endpoint is the slowest thing in a build. */
const CONCURRENCY = 3;

export interface SceneShot {
  url: string;
  /** The subject, so the alt text says what the picture is of. */
  subject: string;
}

/**
 * One lighting setup, written once and repeated into every prompt.
 *
 * Named explicitly — key light from the upper left, soft fill, one soft shadow
 * — because "studio lit" alone gets six different studios.
 */
const LIGHT =
  'Studio product photography on a fully transparent background, cut out with a clean edge. ' +
  'Key light from the upper left, soft fill from the right, one soft contact shadow beneath. ' +
  'Photographed slightly from above and turned about fifteen degrees, so the object reads as solid rather than flat. ' +
  'Sharp focus, true colour, high detail. ' +
  'No background, no surface, no props, no text, no logos, no watermarks, no people.';

/**
 * What to photograph, read off the section the model already wrote.
 *
 * The scene's own heading is the hero subject and its items are what stands
 * behind it — which means the pictures are of the things the copy on that
 * section actually talks about, rather than of a generic version of the
 * business. A scene whose headline says "the brass clasp" and whose pictures
 * are of a different bag is worse than no pictures.
 */
export function shotBriefs(params: {
  section: Section;
  business: string;
  kind: string;
}): { subject: string; prompt: string }[] {
  const subjects: string[] = [];

  const hero = params.section.heading?.trim();
  if (hero) subjects.push(hero);
  for (const item of params.section.items ?? []) {
    if (item.title?.trim()) subjects.push(item.title.trim());
  }
  // Nothing named: photograph the business's own product, which is still a
  // great deal better than a rectangle.
  if (subjects.length === 0) subjects.push(`the main product of ${params.business}`);

  const context = (params.section.body ?? params.section.subheading ?? '').slice(0, 220);

  return subjects.slice(0, MAX_SCENE_SHOTS).map((subject) => ({
    subject,
    prompt: `A single product shot for ${params.business}, ${params.kind}. The subject is: ${subject}. ${context} ${LIGHT}`,
  }));
}

/**
 * Makes them, and hands back hosted links.
 *
 * Never throws. A build that has got as far as having pages and copy must not
 * fail because an image endpoint was busy — the scene falls back to its
 * geometric form, which is the old behaviour and still a scene.
 */
export async function photographScene(params: {
  projectId: string;
  userId: string;
  business: string;
  kind: string;
  section: Section;
  onProgress?: (done: number, total: number) => void;
}): Promise<SceneShot[]> {
  const briefs = shotBriefs(params);
  if (briefs.length === 0) return [];

  let apiKey: string;
  let source: Awaited<ReturnType<typeof resolveApiKey>>['source'];
  try {
    ({ apiKey, source } = await resolveApiKey(params.userId, 'image'));
  } catch (error) {
    noteError({ scope: 'scene.shots.key', error, userId: params.userId, projectId: params.projectId });
    return [];
  }

  const catalogue = await getModelCatalog(apiKey);
  const client = openaiFor(apiKey);
  const model = catalogue.image;

  const shots: SceneShot[] = [];
  let done = 0;

  for (let start = 0; start < briefs.length; start += CONCURRENCY) {
    const batch = briefs.slice(start, start + CONCURRENCY);

    const settled = await Promise.allSettled(
      batch.map(async ({ subject, prompt }) => {
        const response = await client.images.generate({
          model,
          prompt,
          n: 1,
          // Square, because the object is centred in its own frame and the
          // scene scales it; and transparent, which is the whole point —
          // without it every layer is an opaque tile and nothing floats.
          size: '1024x1024',
          background: 'transparent',
          output_format: 'png',
        } as Parameters<typeof client.images.generate>[0]);

        const first = response.data?.[0];
        if (!first) throw new Error('No image came back');

        const bytes = first.b64_json
          ? Buffer.from(first.b64_json, 'base64')
          : Buffer.from(await (await fetch(first.url!)).arrayBuffer());

        const url = await uploadAsset({
          projectId: params.projectId,
          fileName: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.png`,
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

        return { url, subject };
      }),
    );

    for (const result of settled) {
      done += 1;
      if (result.status === 'fulfilled') shots.push(result.value);
      else {
        noteError({
          scope: 'scene.shots.generate',
          error: result.reason,
          userId: params.userId,
          projectId: params.projectId,
          detail: { model },
        });
      }
      params.onProgress?.(done, briefs.length);
    }
  }

  return shots;
}

/**
 * Puts the photographs into the section they were made for.
 *
 * The first is the hero — the one nearest the lens — and the rest land on the
 * items in the order they were named, which is the order their subjects came
 * out of the section. An item that already has a picture keeps it: an uploaded
 * photograph of the real product always beats a generated one.
 */
export function placeShots(section: Section, shots: SceneShot[]): Section {
  if (shots.length === 0) return section;

  /**
   * Two passes: every slot gets its own photograph first, then the leftovers
   * fill whatever is still empty.
   *
   * Each shot was taken of a named thing — "Gelsi Neri", not "item 2" — so the
   * picture of the mulberry jam belongs against the mulberry jam. Matching by
   * position got this wrong twice: one failed shot slid every later picture
   * onto the wrong product, and an item that already had its own photograph
   * still consumed the generated one at its index, leaving a later slot empty
   * and wasting a shot that had been paid for.
   *
   * The second pass matters as much as the first. Doing it in one pass let the
   * hero take an unmatched leftover before the items it actually belonged to
   * had been offered it.
   */
  const unused = new Map(shots.map((shot, index) => [index, shot]));

  const bySubject = (subject: string | undefined): string | undefined => {
    if (!subject) return undefined;
    for (const [index, shot] of unused) {
      if (shot.subject === subject) {
        unused.delete(index);
        return shot.url;
      }
    }
    return undefined;
  };

  const anySpare = (): string | undefined => {
    const [first] = unused;
    if (!first) return undefined;
    unused.delete(first[0]);
    return first[1].url;
  };

  // Pass one — only what was photographed for this exact slot.
  let image = section.image ?? bySubject(section.heading);
  const items = (section.items ?? []).map((item) =>
    item.image ? item : { ...item, image: bySubject(item.title) },
  );

  // Pass two — the spares, nearest the lens first.
  if (!image) image = anySpare();
  for (const item of items) {
    if (!item.image) item.image = anySpare();
  }

  return {
    ...section,
    ...(image ? { image } : {}),
    ...(items.length > 0
      ? { items: items.map((item) => (item.image ? item : { ...item, image: undefined })) }
      : {}),
  };
}

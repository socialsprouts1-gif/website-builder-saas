import 'server-only';
import { uploadAsset } from '@/lib/generation/storage';
import { photoMediaUrl, type PlaceProfile } from './places';

/**
 * Turning a Google listing into something the generator can build from.
 *
 * The facts go into the brief as text. The photos are copied into the
 * project's own storage, because a generated site is deployed to the owner's
 * hosting and cannot carry an API key or depend on Lumen staying up.
 */

const MAX_PHOTOS = 6;

export interface SeededPlace {
  /** Text appended to the prompt: what this business actually is. */
  brief: string;
  /** Public URLs of the imported photos, in the project's own storage. */
  photoUrls: string[];
}

/** Every fact worth building a page around, written for a prompt. */
export function describePlace(place: PlaceProfile, photoUrls: string[]): string {
  const lines: string[] = [
    `This is a real business. Use these facts exactly — do not invent a different name, address or phone number.`,
    `Name: ${place.name}`,
  ];

  if (place.category) lines.push(`Type: ${place.category}`);
  if (place.summary) lines.push(`How Google describes it: ${place.summary}`);
  if (place.address) lines.push(`Address: ${place.address}`);
  if (place.phone) lines.push(`Phone: ${place.phone}`);
  if (place.website) lines.push(`Existing website: ${place.website}`);
  if (place.hours.length > 0) lines.push(`Opening hours:\n${place.hours.map((h) => `  ${h}`).join('\n')}`);

  if (place.rating && place.reviewCount) {
    lines.push(`Google rating: ${place.rating} from ${place.reviewCount} reviews. Say this on the page.`);
  }

  if (place.reviews.length > 0) {
    lines.push(
      'Real customer reviews to quote verbatim in a testimonials section, each with its author name and "via Google":',
    );
    for (const review of place.reviews.slice(0, 5)) {
      lines.push(`  ${review.rating}★ ${review.author}: "${review.text.replace(/\s+/g, ' ').slice(0, 400)}"`);
    }
    lines.push('Do not edit, shorten or improve a review. Quote it or leave it out.');
  }

  if (photoUrls.length > 0) {
    lines.push(
      `Real photographs of this business, already hosted and ready to use. Use every one in an <img>, with a descriptive alt attribute, instead of drawing a placeholder:\n${photoUrls.map((url) => `  ${url}`).join('\n')}`,
    );
  }

  if (place.mapsUrl) {
    lines.push(`Link "See us on Google" to ${place.mapsUrl} in the footer, and attribute reviews to Google.`);
  }

  return lines.join('\n');
}

/**
 * Copies the listing's photos into the project's storage.
 *
 * Failures are per-photo and silent: a site with four of its six photographs
 * is fine, and losing the whole build over one bad image is not.
 */
export async function importPlacePhotos(projectId: string, place: PlaceProfile): Promise<string[]> {
  const urls: string[] = [];

  for (const [index, photo] of place.photos.slice(0, MAX_PHOTOS).entries()) {
    const source = photoMediaUrl(photo.name, 1600);
    if (!source) break;

    try {
      const response = await fetch(source, { redirect: 'follow' });
      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') ?? 'image/jpeg';
      if (!contentType.startsWith('image/')) continue;

      const body = Buffer.from(await response.arrayBuffer());
      if (body.length === 0) continue;

      const extension = contentType.split('/')[1]?.split(';')[0] ?? 'jpg';
      urls.push(
        await uploadAsset({
          projectId,
          fileName: `google-${index + 1}.${extension}`,
          body,
          contentType,
        }),
      );
    } catch {
      // One unreachable photo is not a failed build.
    }
  }

  return urls;
}

export async function seedFromPlace(projectId: string, place: PlaceProfile): Promise<SeededPlace> {
  const photoUrls = await importPlacePhotos(projectId, place);
  return { brief: describePlace(place, photoUrls), photoUrls };
}

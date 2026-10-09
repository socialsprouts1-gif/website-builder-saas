import { isOwnAsset } from '@/lib/asset-url';
import type { SiteFile } from './types';

/**
 * Did the pictures actually land?
 *
 * The composer turns an upload into a line of the request — "Use this image
 * (already hosted, link it as-is): https://…". Nothing then checked that the
 * address came out the other side. So an edit that quietly ignored all seven
 * uploads still reported "Saved — 1 file changed", and the only way to find
 * out was to look at the site and see the same empty frames.
 *
 * This is the one part of an edit that can be checked exactly rather than
 * judged: either the URL is in the markup or it is not.
 */

/** Every https URL in a piece of text, stripped of the punctuation around it. */
function urlsIn(text: string): string[] {
  const found = text.match(/https:\/\/[^\s<>"')\]]+/g) ?? [];
  // A URL at the end of a sentence collects the full stop; a URL in brackets
  // collects the bracket. Neither is part of the address.
  return found.map((url) => url.replace(/[.,;:]+$/, ''));
}

/**
 * The uploads a request asked for, and nothing else.
 *
 * Only our own storage: a "match the look of this website: https://…" line
 * names somebody else's page as a reference, and that address is not supposed
 * to appear anywhere in the output.
 */
export function requestedAssets(request: string): string[] {
  return [...new Set(urlsIn(request).filter(isOwnAsset))];
}

/** Of those, the ones that did not make it into any file. */
export function missingAssets(request: string, files: SiteFile[]): string[] {
  const wanted = requestedAssets(request);
  if (wanted.length === 0) return [];
  const haystack = files.map((file) => file.content).join('\n');
  return wanted.filter((url) => !haystack.includes(url));
}

/**
 * The second ask, when the first one left pictures on the floor.
 *
 * Deliberately narrow: it names the addresses, says where the empty frames
 * are, and asks for nothing else to change. A general "try again" gets a
 * general rewrite, which is how an edit that missed the images comes back
 * having also rewritten the headings.
 */
export function placementInstruction(missing: string[]): string {
  return `${missing.length === 1 ? 'One picture was' : `${missing.length} pictures were`} not placed. Put ${
    missing.length === 1 ? 'it' : 'them'
  } on the page now, and change nothing else.

${missing.map((url) => `- ${url}`).join('\n')}

Each one goes inside <div class="media"><img src="THE URL" alt="…" loading="lazy" /></div>. Where the page already has an empty frame — <div class="media media--empty …"></div> — replace that whole div with the filled one, keeping any extra classes it carried, such as media--wide. If there are more pictures than empty frames, add the rest to the most fitting gallery or grid on the page.

Re-emit only the files you change. Use the addresses exactly as written above: they are already hosted and there is no other working address for them.`;
}

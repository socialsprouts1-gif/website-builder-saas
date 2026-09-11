/**
 * Turning whatever someone pastes into something the Places API can look up.
 *
 * Google Maps links come in half a dozen shapes depending on whether they came
 * from the app, the desktop site, a share sheet or a QR code, and only some of
 * them carry an id. The rest carry a name, which Text Search resolves. Anything
 * unrecognised is treated as a search term, so pasting "Hairtie Salon Bandra"
 * works as well as pasting a link.
 */

export type PlaceLookup =
  | { kind: 'place_id'; value: string }
  | { kind: 'cid'; value: string }
  | { kind: 'query'; value: string }
  | { kind: 'short'; value: string };

/** Short links resolve to a real one only by being followed. */
const SHORT_HOSTS = ['maps.app.goo.gl', 'goo.gl', 'g.co', 'maps.google.com/url'];

export function isShortLink(input: string): boolean {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const url = new URL(trimmed);
    return SHORT_HOSTS.some((host) => `${url.host}${url.pathname}`.startsWith(host));
  } catch {
    return false;
  }
}

export function parseGoogleUrl(input: string): PlaceLookup | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (!/^https?:\/\//i.test(trimmed)) {
    // Not a link at all — someone typed their business name.
    return { kind: 'query', value: trimmed.slice(0, 200) };
  }

  if (isShortLink(trimmed)) return { kind: 'short', value: trimmed };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { kind: 'query', value: trimmed.slice(0, 200) };
  }

  // ?q=place_id:ChIJ… — the explicit form Google's own share links use.
  const q = url.searchParams.get('q') ?? '';
  const placeIdInQuery = q.match(/place_id:([A-Za-z0-9_-]+)/);
  if (placeIdInQuery) return { kind: 'place_id', value: placeIdInQuery[1] };

  const placeIdParam = url.searchParams.get('place_id');
  if (placeIdParam) return { kind: 'place_id', value: placeIdParam };

  // ?cid=123… — the numeric customer id from older Maps links.
  const cid = url.searchParams.get('cid');
  if (cid && /^\d+$/.test(cid)) return { kind: 'cid', value: cid };

  // /maps/place/The+Business+Name/@12.97,77.59,17z/…
  const named = url.pathname.match(/\/maps\/place\/([^/@]+)/);
  if (named) {
    const name = decodeURIComponent(named[1]).replace(/\+/g, ' ').trim();
    // "/maps/place/" with no name, or one that is only coordinates, is no use.
    if (name && !/^[-\d.,\s]+$/.test(name)) return { kind: 'query', value: name.slice(0, 200) };
  }

  if (q.trim()) return { kind: 'query', value: q.trim().slice(0, 200) };

  return null;
}

/**
 * A hint for Text Search when the link carried coordinates. Searching a name
 * alone finds the wrong branch of a chain; a location narrows it.
 */
export function coordinatesFrom(input: string): { lat: number; lng: number } | null {
  const match = input.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

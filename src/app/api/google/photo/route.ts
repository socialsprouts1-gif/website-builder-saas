import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { photoMediaUrl } from '@/lib/google/places';
import { jsonError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * Serves one Places photo.
 *
 * The Places photo endpoint wants the API key in the URL, so the browser can
 * never be given that URL directly — it would put the key in a page anyone can
 * read. The bytes are fetched here instead and the key stays on the server.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError('Sign in first', 401);

  const name = request.nextUrl.searchParams.get('name') ?? '';
  // Photo resource names look like places/<id>/photos/<ref>. Anything else is
  // someone trying to point this at a URL of their choosing.
  if (!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name)) {
    return jsonError('Not a photo reference', 422);
  }

  const width = Number(request.nextUrl.searchParams.get('w') ?? '1200');
  const url = photoMediaUrl(name, Number.isFinite(width) ? Math.min(Math.max(width, 200), 1600) : 1200);
  if (!url) return jsonError('Google lookup is not set up on this deployment.', 503);

  const upstream = await fetch(url, { redirect: 'follow' });
  if (!upstream.ok || !upstream.body) return jsonError('That photo could not be fetched.', 502);

  return new Response(upstream.body, {
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'image/jpeg',
      'cache-control': 'private, max-age=3600',
    },
  });
}

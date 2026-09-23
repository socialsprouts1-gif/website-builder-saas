import { NextResponse } from 'next/server';
import { blueprintById } from '@/lib/templates';
import { previewFile } from '@/lib/templates/preview';

export const runtime = 'nodejs';

/**
 * Serves a template preview as a real website.
 *
 * Rendered on demand from the blueprint rather than stored: there is nothing to
 * keep in sync, and a change to a section renderer shows up in every preview
 * the moment it lands.
 *
 * Same treatment as a generated site — it is served to an iframe with
 * `sandbox="allow-scripts"` and no `allow-same-origin`, so it runs in an opaque
 * origin and the CSP below stops it reaching anywhere it should not. The markup
 * is ours, but the rule is the rule.
 */
const CSP = [
  "default-src 'none'",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "script-src 'self'",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'self'",
].join('; ');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; path?: string[] }> },
) {
  const { id, path } = await params;
  const blueprint = blueprintById(id);
  if (!blueprint) return new NextResponse('Not found', { status: 404 });

  const file = previewFile(blueprint, (path ?? []).join('/'));
  if (!file) return new NextResponse('Not found', { status: 404 });

  return new NextResponse(file.body, {
    headers: {
      'content-type': file.type,
      'content-security-policy': CSP,
      'x-content-type-options': 'nosniff',
      // Built from data in the bundle, so it is as cacheable as the deployment.
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

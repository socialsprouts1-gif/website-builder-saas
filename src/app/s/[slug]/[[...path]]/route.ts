import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentFiles } from '@/lib/generation/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A published site, served to anyone with the link.
 *
 * Deliberately not the /preview route: that one is for the owner and is behind
 * their session. This is the address they hand to a customer.
 *
 * The same sandbox rules apply. Generated markup is a model's output shown on
 * Lumen's own domain, so it gets a strict policy and its own origin-ish
 * treatment: no scripts beyond its own file, nothing framed, no form posts off
 * to anywhere.
 */

const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  json: 'application/json',
  xml: 'application/xml',
  txt: 'text/plain; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  ico: 'image/x-icon',
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string; path?: string[] }> },
) {
  const { slug, path } = await context.params;

  const admin = createAdminClient();
  const { data: project } = await admin
    .from('projects')
    .select('id, published_at, favicon_url')
    .eq('public_slug', slug)
    .not('published_at', 'is', null)
    .maybeSingle();

  if (!project) return new Response('Not found', { status: 404 });

  const requested = (path ?? []).join('/') || 'index.html';
  // No traversal, no absolute paths: only files this project actually has.
  const wanted = requested.replace(/^\/+/, '').replace(/\.\.+/g, '');

  const files = await getCurrentFiles(project.id);
  const file =
    files.find((candidate) => candidate.path === wanted) ??
    (wanted.endsWith('/') || !wanted.includes('.')
      ? files.find((candidate) => candidate.path === `${wanted.replace(/\/$/, '')}.html`)
      : undefined);

  if (!file) return new Response('Not found', { status: 404 });

  const extension = file.path.split('.').pop()?.toLowerCase() ?? 'html';
  const isHtml = extension === 'html';

  return new Response(isHtml ? withFavicon(file.content, project.favicon_url) : file.content, {
    headers: {
      'content-type': TYPES[extension] ?? 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=300',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
      'referrer-policy': 'strict-origin-when-cross-origin',
      ...(isHtml
        ? {
            'content-security-policy': [
              "default-src 'none'",
              "img-src 'self' https: data:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src https://fonts.gstatic.com",
              "script-src 'self'",
              "form-action 'none'",
              "frame-ancestors 'self'",
              "base-uri 'none'",
            ].join('; '),
          }
        : {}),
    },
  });
}

/** The owner's favicon, injected at serve time rather than baked into a build. */
function withFavicon(html: string, faviconUrl: string | null): string {
  if (!faviconUrl) return html;
  const safe = faviconUrl.replace(/"/g, '&quot;');
  if (/<link[^>]+rel=["']?icon/i.test(html)) return html;
  return html.replace(/<\/head>/i, `<link rel="icon" href="${safe}" />\n</head>`);
}

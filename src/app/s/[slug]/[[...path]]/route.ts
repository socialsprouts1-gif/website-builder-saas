import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentFiles } from '@/lib/generation/storage';
import { pendingPage } from '@/lib/generation/kit/placeholder';
import { absolutise, decorate, loadSiteExtras } from '@/lib/site-extras';

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
  request: NextRequest,
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

  // Every link the page makes to itself hangs off this, so it holds whether the
  // address was typed with a trailing slash or without one.
  const base = `/s/${encodeURIComponent(slug)}/`;

  const requested = (path ?? []).join('/') || 'index.html';
  // No traversal, no absolute paths: only files this project actually has.
  const wanted = requested.replace(/^\/+/, '').replace(/\.\.+/g, '');

  const files = await getCurrentFiles(project.id);
  const file =
    files.find((candidate) => candidate.path === wanted) ??
    (wanted.endsWith('/') || !wanted.includes('.')
      ? files.find((candidate) => candidate.path === `${wanted.replace(/\/$/, '')}.html`)
      : undefined);

  if (!file) {
    // Pages arrive one at a time while a site is being written, so a link into
    // a page that is not assembled yet gets a holding page in the site's own
    // styling rather than a bare 404 in a customer's face.
    const wantsPage = !wanted.includes('.') || wanted.endsWith('.html');
    if (!wantsPage) return new Response('Not found', { status: 404 });

    return new Response(
      pendingPage({
        title: 'Coming soon',
        label: 'Coming soon',
        heading: 'This page is on its way',
        message: 'It is being put together right now. Everything else on the site is ready.',
        homeHref: files.some((candidate) => candidate.path === 'index.html') ? base : undefined,
        stylesheet: files.some((candidate) => candidate.path === 'styles.css')
          ? `${base}styles.css`
          : null,
      }),
      {
        status: 404,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
          'content-security-policy': HTML_CSP,
        },
      },
    );
  }

  const extension = file.path.split('.').pop()?.toLowerCase() ?? 'html';
  const isHtml = extension === 'html';

  const body = isHtml
    ? decorate(
        absolutise(withFavicon(file.content, project.favicon_url), base),
        await loadSiteExtras(project.id),
      )
    : file.content;

  return new Response(body, {
    headers: {
      'content-type': TYPES[extension] ?? 'text/plain; charset=utf-8',
      // Short, because switching the assistant on or off has to show up without
      // waiting for a cache to age out.
      'cache-control': isHtml ? 'public, max-age=30, s-maxage=60' : 'public, max-age=300, s-maxage=600',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
      'referrer-policy': 'strict-origin-when-cross-origin',
      ...(isHtml ? { 'content-security-policy': HTML_CSP } : {}),
    },
  });
}

/**
 * A published page is a top-level document on Lumen's own origin, not a
 * sandboxed frame, so 'self' means what it says here and the site's stylesheet
 * and script load under it.
 */
const HTML_CSP = [
  "default-src 'none'",
  "img-src 'self' https: data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "script-src 'self'",
  // The site assistant posts back to Lumen from the page it is on.
  "connect-src 'self'",
  "form-action 'none'",
  "frame-ancestors 'self'",
  "base-uri 'none'",
].join('; ');

/** The owner's favicon, injected at serve time rather than baked into a build. */
function withFavicon(html: string, faviconUrl: string | null): string {
  if (!faviconUrl) return html;
  const safe = faviconUrl.replace(/"/g, '&quot;');
  if (/<link[^>]+rel=["']?icon/i.test(html)) return html;
  return html.replace(/<\/head>/i, `<link rel="icon" href="${safe}" />\n</head>`);
}

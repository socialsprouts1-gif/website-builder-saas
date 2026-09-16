import { after, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentFiles } from '@/lib/generation/storage';
import { pendingPage } from '@/lib/generation/kit/placeholder';
import { absolutise, decorate, loadSiteExtras } from '@/lib/site-extras';
import { renderRobots, renderSitemap, withSeoHead, type SiteFacts } from '@/lib/seo';
import { recordVisit } from '@/lib/traffic';
import { whatsappHref } from '@/lib/whatsapp';

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
    .select('id, name, description, business_type, published_at, favicon_url')
    .eq('public_slug', slug)
    .not('published_at', 'is', null)
    .maybeSingle();

  if (!project) return new Response('Not found', { status: 404 });

  // Every link the page makes to itself hangs off this, so it holds whether the
  // address was typed with a trailing slash or without one.
  const base = `/s/${encodeURIComponent(slug)}/`;

  // The origin is read from the request rather than from configuration: the
  // same app answers on a preview URL and on its own domain, and a sitemap
  // full of the wrong hostname is worse than no sitemap.
  const origin = originOf(request);
  const requested = (path ?? []).join('/') || 'index.html';
  // No traversal, no absolute paths: only files this project actually has.
  const wanted = requested.replace(/^\/+/, '').replace(/\.\.+/g, '');

  const files = await getCurrentFiles(project.id);

  // Written from the site as it currently stands, so a page added this morning
  // is in the sitemap this afternoon without anything being regenerated.
  if (wanted === 'sitemap.xml' || wanted === 'robots.txt') {
    const pages = files
      .filter((candidate) => candidate.path.endsWith('.html'))
      .map((candidate) => candidate.path)
      .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));

    const body =
      wanted === 'robots.txt' ? renderRobots(origin, base) : renderSitemap(origin, base, pages);

    return new Response(body, {
      headers: {
        'content-type': wanted === 'robots.txt' ? 'text/plain; charset=utf-8' : 'application/xml',
        'cache-control': 'public, max-age=300, s-maxage=600',
        'x-content-type-options': 'nosniff',
      },
    });
  }

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

  const facts: SiteFacts = {
    businessName: project.name,
    description: project.description,
    category: project.business_type,
    // Not in the project row: the address and phone live in the page the model
    // wrote. Left null rather than guessed — structured data that is wrong is
    // worse than structured data that is thin, because it gets believed.
    address: null,
    phone: null,
    faviconUrl: project.favicon_url,
  };

  const extras = isHtml ? await loadSiteExtras(project.id) : null;

  const body =
    isHtml && extras
      ? withSeoHead(
          decorate(
            absolutise(withFavicon(file.content, project.favicon_url), base),
            extras,
            file.path,
          ),
          {
            pageUrl: `${origin}${base}${file.path === 'index.html' ? '' : file.path}`,
            // This is what turns the enquiry form from a message into a lead.
            leadsEndpoint: `/api/leads/${encodeURIComponent(slug)}`,
            facts,
            // When the owner wants enquiries on WhatsApp, the form hands the
            // message over after filing it — the customer sends it themselves,
            // which needs no API and no approval from anyone.
            whatsappHandoff:
              extras.whatsappLeads && extras.whatsappNumber
                ? whatsappHref(extras.whatsappNumber, null)
                : null,
          },
        )
      : file.content;

  // Counted after the response has gone, so the page is never slower for it.
  if (isHtml) {
    after(
      recordVisit({
        projectId: project.id,
        path: file.path,
        address:
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          request.headers.get('x-real-ip') ??
          'unknown',
        userAgent: request.headers.get('user-agent'),
      }),
    );
  }

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

/** Whatever hostname this site is actually being served on. */
function originOf(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  return host ? `${proto}://${host}` : request.nextUrl.origin;
}

/**
 * A published page is a top-level document on Lumen's own origin, not a
 * sandboxed frame, so 'self' means what it says here and the site's stylesheet
 * and script load under it.
 */
const HTML_CSP = [
  "default-src 'none'",
  "img-src 'self' https: data:",
  // An uploaded video lives in Supabase storage, so it is not 'self'. Without
  // this, default-src 'none' blocks it and the published page shows a dead box.
  "media-src 'self' https: data: blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "script-src 'self'",
  // The site assistant posts back to Lumen from the page it is on.
  "connect-src 'self'",
  // Video sections embed one of exactly two hosts; blocks.ts will not write
  // any other src, and this makes sure nothing else can be framed either.
  'frame-src https://www.youtube-nocookie.com https://player.vimeo.com',
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

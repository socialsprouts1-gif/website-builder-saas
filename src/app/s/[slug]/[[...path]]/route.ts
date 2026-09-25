import { after, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentFiles } from '@/lib/generation/storage';
import { pendingPage } from '@/lib/generation/kit/placeholder';
import { absolutise, decorate, loadSiteExtras } from '@/lib/site-extras';
import { renderRobots, renderSitemap, withSeoHead, type SiteFacts } from '@/lib/seo';
import { recordVisit } from '@/lib/traffic';
import { whatsappHref } from '@/lib/whatsapp';
import { loadShop } from '@/lib/shop/load';
import { shopPaymentKeys } from '@/lib/shop/gateway';
import {
  decorateWithShop,
  improvisedPage,
  productResponse,
  productSlugFromPath,
  shopSlotFor,
  SHOP_ASSETS,
  type ShopRequest,
} from '@/lib/shop/serve';

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
    // Trashing a site takes it off the internet. Leaving it served would make
    // "delete" mean nothing to the only person it matters to — a customer who
    // can still find it.
    .is('deleted_at', null)
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

  // What the shop needs, and where its links point. Read once for the request,
  // whichever of the several shop-shaped answers below it turns out to be.
  const shop = await loadShop(project.id).catch(() => null);

  // Whether this shop can take a card payment at all. It decides one thing
  // only: whether the gateway's hosts are named in the policy below. A site
  // that never takes one keeps `script-src 'self'` and cannot be made to load
  // a payment library.
  const takesPayments = shop?.enabled ? Boolean(await shopPaymentKeys(project.id)) : false;
  const csp = htmlCsp({ payments: takesPayments });
  const shopRequest: ShopRequest | null = shop?.enabled
    ? {
        shop,
        base,
        endpoint: `/api/shop/${encodeURIComponent(slug)}/orders`,
        storageKey: slug,
        // A published page is a top-level document under `script-src 'self'`,
        // so its script and stylesheet are files it loads for itself.
        inline: false,
        takesPayments,
      }
    : null;

  // The shop's own two assets. Named files because inline is forbidden here,
  // and cacheable because they are the same bytes for every shop.
  if (shopRequest && SHOP_ASSETS[wanted]) {
    const asset = SHOP_ASSETS[wanted];
    return new Response(asset.body, {
      headers: {
        'content-type': asset.type,
        'cache-control': 'public, max-age=3600, s-maxage=86400',
        'x-content-type-options': 'nosniff',
      },
    });
  }

  const category = request.nextUrl.searchParams.get('category');

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

  /** A finished page, with the site's own extras, SEO and headers on it. */
  const htmlResponse = async (page: string, path: string) => {
    const extras = await loadSiteExtras(project.id);
    const body = withSeoHead(decorate(page, extras, path), {
      pageUrl: `${origin}${base}${path}`,
      leadsEndpoint: `/api/leads/${encodeURIComponent(slug)}`,
      facts,
      whatsappHandoff:
        extras.whatsappLeads && extras.whatsappNumber
          ? whatsappHref(extras.whatsappNumber, null)
          : null,
    });

    after(
      recordVisit({
        projectId: project.id,
        path,
        address:
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          request.headers.get('x-real-ip') ??
          'unknown',
        userAgent: request.headers.get('user-agent'),
      }),
    );

    return new Response(body, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // Short: a price or a stock count changing has to show up without
        // waiting for a cache to age out.
        'cache-control': 'public, max-age=15, s-maxage=30',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'content-security-policy': csp,
      },
    });
  };

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

  // A product has no file of its own — there would have to be one per product,
  // rewritten on every price change. It is rendered from the database into the
  // site's own shell instead.
  const home = files.find((candidate) => candidate.path === 'index.html')?.content ?? null;

  // Only when no real file answers this path: a file the owner has is always
  // the page they meant, and a shop must never shadow one.
  if (shopRequest && home && !file) {
    const productSlug = productSlugFromPath(wanted);
    if (productSlug) {
      const page = productResponse(productSlug, home, shopRequest);
      if (page) return htmlResponse(page, wanted);
      // A product that was taken down. Say so on the shop's own page rather
      // than in a 404 that looks like the whole site is broken.
      return new Response(null, { status: 302, headers: { location: `${base}shop.html` } });
    }

    // A shop switched on for a site built before there was one: the three shop
    // pages are assembled out of the home page's shell.
    const slot = shopSlotFor(wanted);
    if (slot) {
      const page = improvisedPage(slot, home, shopRequest, category);
      if (page) return htmlResponse(page, wanted);
    }
  }

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
          'content-security-policy': csp,
        },
      },
    );
  }

  const extension = file.path.split('.').pop()?.toLowerCase() ?? 'html';
  const isHtml = extension === 'html';

  const extras = isHtml ? await loadSiteExtras(project.id) : null;

  const body =
    isHtml && extras
      ? withSeoHead(
          // After absolutise, never before: the shop writes its own links
          // already pointing at this site's base, and absolutising them twice
          // would prefix them a second time.
          decorateWithShop(
            decorate(
              absolutise(withFavicon(file.content, project.favicon_url), base),
              extras,
              file.path,
            ),
            shopRequest,
            category,
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
      ...(isHtml ? { 'content-security-policy': csp } : {}),
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
/**
 * The gateway's own hosts.
 *
 * A payment window is somebody else's code running on the customer's card
 * details, so it is allowed in by name and only on a shop that has connected
 * one. A site that never takes a card payment keeps `script-src 'self'` and
 * cannot be made to load a payment library at all.
 */
const RAZORPAY_HOSTS = {
  script: 'https://checkout.razorpay.com',
  connect: 'https://api.razorpay.com https://lumberjack.razorpay.com',
  frame: 'https://api.razorpay.com https://checkout.razorpay.com',
};

function htmlCsp(options: { payments: boolean }): string {
  if (!options.payments) return HTML_CSP;

  return HTML_CSP.split('; ')
    .map((directive) => {
      if (directive.startsWith('script-src')) return `${directive} ${RAZORPAY_HOSTS.script}`;
      if (directive.startsWith('connect-src')) return `${directive} ${RAZORPAY_HOSTS.connect}`;
      if (directive.startsWith('frame-src')) return `${directive} ${RAZORPAY_HOSTS.frame}`;
      return directive;
    })
    .join('; ');
}

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

import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { canonicalRedirect } from '@/lib/canonical-host';
import { isApplicationPath, isCustomHost, isStaticAsset } from '@/lib/domains';
import { siteForHostname } from '@/lib/domain-lookup';
import { env } from '@/lib/env';

export async function middleware(request: NextRequest) {
  const rawHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');

  /**
   * A customer's own domain, answering with their published site.
   *
   * This is what "connect your domain" means. The site is already published at
   * lumensite.in/s/<slug>; a request that arrives on ummclothing.in is the same
   * site asked for by a different name, so it is rewritten to that path and
   * told to write its links as if it were at the root.
   *
   * Checked before the canonical redirect, which would otherwise be deciding
   * what to do about a host that is none of its business.
   */
  const custom = isCustomHost(rawHost, env.canonicalOrigin);
  if (custom) {
    // /api/chatbot and /api/embed stay where they are: the widget on a
    // published page asks for them root-relative, and on a customer's domain
    // that is this application, not their files.
    if (isApplicationPath(request.nextUrl.pathname)) return NextResponse.next();

    const site = await siteForHostname(custom);
    if (site) {
      const url = request.nextUrl.clone();
      url.pathname = `/s/${encodeURIComponent(site.slug)}${request.nextUrl.pathname}`;
      // Their domain is the root of their site, so every link the page writes
      // about itself has to be written from the root — not from /s/<slug>/,
      // which is where the files actually live.
      const headers = new Headers(request.headers);
      headers.set('x-lumen-site-base', '/');
      return NextResponse.rewrite(url, { request: { headers } });
    }

    // Pointed here but not connected to anything. Saying so beats serving the
    // Lumen marketing page on somebody's shop domain, which is what used to
    // happen and reads as the domain having been stolen.
    return new NextResponse(
      'This domain is not connected to a site yet. If it is yours, open it in Lumen under Deploy → Your own domain.',
      { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }

  // One host, before anything else looks at the request. Two hosts serving the
  // same content is a quiet, expensive problem: search engines index both and
  // rank neither, and a session cookie set on one is not sent to the other.
  const host = canonicalRedirect(rawHost, env.canonicalOrigin);
  if (host) {
    const url = request.nextUrl.clone();
    url.host = host;
    url.protocol = 'https:';
    url.port = '';
    // 308, not 307: permanent, and it keeps the method, so a form posted to the
    // wrong host is not silently turned into a GET.
    return NextResponse.redirect(url, 308);
  }

  // Static files on our own host cost nothing: there is no session to refresh
  // for a picture. They are in the matcher only so that the same picture, asked
  // for on a customer's domain, can be routed to their site above.
  if (isStaticAsset(request.nextUrl.pathname)) return NextResponse.next();

  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except the application's own static build output, and except
    // the public embed/preview surfaces that must stay reachable without a
    // Lumen session.
    //
    // The billing webhook is out for a different reason: Razorpay posts to
    // whatever URL was typed into its dashboard, and a webhook sender is not a
    // browser — a 308 to the canonical host is recorded as a failed delivery
    // rather than followed, which would mean a paid subscription never
    // activating. Out of the matcher, it is served on either host, and it has
    // its own authentication in the signature it verifies.
    //
    // Published sites under /s/ are read by strangers, so they skip the session
    // refresh entirely rather than paying for an auth round-trip per request.
    // /s/ also stays out because a custom-domain request is rewritten *to* it:
    // a rewrite does not re-enter the middleware, and leaving it in would only
    // add a second pass over a path we just wrote.
    //
    // Pictures and stylesheets are in, unlike before. They have to be: on a
    // customer's own domain, every file of their site arrives here first, and
    // a logo that 404s is a broken site. On our own host they return at the top
    // of the middleware without touching the session.
    '/((?!_next/static|_next/image|favicon.ico|api/chatbot|api/embed|api/billing/webhook|preview|s/).*)',
  ],
};

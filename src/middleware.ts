import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { canonicalRedirect } from '@/lib/canonical-host';
import { env } from '@/lib/env';

export async function middleware(request: NextRequest) {
  // One host, before anything else looks at the request. Two hosts serving the
  // same content is a quiet, expensive problem: search engines index both and
  // rank neither, and a session cookie set on one is not sent to the other.
  const host = canonicalRedirect(
    request.headers.get('x-forwarded-host') ?? request.headers.get('host'),
    env.canonicalOrigin,
  );
  if (host) {
    const url = request.nextUrl.clone();
    url.host = host;
    url.protocol = 'https:';
    url.port = '';
    // 308, not 307: permanent, and it keeps the method, so a form posted to the
    // wrong host is not silently turned into a GET.
    return NextResponse.redirect(url, 308);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, and except the public embed/preview
    // surfaces that must stay reachable without a Lumen session. Published
    // sites under /s/ are read by strangers, so they skip the session refresh
    // entirely rather than paying for an auth round-trip per request.
    //
    // /s/ stays out even though the host redirect above would be useful there:
    // a published site on a customer's own domain must never be moved, and
    // canonicalRedirect already refuses to move one. Keeping the exclusion
    // means those requests cost nothing at all.
    '/((?!_next/static|_next/image|favicon.ico|api/chatbot|api/embed|preview|s/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

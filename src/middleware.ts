import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, and except the public embed/preview
    // surfaces that must stay reachable without a Lumen session. Published
    // sites under /s/ are read by strangers, so they skip the session refresh
    // entirely rather than paying for an auth round-trip per request.
    '/((?!_next/static|_next/image|favicon.ico|api/chatbot|api/embed|preview|s/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

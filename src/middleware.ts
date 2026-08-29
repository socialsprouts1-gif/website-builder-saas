import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, and except the public embed/preview
    // surfaces that must stay reachable without a Lumen session.
    '/((?!_next/static|_next/image|favicon.ico|api/chatbot|api/embed|preview|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

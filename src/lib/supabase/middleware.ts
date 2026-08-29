import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';

/** Refreshes the Supabase session cookie and gates the authenticated shell. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!env.supabase.url || !env.supabase.anonKey) return response;

  const supabase = createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith('/app') || path.startsWith('/admin') || path.startsWith('/onboarding');

  if (!user && isProtected) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/login';
    redirect.searchParams.set('next', path);
    return NextResponse.redirect(redirect);
  }

  if (user && (path === '/login' || path === '/signup')) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/app';
    redirect.search = '';
    return NextResponse.redirect(redirect);
  }

  return response;
}

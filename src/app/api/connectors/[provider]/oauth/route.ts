import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getConnector } from '@/lib/connectors/registry';
import { env } from '@/lib/env';
import { jsonError } from '@/lib/api';

export const runtime = 'nodejs';

/** Starts an OAuth handshake, with a signed state cookie to defeat CSRF. */
export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError('Sign in first', 401);

  const connector = getConnector(provider);
  if (!connector || connector.auth.kind !== 'oauth') return jsonError('Unknown connector', 404);
  if (!connector.isConfigured()) {
    return jsonError(`${connector.name} is not configured on this deployment yet.`, 409);
  }

  const clientId = process.env[`${connector.auth.envKey}_CLIENT_ID`];
  if (!clientId) return jsonError(`${connector.name} is not configured on this deployment yet.`, 409);

  const state = randomBytes(24).toString('base64url');
  const cookieStore = await cookies();
  cookieStore.set(`lumen_oauth_${provider}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  const redirectUri = `${env.siteUrl}/api/connectors/${provider}/callback`;
  const authorize = new URL(connector.auth.authorizeUrl);
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('state', state);
  if (connector.auth.scopes.length > 0) {
    authorize.searchParams.set('scope', connector.auth.scopes.join(' '));
  }
  if (provider === 'google_sheets') {
    authorize.searchParams.set('access_type', 'offline');
    authorize.searchParams.set('prompt', 'consent');
  }

  return NextResponse.redirect(authorize.toString());
}

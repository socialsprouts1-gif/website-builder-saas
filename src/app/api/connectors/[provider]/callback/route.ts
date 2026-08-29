import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encodeCredentials, getConnector, loadAccountContext } from '@/lib/connectors/registry';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

/** Completes an OAuth handshake and stores the token, encrypted. */
export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const settingsUrl = new URL('/app/settings/connectors', env.siteUrl);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', env.siteUrl));

  const connector = getConnector(provider);
  if (!connector || connector.auth.kind !== 'oauth') {
    settingsUrl.searchParams.set('error', 'unknown_connector');
    return NextResponse.redirect(settingsUrl);
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(`lumen_oauth_${provider}`)?.value;
  cookieStore.delete(`lumen_oauth_${provider}`);

  if (!code || !state || !expectedState || state !== expectedState) {
    settingsUrl.searchParams.set('error', 'state_mismatch');
    return NextResponse.redirect(settingsUrl);
  }

  const clientId = process.env[`${connector.auth.envKey}_CLIENT_ID`];
  const clientSecret = process.env[`${connector.auth.envKey}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) {
    settingsUrl.searchParams.set('error', 'not_configured');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const response = await fetch(connector.auth.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${env.siteUrl}/api/connectors/${provider}/callback`,
      }),
    });

    const payload = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      error?: string;
      authed_user?: { access_token?: string };
    };

    // Slack returns the user token nested; everything else is top level.
    const accessToken = payload.access_token ?? payload.authed_user?.access_token;
    if (!response.ok || !accessToken) {
      settingsUrl.searchParams.set('error', 'token_exchange_failed');
      return NextResponse.redirect(settingsUrl);
    }

    const credentials: Record<string, string> = { access_token: accessToken };
    if (payload.refresh_token) credentials.refresh_token = payload.refresh_token;

    const connectorContext = await loadAccountContext(user.id, provider);
    const result = await connector.connect({ ...connectorContext, credentials });
    if (!result.ok) {
      settingsUrl.searchParams.set('error', 'verification_failed');
      return NextResponse.redirect(settingsUrl);
    }

    const admin = createAdminClient();
    await admin.from('connectors_account').upsert(
      {
        user_id: user.id,
        provider,
        encrypted_credentials: encodeCredentials(credentials),
        status: 'connected',
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' },
    );

    settingsUrl.searchParams.set('connected', provider);
    return NextResponse.redirect(settingsUrl);
  } catch {
    settingsUrl.searchParams.set('error', 'token_exchange_failed');
    return NextResponse.redirect(settingsUrl);
  }
}

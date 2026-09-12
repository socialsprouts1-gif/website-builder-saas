import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildConnectorCards } from '@/lib/connectors/registry';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * Every connector, with this account's connection state.
 *
 * The Connectors page gets this on the server; the chat needs it in the browser
 * the moment someone says "connect Stripe", which is what this is for. It
 * returns descriptions and status only — never a stored credential.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const projectId = request.nextUrl.searchParams.get('projectId') ?? undefined;

    // A project id is only honoured when the caller owns the project; RLS on
    // this select is what proves it.
    let owned: string | undefined;
    if (projectId) {
      const { data } = await supabase.from('projects').select('id').eq('id', projectId).maybeSingle();
      owned = data?.id ?? undefined;
    }

    const [account, project] = await Promise.all([
      buildConnectorCards({ userId: user.id, scope: 'account' }),
      owned
        ? buildConnectorCards({ userId: user.id, scope: 'project', projectId: owned })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({ cards: [...account, ...project] });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

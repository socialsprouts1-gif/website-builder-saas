import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptSecret, last4Of } from '@/lib/crypto';
import { getKeyStatus, validateKey } from '@/lib/openai/client';
import { apiKeySchema } from '@/lib/validation';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);
    return NextResponse.json(await getKeyStatus(user.id));
  } catch (cause) {
    return handleRouteError(cause);
  }
}

/**
 * Stores a user's own OpenAI key.
 *
 * The key is validated with one cheap /v1/models call before it is saved,
 * encrypted at rest with AES-256-GCM, and never logged or returned to the
 * client — only its last four characters ever leave the server.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const { key } = apiKeySchema.parse(await request.json());

    const validation = await validateKey(key);
    if (!validation.ok) return jsonError(validation.error, 422);

    const admin = createAdminClient();
    // Deactivate any previous key first so the partial unique index stays happy
    // and revoking is genuinely one action.
    await admin.from('api_keys').update({ is_active: false }).eq('user_id', user.id).eq('provider', 'openai');

    const { error } = await admin.from('api_keys').insert({
      user_id: user.id,
      provider: 'openai',
      encrypted_key: encryptSecret(key),
      last4: last4Of(key),
      is_active: true,
      validated_at: new Date().toISOString(),
    });
    if (error) return jsonError(error.message, 500);

    return NextResponse.json({ saved: true, last4: last4Of(key), modelCount: validation.modelCount });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const admin = createAdminClient();
    await admin.from('api_keys').delete().eq('user_id', user.id).eq('provider', 'openai');
    return NextResponse.json({ revoked: true });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

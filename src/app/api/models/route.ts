import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveApiKeyForMetadata } from '@/lib/openai/client';
import { fallbackCatalog, getModelCatalog } from '@/lib/openai/models';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * The live model list, bucketed into Best quality / Fast & cheap / Custom.
 * Fetched from OpenAI at request time and cached for an hour — never a
 * hardcoded dropdown (spec Section 6).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const resolved = await resolveApiKeyForMetadata(user.id);
    if (resolved) {
      const catalog = await getModelCatalog(resolved.apiKey);
      return NextResponse.json({ ...catalog, keySource: resolved.source });
    }
    {
      // No usable key: still return the seed catalog so the UI renders, flagged
      // stale so it can say why.
      return NextResponse.json({ ...fallbackCatalog(true), keySource: null });
    }
  } catch (cause) {
    return handleRouteError(cause);
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { openaiFor, resolveApiKey } from '@/lib/openai/client';
import { getModelCatalog } from '@/lib/openai/models';
import { recordUsage } from '@/lib/usage';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

/**
 * Voice input. The clip is streamed straight to the transcription model and the
 * text returned — raw audio is never written to storage (spec Section 8).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const limit = await rateLimit(
      `transcribe:${user.id}`,
      RATE_LIMITS.transcription.limit,
      RATE_LIMITS.transcription.windowSeconds,
    );
    if (!limit.allowed) return jsonError('Too many recordings in a row. Give it a minute.', 429);

    const form = await request.formData();
    const audio = form.get('audio');
    if (!(audio instanceof File)) return jsonError('No audio received', 422);
    if (audio.size === 0) return jsonError('That recording was empty', 422);
    if (audio.size > MAX_AUDIO_BYTES) return jsonError('That recording is too long', 413);

    const { apiKey, source } = await resolveApiKey(user.id, 'transcription');
    const catalog = await getModelCatalog(apiKey);
    const client = openaiFor(apiKey);

    const transcription = await client.audio.transcriptions.create({
      file: audio,
      model: catalog.transcription,
    });

    await recordUsage({
      userId: user.id,
      eventType: 'transcription',
      model: catalog.transcription,
      keySource: source,
    });

    return NextResponse.json({ text: transcription.text });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

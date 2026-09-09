import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { openaiFor, resolveApiKey } from '@/lib/openai/client';
import { getModelCatalog } from '@/lib/openai/models';
import { recordUsage } from '@/lib/usage';
import { RATE_LIMITS, rateLimitUser } from '@/lib/rate-limit';
import { handleRouteError, jsonError } from '@/lib/api';
import { AUTO_DETECT, normaliseLanguage } from '@/lib/languages';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

/**
 * Below roughly a quarter-second there is nothing to transcribe, and a clip
 * that short is exactly what makes these models invent a sentence — often in
 * the wrong language. A tap on the mic is not a recording.
 */
const MIN_AUDIO_BYTES = 1_200;

/**
 * Steers the transcript toward the vocabulary this box is for. Whisper-family
 * models weight the opening context heavily, which also anchors the language
 * when one has not been named.
 */
const CONTEXT_PROMPT =
  'A small business owner describing the website they want: the trade, the sections, the pages, the colours, the booking or ordering they need.';

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

    const limit = await rateLimitUser(
      user.id,
      `transcribe:${user.id}`,
      RATE_LIMITS.transcription.limit,
      RATE_LIMITS.transcription.windowSeconds,
    );
    if (!limit.allowed) return jsonError('Too many recordings in a row. Give it a minute.', 429);

    const form = await request.formData();
    const audio = form.get('audio');
    if (!(audio instanceof File)) return jsonError('No audio received', 422);
    if (audio.size === 0) return jsonError('That recording was empty', 422);
    if (audio.size < MIN_AUDIO_BYTES) return jsonError('That was too short — hold the mic and speak.', 422);
    if (audio.size > MAX_AUDIO_BYTES) return jsonError('That recording is too long', 413);

    // Unrecognised values land on English rather than on auto-detect: guessing
    // is what produced transcripts in scripts the speaker could not read.
    const language = normaliseLanguage(form.get('language'));

    const { apiKey, source } = await resolveApiKey(user.id, 'transcription');
    const catalog = await getModelCatalog(apiKey);
    const client = openaiFor(apiKey);

    const transcription = await client.audio.transcriptions.create({
      file: audio,
      model: catalog.transcription,
      prompt: CONTEXT_PROMPT,
      ...(language === AUTO_DETECT ? {} : { language }),
    });

    await recordUsage({
      userId: user.id,
      eventType: 'transcription',
      model: catalog.transcription,
      keySource: source,
    });

    return NextResponse.json({ text: transcription.text, language: language || 'auto' });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

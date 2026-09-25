import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { openaiFor, resolveApiKey } from '@/lib/openai/client';
import { getModelCatalog } from '@/lib/openai/models';
import { recordUsage } from '@/lib/usage';
import { RATE_LIMITS, rateLimitUser } from '@/lib/rate-limit';
import { handleRouteError, jsonError } from '@/lib/api';
import {
  INTERVIEW_SYSTEM,
  buildInterviewPrompt,
  normaliseQuestions,
} from '@/lib/generation/interview';
import { MAX_BRIEF } from '@/lib/validation';
import { sectionBrief } from '@/lib/generation/brief';
import { blueprintById } from '@/lib/templates';
import { blueprintInterview } from '@/lib/templates/interview';

export const runtime = 'nodejs';
export const maxDuration = 45;

/**
 * The same ceiling the brief itself has.
 *
 * This is the first endpoint the new-site screen calls — Continue asks for the
 * questions before anything is built — so its own, lower limit was the one
 * people actually hit. Raising the brief and leaving this at two thousand
 * meant a long brief was still refused, just by a different route, with an
 * error that named a number nothing on screen explained.
 */
const bodySchema = z.object({
  prompt: z.string().trim().min(3).max(MAX_BRIEF),
  category: z.string().max(64).nullable().optional(),
  hasScreenshot: z.boolean().optional(),
  /**
   * The template they picked, if they came in from the library.
   *
   * It changes what there is to ask: the pages, the sections and the design are
   * all settled, so the questions become entirely about the facts those
   * particular sections need somebody to supply.
   */
  blueprint: z.string().max(64).nullable().optional(),
});

/**
 * Writes the questions to ask before building. Runs on the fast model and is
 * not charged: it exists to make the one generation the user does pay for
 * land closer to what they wanted.
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
      `interview:${user.id}`,
      RATE_LIMITS.chatEdit.limit,
      RATE_LIMITS.chatEdit.windowSeconds,
    );
    if (!limit.allowed) return jsonError('Slow down a moment.', 429);

    const body = bodySchema.parse(await request.json());
    // Only a template that exists. An unknown id has to fall back to the
    // ordinary interview rather than describe a site nobody is getting.
    const blueprint = blueprintById(body.blueprint);

    const { apiKey, source } = await resolveApiKey(user.id, 'interview');
    const catalog = await getModelCatalog(apiKey);
    const model = catalog.fast?.id ?? catalog.quality?.id;
    if (!model) return jsonError('No model available to plan the questions.', 503);

    const response = await openaiFor(apiKey).chat.completions.create({
      model,
      messages: [
        { role: 'system', content: INTERVIEW_SYSTEM },
        {
          role: 'user',
          content: buildInterviewPrompt({
            // The gist is enough to decide what to ask about, and this runs on
            // the fast model at no charge — sending twenty thousand characters
            // to it would cost more than the build it is meant to improve.
            prompt: sectionBrief(body.prompt),
            businessType: body.category,
            hasScreenshot: Boolean(body.hasScreenshot),
            template: blueprint ? blueprintInterview(blueprint) : null,
          }),
        },
      ],
      response_format: { type: 'json_object' },
    });

    await recordUsage({
      userId: user.id,
      eventType: 'interview',
      model,
      keySource: source,
      tokensIn: response.usage?.prompt_tokens,
      tokensOut: response.usage?.completion_tokens,
    });

    let parsed: unknown = {};
    try {
      parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}');
    } catch {
      // A malformed reply means no questions, which the client treats as
      // "nothing to ask" and goes straight to building.
    }

    return NextResponse.json({ questions: normaliseQuestions(parsed) });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

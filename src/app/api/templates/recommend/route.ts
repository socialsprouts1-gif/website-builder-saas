import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError } from '@/lib/api';
import { MAX_BRIEF } from '@/lib/validation';
import { blueprintCard, detectIndustry, industryBySlug, recommendBlueprints } from '@/lib/templates';

export const runtime = 'nodejs';

const schema = z.object({ prompt: z.string().trim().max(MAX_BRIEF) });

/**
 * Three templates for what somebody typed.
 *
 * No model call: the industry is detected from words, and the templates for it
 * are data. A recommendation that costs a generation would be a recommendation
 * nobody could afford to look at twice, and this is the step that used to be
 * "the model invents a structure" — the thing being replaced.
 */
export async function POST(request: Request) {
  try {
    const { prompt } = schema.parse(await request.json());
    const industry = detectIndustry(prompt);

    return NextResponse.json({
      industry,
      industryLabel: industry ? (industryBySlug(industry)?.label ?? null) : null,
      templates: recommendBlueprints(prompt).map(blueprintCard),
    });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

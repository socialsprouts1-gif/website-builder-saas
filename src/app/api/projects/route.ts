import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createProjectSchema } from '@/lib/validation';
import { handleRouteError, jsonError } from '@/lib/api';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { uploadAsset } from '@/lib/generation/storage';
import { categoryBySlug } from '@/lib/categories';

export const runtime = 'nodejs';

/**
 * Creates the project row and a queued generation job. The work itself runs on
 * /api/generate/[jobId]/stream so the client sees progress token-by-token
 * rather than waiting on a blocking request.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    // Email verification gates the first generation — it is what stops throwaway
    // accounts from draining the free platform-key quota (spec Section 13).
    if (!user.email_confirmed_at) {
      return jsonError('Confirm your email address before generating your first site.', 403);
    }

    const limit = await rateLimit(
      `generation:${user.id}`,
      RATE_LIMITS.generation.limit,
      RATE_LIMITS.generation.windowSeconds,
    );
    if (!limit.allowed) {
      return jsonError('You are generating very fast. Try again in a little while.', 429);
    }

    const body = createProjectSchema.parse(await request.json());
    const category = categoryBySlug(body.category);

    const admin = createAdminClient();
    const { data: project, error: projectError } = await admin
      .from('projects')
      .insert({
        user_id: user.id,
        name: 'Untitled site',
        slug: `site-${Date.now().toString(36)}`,
        business_type: category?.label ?? body.category ?? null,
        status: 'generating',
        model: body.model ?? null,
      })
      .select('id')
      .single();

    if (projectError || !project) return jsonError(projectError?.message ?? 'Could not create project', 500);

    let screenshotUrl: string | null = null;
    if (body.screenshotDataUrl) {
      const [meta, base64] = body.screenshotDataUrl.split(',');
      const contentType = meta.slice(5, meta.indexOf(';'));
      const buffer = Buffer.from(base64, 'base64');
      try {
        screenshotUrl = await uploadAsset({
          projectId: project.id,
          fileName: `reference.${contentType.split('/')[1] ?? 'png'}`,
          body: buffer,
          contentType,
        });
      } catch {
        // Storage bucket missing or unreachable — keep the data URL inline so
        // the generation still works rather than failing the whole request.
        screenshotUrl = body.screenshotDataUrl;
      }
    }

    const { data: job, error: jobError } = await admin
      .from('generation_jobs')
      .insert({
        project_id: project.id,
        user_id: user.id,
        status: 'queued',
        stage: 'queued',
        input_mode: body.inputMode,
        prompt_text: body.prompt,
        screenshot_url: screenshotUrl,
        model_used: body.model ?? null,
      })
      .select('id')
      .single();

    if (jobError || !job) return jsonError(jobError?.message ?? 'Could not queue generation', 500);

    await admin.from('chat_messages').insert({
      project_id: project.id,
      role: 'user',
      content: body.prompt,
    });

    return NextResponse.json({ projectId: project.id, jobId: job.id });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

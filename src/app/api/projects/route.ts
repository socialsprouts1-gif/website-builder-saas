import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createProjectSchema } from '@/lib/validation';
import { handleRouteError, jsonError } from '@/lib/api';
import { RATE_LIMITS, rateLimitUser } from '@/lib/rate-limit';
import { uploadAsset } from '@/lib/generation/storage';
import { categoryBySlug } from '@/lib/categories';
import { SchemaNotInstalledError, isMissingTableError } from '@/lib/supabase/errors';
import { getAllowance } from '@/lib/allowance';
import { ensureUserProfile } from '@/lib/profile';
import { applyAnswers, whatsappFromAnswers } from '@/lib/generation/interview';
import { normaliseWhatsApp } from '@/lib/whatsapp';
import { OWN_MATERIAL_MARK } from '@/lib/generation/prompts';
import { lookupPlace } from '@/lib/google/places';
import { blueprintById } from '@/lib/templates';
import { detailsBrief } from '@/lib/templates/details';
import { seedFromPlace } from '@/lib/google/seed';

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
    // accounts from draining the shared key. Admins are exempt.
    const allowance = await getAllowance(user.id);
    if (!user.email_confirmed_at && !allowance.unlimited) {
      return jsonError('Confirm your email address before generating your first site.', 403);
    }


    const limit = await rateLimitUser(
      user.id,
      `generation:${user.id}`,
      RATE_LIMITS.generation.limit,
      RATE_LIMITS.generation.windowSeconds,
    );
    if (!limit.allowed) {
      return jsonError('You are generating very fast. Try again in a little while.', 429);
    }

    const body = createProjectSchema.parse(await request.json());
    const category = categoryBySlug(body.category);

    // The interview answers become part of the brief rather than a separate
    // input, so every downstream stage sees them without changing shape.
    let brief = applyAnswers(body.prompt, body.answers ?? []);

    // A template chosen from the library. Only an id that exists is kept: the
    // structure of the site hangs off this, so a typo has to degrade to the old
    // behaviour rather than to a site with no pages.
    const blueprint = blueprintById(body.blueprint);

    // The business details form, read as facts rather than as a prompt. It goes
    // in front of whatever was typed, because it is the more reliable half.
    if (body.details) {
      const facts = detailsBrief(body.details);
      brief = brief.trim() ? `${facts}\n\n${brief}` : facts;
    }

    // Except the WhatsApp number, which is a setting rather than a sentence.
    // Folding it only into the brief would put it in the page's copy and
    // nowhere the product could use it, so it is read out here and saved.
    const whatsapp = body.details?.whatsapp?.trim() || whatsappFromAnswers(body.answers ?? []);

    // Their own visiting card is the fastest way they will ever give us their
    // phone number; someone else's website is not theirs to copy. Which of the
    // two it is decides whether the details read off the image get used, and
    // only the person uploading it knows.
    if (body.screenshotIsOwn && body.screenshotDataUrl) brief = `${brief}\n\n${OWN_MATERIAL_MARK}`;

    // A logo and photographs are only useful if the brief says what they are.
    // Every section is written from this text, so naming them here is what puts
    // the owner's own pictures in the page instead of stock ones.
    const assets = body.assets;
    if (assets) {
      const lines: string[] = [];
      if (assets.logoUrl) {
        lines.push(`The business's logo, to go in the site header, linked as-is: ${assets.logoUrl}`);
      }
      if (assets.imageUrls?.length) {
        lines.push(
          `Photographs of this business, to use across the pages rather than stock imagery, linked as-is:\n${assets.imageUrls
            .map((url) => `- ${url}`)
            .join('\n')}`,
        );
      }
      if (assets.videoUrls?.length) {
        lines.push(
          `Videos to embed in <video> tags, linked as-is:\n${assets.videoUrls
            .map((url) => `- ${url}`)
            .join('\n')}`,
        );
      }
      if (assets.referenceUrls?.length) {
        lines.push(`Sites to match the look and layout of: ${assets.referenceUrls.join(', ')}`);
      }
      if (lines.length > 0) brief = `${brief}\n\n${lines.join('\n\n')}`;
    }

    // projects.user_id references public.users; make sure that row exists
    // before inserting, rather than failing on the constraint.
    await ensureUserProfile({
      id: user.id,
      email: user.email ?? '',
      fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    });

    const admin = createAdminClient();
    const { data: project, error: projectError } = await admin
      .from('projects')
      .insert({
        user_id: user.id,
        name: 'Untitled site',
        slug: `site-${Date.now().toString(36)}`,
        business_type: body.details?.businessType ?? category?.label ?? body.category ?? null,
        status: 'generating',
        model: body.model ?? null,
        ...(blueprint ? { blueprint_id: blueprint.id } : {}),
      })
      .select('id')
      .single();

    if (projectError || !project) {
      if (isMissingTableError(projectError)) throw new SchemaNotInstalledError();
      return jsonError(projectError?.message ?? 'Could not create project', 500);
    }

    // Set now rather than after the build, so the very first enquiry or order
    // has somewhere to go. Allowed to fail quietly: these columns arrive in
    // migration 0013 and a site is still worth building without them.
    if (whatsapp) {
      const number = normaliseWhatsApp(whatsapp);
      if (number) {
        await admin
          .from('projects')
          .update({ whatsapp_number: number, whatsapp_leads: true })
          .eq('id', project.id);
      }
    }

    // A Google listing is resolved and imported here, before the job is queued,
    // so the build starts from real facts and real photographs rather than
    // inventing a business that already exists.
    if (body.inputMode === 'google' && body.googleUrl) {
      const found = await lookupPlace(body.googleUrl, user.id);
      if (!found) {
        await admin.from('projects').delete().eq('id', project.id);
        return jsonError('That Google listing could not be read. Check the link and try again.', 422);
      }

      // Anything the owner typed on the confirmation screen wins. Reading a
      // listing off the page does not always find a phone number or the full
      // address, and a corrected fact beats a missing one every time.
      const fixes = body.googleFixes ?? {};
      const place = {
        ...found,
        name: fixes.name?.trim() || found.name,
        address: fixes.address?.trim() || found.address,
        phone: fixes.phone?.trim() || found.phone,
        website: fixes.website?.trim() || found.website,
      };

      const seeded = await seedFromPlace(project.id, place);
      brief = `${brief}\n\n${seeded.brief}`;

      await admin
        .from('projects')
        .update({ name: place.name, description: place.summary ?? place.category })
        .eq('id', project.id);
    }

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
        // generation_input_mode has no 'google' value, and adding one would
        // mean another migration for something nothing downstream reads. The
        // listing's facts are in the brief, which is what actually matters.
        input_mode: body.inputMode === 'google' ? 'prompt' : body.inputMode,
        prompt_text: brief,
        ...(blueprint ? { blueprint_id: blueprint.id } : {}),
        screenshot_url: screenshotUrl,
        model_used: body.model ?? null,
      })
      .select('id')
      .single();

    if (jobError || !job) return jsonError(jobError?.message ?? 'Could not queue generation', 500);

    // The log shows what the person actually said, then what they answered —
    // reading back the merged brief as if they had typed it would be a lie.
    const messages = [{ project_id: project.id, role: 'user', content: body.prompt }];
    if (body.answers?.length) {
      messages.push({
        project_id: project.id,
        role: 'user',
        content: body.answers
          .filter((entry) => entry.answer.trim())
          .map((entry) => `${entry.question} → ${entry.answer.trim()}`)
          .join('\n'),
      });
    }
    await admin.from('chat_messages').insert(messages);

    return NextResponse.json({ projectId: project.id, jobId: job.id });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

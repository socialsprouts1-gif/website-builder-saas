import 'server-only';
import { openaiFor, resolveApiKey, type KeySource } from '@/lib/openai/client';
import { getModelCatalog, resolveModel } from '@/lib/openai/models';
import { recordUsage } from '@/lib/usage';
import { createAdminClient } from '@/lib/supabase/admin';
import type { GenerationJobRow } from '@/lib/database.types';
import { StreamingFileParser, mergeFiles } from './parser';
import {
  EDIT_SYSTEM,
  PLAN_SYSTEM,
  VISION_SYSTEM,
  buildBriefPrompt,
  buildEditPrompt,
  buildPagePrompt,
  buildShellPrompt,
  staticSiteFiles,
} from './prompts';
import { createVersion, getCurrentFiles } from './storage';
import type {
  DesignSystem,
  GenerationEvent,
  ScreenshotExtraction,
  SiteBrief,
  SiteFile,
} from './types';

type Emit = (event: GenerationEvent) => void | Promise<void>;

const CODE_AUTHOR =
  'You are Lumen: a senior front-end engineer and a designer with taste, building the finished website a small business will actually put its name on. You write the whole thing by hand in HTML and CSS, and you care as much about how it looks as whether it works. Wireframes, placeholder boxes and flat centred text are failures.';

/**
 * The homepage's <nav>, handed to the other pages so they reproduce it rather
 * than inventing their own. Falls back to empty, which simply means each page
 * writes its own nav from the brief's page list.
 */
function extractNav(html: string): string {
  const match = html.match(/<nav[\s\S]*?<\/nav>/i);
  return match ? match[0] : '';
}

/** Small helper so a malformed JSON response degrades into a clear error. */
function parseJson<T>(raw: string, what: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        /* fall through */
      }
    }
    throw new Error(`The model returned an unreadable ${what}. Try again, or switch model.`);
  }
}

type JobPatch = Partial<GenerationJobRow>;

async function updateJob(jobId: string, patch: JobPatch) {
  const supabase = createAdminClient();
  await supabase.from('generation_jobs').update(patch).eq('id', jobId);
}

export interface GenerationInput {
  jobId: string;
  projectId: string;
  userId: string;
  prompt: string;
  businessType?: string | null;
  screenshotDataUrl?: string | null;
  requestedModel?: string | null;
  inputMode: 'prompt' | 'screenshot' | 'voice' | 'template';
}

/**
 * The one generation pipeline. Prompt mode, voice mode and screenshot mode all
 * converge here — screenshot input just adds a vision extraction step in front
 * (spec Section 5), so editing behaves identically afterwards whatever the
 * original input mode was.
 */
export async function runGeneration(input: GenerationInput, emit: Emit): Promise<void> {
  // Screenshot mode runs an extra vision pass, so it reserves that credit too.
  const { apiKey, source } = await resolveApiKey(
    input.userId,
    input.screenshotDataUrl ? 'vision' : 'generation',
  );
  const catalog = await getModelCatalog(apiKey);
  const { model, substituted } = resolveModel(catalog, input.requestedModel);
  const client = openaiFor(apiKey);

  await emit({ type: 'meta', model, substituted });
  await updateJob(input.jobId, { status: 'running', model_used: model, stage: 'brief' });

  let tokensIn = 0;
  let tokensOut = 0;

  try {
    // --- 0. Optional vision pass for screenshot mode -------------------------
    let extraction: ScreenshotExtraction | null = null;
    if (input.screenshotDataUrl) {
      await emit({ type: 'stage', stage: 'brief', message: 'Reading your screenshot…' });
      const vision = await client.chat.completions.create({
        model: catalog.vision,
        messages: [
          { role: 'system', content: VISION_SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract the structure of this page.' },
              { type: 'image_url', image_url: { url: input.screenshotDataUrl, detail: 'high' } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      });
      tokensIn += vision.usage?.prompt_tokens ?? 0;
      tokensOut += vision.usage?.completion_tokens ?? 0;
      extraction = parseJson<ScreenshotExtraction>(
        vision.choices[0]?.message?.content ?? '',
        'screenshot analysis',
      );
      await recordUsage({
        userId: input.userId,
        projectId: input.projectId,
        eventType: 'vision',
        model: catalog.vision,
        keySource: source,
        tokensIn: vision.usage?.prompt_tokens,
        tokensOut: vision.usage?.completion_tokens,
      });
    }

    // --- 1. Plan ------------------------------------------------------------
    // Brief and design system in one request, on the fast model. They are
    // planning steps producing a page of JSON, and the big model bought
    // nothing here except two more waits.
    await emit({ type: 'stage', stage: 'brief', message: 'Planning your site…' });
    const planModel = catalog.fast?.id ?? model;
    const planResponse = await client.chat.completions.create({
      model: planModel,
      messages: [
        { role: 'system', content: PLAN_SYSTEM },
        {
          role: 'user',
          content: buildBriefPrompt({
            prompt: input.prompt,
            businessType: input.businessType,
            extraction,
          }),
        },
      ],
      response_format: { type: 'json_object' },
    });
    tokensIn += planResponse.usage?.prompt_tokens ?? 0;
    tokensOut += planResponse.usage?.completion_tokens ?? 0;

    const plan = parseJson<{ brief: SiteBrief; design: DesignSystem }>(
      planResponse.choices[0]?.message?.content ?? '',
      'site plan',
    );
    const brief = plan.brief;
    const design = plan.design;
    if (!brief?.pages?.length) throw new Error('The model returned a plan with no pages. Try again.');

    await emit({
      type: 'stage',
      stage: 'design',
      message: `Designing ${brief.businessName}…`,
      expected: brief.pages.length + 2,
    });

    // --- 2. Shell: the stylesheet, the homepage, the script -----------------
    await emit({ type: 'stage', stage: 'code', message: 'Writing the homepage…' });
    await updateJob(input.jobId, { stage: 'code' });

    const write = async (prompt: string) => {
      const parser = new StreamingFileParser(
        (path) => void emit({ type: 'file', path, message: `Writing ${path}` }),
      );
      const stream = await client.chat.completions.create({
        model,
        stream: true,
        stream_options: { include_usage: true },
        messages: [
          { role: 'system', content: CODE_AUTHOR },
          { role: 'user', content: prompt },
        ],
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) parser.push(delta);
        if (chunk.usage) {
          tokensIn += chunk.usage.prompt_tokens ?? 0;
          tokensOut += chunk.usage.completion_tokens ?? 0;
        }
      }
      return parser.finish();
    };

    const shell = await write(buildShellPrompt(brief, design));
    if (shell.length === 0) throw new Error('The model produced no files. Try again, or switch model.');

    // --- 3. The rest of the pages, all at once ------------------------------
    const rest = brief.pages.slice(1);
    let extraPages: SiteFile[] = [];

    if (rest.length > 0) {
      await emit({
        type: 'stage',
        stage: 'code',
        message: rest.length === 1 ? 'Writing the last page…' : `Writing ${rest.length} more pages…`,
      });

      const styles = shell.find((file) => file.path.endsWith('.css'))?.content ?? '';
      const nav = extractNav(shell.find((file) => file.path === 'index.html')?.content ?? '');

      // Concurrent on purpose: the wait becomes the slowest page rather than
      // the sum of all of them. One page failing does not lose the others.
      const results = await Promise.allSettled(
        rest.map((page) => write(buildPagePrompt({ brief, design, page, styles, nav }))),
      );
      extraPages = results.flatMap((result) =>
        result.status === 'fulfilled' ? result.value : [],
      );
    }

    const files = mergeFiles(shell, [...extraPages, ...staticSiteFiles(brief)]);
    if (files.length === 0) throw new Error('The model produced no files. Try again, or switch model.');

    // --- 4. Persist ---------------------------------------------------------
    await emit({ type: 'stage', stage: 'persist', message: 'Saving your site…' });
    const version = await createVersion({
      projectId: input.projectId,
      files,
      source: input.inputMode === 'screenshot' ? 'screenshot' : 'initial',
      designSystem: design,
    });

    const supabase = createAdminClient();
    await supabase
      .from('projects')
      .update({
        name: brief.businessName,
        description: brief.tagline,
        business_type: brief.businessType,
        model,
      })
      .eq('id', input.projectId);

    await supabase.from('chat_messages').insert({
      project_id: input.projectId,
      role: 'assistant',
      content: `Built **${brief.businessName}** — ${brief.pages.length} pages (${brief.pages
        .map((page) => page.title)
        .join(', ')}). Tell me what to change.`,
      version_id: version.id,
    });

    await recordUsage({
      userId: input.userId,
      projectId: input.projectId,
      eventType: 'generation',
      model,
      keySource: source,
      tokensIn,
      tokensOut,
    });

    await updateJob(input.jobId, {
      status: 'succeeded',
      stage: 'done',
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      completed_at: new Date().toISOString(),
    });

    await emit({ type: 'done', stage: 'done', versionId: version.id, projectId: input.projectId });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Generation failed';
    await updateJob(input.jobId, {
      status: 'failed',
      stage: 'failed',
      error: message,
      completed_at: new Date().toISOString(),
    });
    const supabase = createAdminClient();
    await supabase.from('projects').update({ status: 'failed' }).eq('id', input.projectId);
    await emit({ type: 'error', stage: 'failed', message });
  }
}

export interface EditResult {
  versionId: string;
  changedPaths: string[];
  model: string;
  keySource: KeySource;
}

/**
 * Chat iteration. Applies a diff-style edit against current files so earlier
 * customisations survive — never a full regeneration (spec Section 4).
 */
export async function runChatEdit(params: {
  projectId: string;
  userId: string;
  request: string;
  requestedModel?: string | null;
  source?: 'chat' | 'voice';
  onDelta?: (delta: string) => void;
}): Promise<EditResult> {
  const { apiKey, source: keySource } = await resolveApiKey(params.userId, 'chat_edit');
  const catalog = await getModelCatalog(apiKey);
  const { model } = resolveModel(catalog, params.requestedModel);
  const client = openaiFor(apiKey);
  const supabase = createAdminClient();

  const existing = await getCurrentFiles(params.projectId);
  if (existing.length === 0) throw new Error('This project has no generated files yet.');

  const { data: project } = await supabase
    .from('projects')
    .select('design_system')
    .eq('id', params.projectId)
    .maybeSingle();

  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: true })
    .limit(20);

  const stream = await client.chat.completions.create({
    model,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      { role: 'system', content: EDIT_SYSTEM },
      {
        role: 'user',
        content: buildEditPrompt({
          request: params.request,
          files: existing,
          design: (project?.design_system as DesignSystem | null) ?? null,
          history: history ?? [],
        }),
      },
    ],
  });

  const parser = new StreamingFileParser();
  let tokensIn = 0;
  let tokensOut = 0;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      parser.push(delta);
      params.onDelta?.(delta);
    }
    if (chunk.usage) {
      tokensIn += chunk.usage.prompt_tokens ?? 0;
      tokensOut += chunk.usage.completion_tokens ?? 0;
    }
  }

  const changed = parser.finish();
  if (changed.length === 0) throw new Error('No changes came back. Try rephrasing the request.');

  const merged = mergeFiles(existing, changed);
  const version = await createVersion({
    projectId: params.projectId,
    files: merged,
    source: params.source === 'voice' ? 'voice' : 'chat',
  });

  await recordUsage({
    userId: params.userId,
    projectId: params.projectId,
    eventType: 'chat_edit',
    model,
    keySource,
    tokensIn,
    tokensOut,
  });

  return {
    versionId: version.id,
    changedPaths: changed.map((file) => file.path),
    model,
    keySource,
  };
}

export type { SiteFile };

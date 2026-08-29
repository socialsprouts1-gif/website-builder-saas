import 'server-only';
import { openaiFor, resolveApiKey, type KeySource } from '@/lib/openai/client';
import { getModelCatalog, resolveModel } from '@/lib/openai/models';
import { recordUsage } from '@/lib/usage';
import { createAdminClient } from '@/lib/supabase/admin';
import type { GenerationJobRow } from '@/lib/database.types';
import { StreamingFileParser, mergeFiles } from './parser';
import {
  BRIEF_SYSTEM,
  DESIGN_SYSTEM_PROMPT,
  EDIT_SYSTEM,
  VISION_SYSTEM,
  buildBriefPrompt,
  buildCodePrompt,
  buildDesignPrompt,
  buildEditPrompt,
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
  const { apiKey, source } = await resolveApiKey(input.userId);
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

    // --- 1. Brief -----------------------------------------------------------
    await emit({ type: 'stage', stage: 'brief', message: 'Planning your site…' });
    const briefResponse = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: BRIEF_SYSTEM },
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
    tokensIn += briefResponse.usage?.prompt_tokens ?? 0;
    tokensOut += briefResponse.usage?.completion_tokens ?? 0;
    const brief = parseJson<SiteBrief>(briefResponse.choices[0]?.message?.content ?? '', 'site brief');
    await emit({ type: 'stage', stage: 'design', message: `Designing ${brief.businessName}…` });

    // --- 2. Per-project design system ---------------------------------------
    const designResponse = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: DESIGN_SYSTEM_PROMPT },
        { role: 'user', content: buildDesignPrompt(brief) },
      ],
      response_format: { type: 'json_object' },
    });
    tokensIn += designResponse.usage?.prompt_tokens ?? 0;
    tokensOut += designResponse.usage?.completion_tokens ?? 0;
    const design = parseJson<DesignSystem>(
      designResponse.choices[0]?.message?.content ?? '',
      'design system',
    );

    // --- 3. Code ------------------------------------------------------------
    await emit({ type: 'stage', stage: 'code', message: 'Writing the code…' });
    await updateJob(input.jobId, { stage: 'code' });

    const parser = new StreamingFileParser(
      (path) => void emit({ type: 'file', path, message: `Writing ${path}` }),
    );

    const stream = await client.chat.completions.create({
      model,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: 'system', content: 'You are Lumen, a senior front-end engineer who ships complete, production-grade static websites.' },
        { role: 'user', content: buildCodePrompt(brief, design) },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        parser.push(delta);
        await emit({ type: 'token', delta });
      }
      if (chunk.usage) {
        tokensIn += chunk.usage.prompt_tokens ?? 0;
        tokensOut += chunk.usage.completion_tokens ?? 0;
      }
    }

    const files = parser.finish();
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
  const { apiKey, source: keySource } = await resolveApiKey(params.userId);
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

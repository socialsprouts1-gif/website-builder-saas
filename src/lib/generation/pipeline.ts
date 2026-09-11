import 'server-only';
import { openaiFor, resolveApiKey, type KeySource } from '@/lib/openai/client';
import { getModelCatalog, resolveModel } from '@/lib/openai/models';
import { recordUsage } from '@/lib/usage';
import { callWithRetry } from '@/lib/openai/retry';
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
  buildStylesPrompt,
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
/**
 * A build in progress, small enough to live in the job row between steps.
 *
 * The whole build used to run in one function invocation, which meant it died
 * at the platform's ceiling — five minutes in, mid-page, with nothing saved.
 * It is now four steps, each its own invocation with its own full budget, and
 * this is what one hands the next.
 */
export interface BuildState {
  plan?: { brief: SiteBrief; design: DesignSystem };
  /** Files written so far, carried forward until the last step saves them. */
  draft?: SiteFile[];
  /** Page paths still to write. */
  pending?: string[];
}

export type BuildStep = 'plan' | 'styles' | 'pages' | 'persist';

export interface StepOutcome {
  state: BuildState;
  /** The step to run next, or null when the site is finished. */
  next: BuildStep | null;
  stage: 'brief' | 'design' | 'code' | 'persist' | 'done';
  message: string;
  expected?: number;
  versionId?: string;
}

/** Which step to run, decided entirely by what the state already contains. */
export function nextStep(state: BuildState): BuildStep {
  if (!state.plan) return 'plan';
  if (!state.draft) return 'styles';
  if ((state.pending ?? []).length > 0) return 'pages';
  return 'persist';
}

interface StepContext {
  input: GenerationInput;
  emitFile: (path: string) => void;
  /** Says what is happening during a wait, so a retry is not a silent stall. */
  say?: (message: string) => void;
}

/** Everything a step needs from the account: a key, a catalog, a client. */
async function openSession(input: GenerationInput) {
  const { apiKey, source } = await resolveApiKey(
    input.userId,
    input.screenshotDataUrl ? 'vision' : 'generation',
  );
  const catalog = await getModelCatalog(apiKey);
  const { model, substituted } = resolveModel(catalog, input.requestedModel);
  return { apiKey, source, catalog, model, substituted, client: openaiFor(apiKey) };
}

/**
 * Runs one step and reports what should happen next.
 *
 * Throwing here is how a step fails; the caller records it against the job.
 */
export async function runBuildStep(
  step: BuildStep,
  state: BuildState,
  context: StepContext,
): Promise<StepOutcome> {
  const { input, emitFile, say } = context;

  // Every retry is announced. A throttled key waiting on its limit looks
  // exactly like a hang otherwise, which is what made a slow build unreadable.
  const onWait = (notice: { message: string; waitMs: number }) =>
    say?.(`${notice.message} (${Math.round(notice.waitMs / 1000)}s)`);
  const session = await openSession(input);
  const { client, catalog, model, source } = session;

  const spend = async (
    usage: { prompt_tokens?: number; completion_tokens?: number } | undefined,
    eventType: 'generation' | 'vision',
    usedModel: string,
  ) => {
    await recordUsage({
      userId: input.userId,
      projectId: input.projectId,
      eventType,
      model: usedModel,
      keySource: source,
      tokensIn: usage?.prompt_tokens,
      tokensOut: usage?.completion_tokens,
    });
  };

  /** One code-writing request. Files are reported as the parser finds them. */
  const write = async (prompt: string): Promise<SiteFile[]> => {
    const parser = new StreamingFileParser(emitFile);
    const stream = await callWithRetry(async () => {
      return client.chat.completions.create({
        model,
        stream: true,
        stream_options: { include_usage: true },
        messages: [
          { role: 'system', content: CODE_AUTHOR },
          { role: 'user', content: prompt },
        ],
      });
    }, onWait);

    let usage: { prompt_tokens?: number; completion_tokens?: number } | undefined;
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) parser.push(delta);
      if (chunk.usage) usage = chunk.usage;
    }
    await spend(usage, 'generation', model);
    return parser.finish();
  };

  if (step === 'plan') {
    let extraction: ScreenshotExtraction | null = null;
    const screenshot = input.screenshotDataUrl;
    if (screenshot) {
      const vision = await callWithRetry(async () => {
        return client.chat.completions.create({
          model: catalog.vision,
          messages: [
            { role: 'system', content: VISION_SYSTEM },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Extract the structure of this page.' },
                { type: 'image_url', image_url: { url: screenshot, detail: 'high' } },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        });
      }, onWait);
      await spend(vision.usage, 'vision', catalog.vision);
      extraction = parseJson<ScreenshotExtraction>(
        vision.choices[0]?.message?.content ?? '',
        'screenshot analysis',
      );
    }

    // Brief and design system in one request, on the fast model. They are
    // planning steps producing a page of JSON, and the big model bought
    // nothing here except another wait.
    const planModel = catalog.fast?.id ?? model;
    const response = await callWithRetry(async () => {
      return client.chat.completions.create({
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
    }, onWait);
    await spend(response.usage, 'generation', planModel);

    const plan = parseJson<{ brief: SiteBrief; design: DesignSystem }>(
      response.choices[0]?.message?.content ?? '',
      'site plan',
    );
    if (!plan?.brief?.pages?.length) {
      throw new Error('The model returned a plan with no pages. Try again.');
    }

    return {
      state: { plan },
      next: 'styles',
      stage: 'design',
      message: `Designing ${plan.brief.businessName}…`,
      expected: plan.brief.pages.length + 4,
    };
  }

  const plan = state.plan;
  if (!plan) throw new Error('The build lost its plan. Start it again.');

  if (step === 'styles') {
    const written = await write(buildStylesPrompt(plan.brief, plan.design));
    if (written.length === 0) {
      throw new Error('The model produced no files. Try again, or switch model.');
    }
    // Every page, homepage included, goes into the same parallel batch.
    return {
      state: { ...state, draft: written, pending: plan.brief.pages.map((page) => page.path) },
      next: 'pages',
      stage: 'code',
      message: `Writing ${plan.brief.pages.length} pages…`,
    };
  }

  if (step === 'pages') {
    const draft = state.draft ?? [];
    const pending = state.pending ?? [];
    const styles = draft.find((file) => file.path.endsWith('.css'))?.content ?? '';

    // Concurrent on purpose: the wait becomes the slowest page rather than the
    // sum of all of them. One page failing does not lose the others — it is
    // simply missing, and the site still saves.
    const results = await Promise.allSettled(
      pending.map((path) => {
        const page = plan.brief.pages.find((candidate) => candidate.path === path);
        if (!page) return Promise.resolve<SiteFile[]>([]);
        return write(buildPagePrompt({ brief: plan.brief, design: plan.design, page, styles }));
      }),
    );
    const written = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
    if (!written.some((file) => file.path === 'index.html')) {
      throw new Error('The model did not produce a homepage. Try again, or switch model.');
    }

    return {
      state: { ...state, draft: mergeFiles(draft, written), pending: [] },
      next: 'persist',
      stage: 'persist',
      message: 'Saving your site…',
    };
  }

  // persist
  const files = mergeFiles(state.draft ?? [], staticSiteFiles(plan.brief));
  if (files.length === 0) throw new Error('The model produced no files. Try again, or switch model.');

  const version = await createVersion({
    projectId: input.projectId,
    files,
    source: input.inputMode === 'screenshot' ? 'screenshot' : 'initial',
    designSystem: plan.design,
  });

  await createAdminClient()
    .from('projects')
    .update({
      name: plan.brief.businessName,
      description: plan.brief.tagline,
      business_type: plan.brief.businessType,
      model: session.model,
      design_system: plan.design as never,
      status: 'ready',
      current_version_id: version.id,
    })
    .eq('id', input.projectId);

  return {
    state: { ...state, draft: files, pending: [] },
    next: null,
    stage: 'done',
    message: 'Your site is ready.',
    versionId: version.id,
  };
}

export interface EditResult {
  versionId: string;
  changedPaths: string[];
  model: string;
  keySource: KeySource;
}

/**
 * Chat iteration. Applies a diff-style edit against current files so earlier
 * customisations survive.
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

  const stream = await callWithRetry(async () => {
    return client.chat.completions.create({
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

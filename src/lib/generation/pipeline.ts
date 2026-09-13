import 'server-only';
import { openaiFor, resolveApiKey, type KeySource } from '@/lib/openai/client';
import { getModelCatalog, resolveModel } from '@/lib/openai/models';
import { recordUsage } from '@/lib/usage';
import { callWithRetry } from '@/lib/openai/retry';
import { createAdminClient } from '@/lib/supabase/admin';
import type { GenerationJobRow } from '@/lib/database.types';
import { StreamingFileParser, mergeFiles } from './parser';
import { EDIT_SYSTEM, VISION_SYSTEM, buildBriefPrompt, buildEditPrompt, staticSiteFiles } from './prompts';
import { PLAN_SYSTEM, SECTION_SYSTEM, buildPlanPrompt, buildSectionPrompt } from './kit/prompts';
import { normaliseTokens, type DesignTokens } from './kit/tokens';
import { renderStylesheet } from './kit/stylesheet';
import { renderPage, SITE_SCRIPT, type SiteSpec } from './kit/page';
import { hasContent, parseSection } from './kit/parse';
import type { Section, SectionKind } from './kit/sections';
import { DEFAULT_VERTICAL, VERTICALS, matchVertical, type Vertical } from './verticals';
import { pageLabel } from '@/lib/pages';
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
export interface SitePlan {
  businessName: string;
  tagline: string;
  audience: string;
  seoDescription: string;
  contact: { address?: string; phone?: string; email?: string };
  tokens: DesignTokens;
  verticalSlug: string;
}

export interface BuildState {
  plan?: SitePlan;
  /** Sections written so far, keyed by "<page path>#<index>". */
  sections?: Record<string, Section>;
  /** Sections still to write, in order. */
  queue?: { page: string; index: number; kind: SectionKind }[];
  /** Whether the site has been saved and is already viewable. */
  published?: boolean;
  /** Pages already rendered into files, so a finished page is saved once. */
  savedPages?: string[];
}

export type BuildStep = 'plan' | 'section' | 'publish';

export interface StepOutcome {
  state: BuildState;
  /** The step to run next, or null when the site is finished. */
  next: BuildStep | null;
  stage: 'brief' | 'design' | 'code' | 'persist' | 'done';
  message: string;
  expected?: number;
  versionId?: string;
  /** True once the site is saved and can be viewed, build still running. */
  published?: boolean;
}

/**
 * Which step to run, decided entirely by what the state already contains.
 *
 * Sections are written one at a time. The site is published as soon as the
 * homepage's sections exist, so there is something to look at while the rest
 * of the pages fill in behind.
 */
export function nextStep(state: BuildState): BuildStep | null {
  if (!state.plan) return 'plan';

  const queue = state.queue ?? [];

  // A page is finished when every section that was queued for it has been
  // written. Saving is driven by that, not by where the queue happens to be:
  // the previous rule stopped at "published and nothing queued" and so threw
  // away every page written after the homepage. Those sections were generated,
  // paid for, and never rendered into a file, which is why a site arrived with
  // its About and Services links pointing at nothing.
  const pending = new Set(queue.map((entry) => entry.page));
  const saved = new Set(state.savedPages ?? []);
  const finished = new Set(
    Object.keys(state.sections ?? {}).map((key) => key.slice(0, key.lastIndexOf('#'))),
  );

  const unsaved = [...finished].some((page) => !pending.has(page) && !saved.has(page));

  if (queue.length === 0) return unsaved || !state.published ? 'publish' : null;
  return unsaved ? 'publish' : 'section';
}

/** The plan's sitemap, from the vertical it was matched to. */
function verticalOf(state: BuildState): Vertical {
  const slug = state.plan?.verticalSlug;
  return (slug && VERTICAL_BY_SLUG[slug]) || DEFAULT_VERTICAL;
}

const VERTICAL_BY_SLUG: Record<string, Vertical> = Object.fromEntries(
  [...VERTICALS, DEFAULT_VERTICAL].map((vertical) => [vertical.slug, vertical]),
);

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

  /** One JSON request. Everything the model returns is parsed, never rendered. */
  const ask = async (system: string, user: string): Promise<unknown> => {
    const response = await callWithRetry(async () => {
      return client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
      });
    }, onWait);
    await spend(response.usage, 'generation', model);

    try {
      return JSON.parse(response.choices[0]?.message?.content ?? '{}');
    } catch {
      return {};
    }
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

    // The sitemap comes from the vertical, not the model: what a salon site is
    // made of is knowledge, not a judgement call to be re-made every time.
    const vertical = matchVertical(`${input.businessType ?? ''} ${input.prompt}`);
    const sitemap = vertical.pages.map((page) => ({ path: page.path, title: page.title }));

    const planModel = catalog.fast?.id ?? model;
    const response = await callWithRetry(async () => {
      return client.chat.completions.create({
        model: planModel,
        messages: [
          { role: 'system', content: PLAN_SYSTEM },
          {
            role: 'user',
            content: `${buildPlanPrompt({ prompt: input.prompt, vertical, sitemap })}\n\n${buildBriefPrompt(
              { prompt: input.prompt, businessType: input.businessType, extraction },
            )}`,
          },
        ],
        response_format: { type: 'json_object' },
      });
    }, onWait);
    await spend(response.usage, 'generation', planModel);

    let raw: Record<string, unknown> = {};
    try {
      raw = JSON.parse(response.choices[0]?.message?.content ?? '{}');
    } catch {
      raw = {};
    }

    const contact = (raw.contact ?? {}) as Record<string, unknown>;
    const str = (value: unknown, fallback = '') =>
      typeof value === 'string' && value.trim() ? value.trim().slice(0, 300) : fallback;

    const plan: SitePlan = {
      businessName: str(raw.businessName, 'Your business'),
      tagline: str(raw.tagline, vertical.label),
      audience: str(raw.audience, 'Local customers'),
      seoDescription: str(raw.seoDescription, str(raw.tagline, vertical.label)),
      contact: {
        address: str(contact.address) || undefined,
        phone: str(contact.phone) || undefined,
        email: str(contact.email) || undefined,
      },
      tokens: normaliseTokens(raw.tokens),
      verticalSlug: vertical.slug,
    };

    const queue = vertical.pages.flatMap((page) =>
      page.sections.map((kind, index) => ({ page: page.path, index, kind })),
    );

    return {
      state: { plan, sections: {}, queue },
      next: 'section',
      stage: 'design',
      message: `Designing ${plan.businessName}…`,
      expected: queue.length,
    };
  }

  const plan = state.plan;
  if (!plan) throw new Error('The build lost its plan. Start it again.');
  const vertical = verticalOf(state);

  if (step === 'section') {
    const queue = state.queue ?? [];
    const job = queue[0];
    if (!job) throw new Error('Nothing left to write.');

    const page = vertical.pages.find((candidate) => candidate.path === job.page);
    const key = `${job.page}#${job.index}`;

    const content = await ask(
      SECTION_SYSTEM,
      buildSectionPrompt({
        kind: job.kind,
        business: plan.businessName,
        tagline: plan.tagline,
        audience: plan.audience,
        vertical,
        pageTitle: page?.title ?? 'Home',
        brief: input.prompt,
        sitemap: vertical.pages.map((entry) => ({ path: entry.path, title: entry.title })),
      }),
    );

    const section = parseSection(job.kind, `${job.kind}-${job.index + 1}`, content);
    const rest = queue.slice(1);
    const sections = { ...(state.sections ?? {}) };
    if (hasContent(section)) sections[key] = section;

    emitFile(`${pageLabel(job.page)} · ${job.kind}`);

    const nextState: BuildState = { ...state, sections, queue: rest };

    // What happens next is decided in exactly one place, by nextStep, so the
    // step that runs and the step the runner expects can never disagree. They
    // used to, and the disagreement is what silently ended builds one page in.
    const next = nextStep(nextState);

    return {
      state: nextState,
      next,
      stage: next === 'publish' ? 'persist' : 'code',
      message:
        next === 'publish'
          ? 'Saving what is written so far…'
          : `Writing the ${rest[0]?.kind ?? 'next'} section…`,
    };
  }

  // publish
  const { versionId, pages } = await saveSite(input, plan, vertical, state.sections ?? {});
  const nextState: BuildState = { ...state, published: true, savedPages: pages };
  const remaining = (state.queue ?? []).length;

  return {
    state: nextState,
    next: nextStep(nextState),
    stage: remaining > 0 ? 'code' : 'done',
    message:
      remaining > 0
        ? `${pages.length} page${pages.length === 1 ? '' : 's'} live — writing ${remaining} more section${remaining > 1 ? 's' : ''}…`
        : 'Your site is ready.',
    versionId,
    published: true,
  };
}

/**
 * Renders the sections written so far into real files and saves them.
 *
 * Called after the homepage and again after every page, so the site on screen
 * is always the site as it currently stands rather than a snapshot from the end.
 */
async function saveSite(
  input: GenerationInput,
  plan: SitePlan,
  vertical: Vertical,
  sections: Record<string, Section>,
): Promise<{ versionId: string; pages: string[] }> {
  // Only pages that actually have content are linked. A nav entry to a page
  // that does not exist yet is a dead link on a site someone is about to show
  // a customer; the link appears on the next save, a minute later, with the
  // page behind it.
  const written = vertical.pages.filter((page) =>
    page.sections.some((_, index) => sections[`${page.path}#${index}`]),
  );

  const site: SiteSpec = {
    businessName: plan.businessName,
    tagline: plan.tagline,
    pages: written.map((page) => ({ path: page.path, title: page.title })),
    contact: plan.contact,
    tokens: plan.tokens,
  };

  const files: SiteFile[] = [
    { path: 'styles.css', content: renderStylesheet(plan.tokens) },
    { path: 'script.js', content: SITE_SCRIPT },
  ];

  for (const page of written) {
    const body = page.sections
      .map((_, index) => sections[`${page.path}#${index}`])
      .filter((section): section is Section => Boolean(section));

    files.push({
      path: page.path,
      content: renderPage(site, {
        path: page.path,
        title: page.path === 'index.html' ? `${plan.businessName} — ${plan.tagline}` : `${page.title} — ${plan.businessName}`,
        description: plan.seoDescription,
        sections: body,
      }),
    });
  }

  const brief = {
    businessName: plan.businessName,
    pages: written.map((page) => ({ path: page.path, title: page.title, purpose: '', sections: [] })),
  } as unknown as SiteBrief;

  const complete = mergeFiles(files, staticSiteFiles(brief));
  if (complete.length === 0) throw new Error('Nothing was written. Try again, or switch model.');

  const version = await createVersion({
    projectId: input.projectId,
    files: complete,
    source: input.inputMode === 'screenshot' ? 'screenshot' : 'initial',
    designSystem: plan.tokens as never,
  });

  await createAdminClient()
    .from('projects')
    .update({
      name: plan.businessName,
      description: plan.tagline,
      business_type: vertical.label,
      design_system: plan.tokens as never,
      status: 'ready',
      current_version_id: version.id,
    })
    .eq('id', input.projectId);

  return { versionId: version.id, pages: written.map((page) => page.path) };
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

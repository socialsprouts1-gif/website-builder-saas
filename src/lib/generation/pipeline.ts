import 'server-only';
import { openaiFor, resolveApiKey, type KeySource } from '@/lib/openai/client';
import type { CreditedEvent } from '@/lib/env';
import { getModelCatalog, resolveModel } from '@/lib/openai/models';
import { recordUsage } from '@/lib/usage';
import { callWithRetry } from '@/lib/openai/retry';
import { createAdminClient } from '@/lib/supabase/admin';
import type { GenerationJobRow } from '@/lib/database.types';
import { StreamingFileParser, mergeFiles } from './parser';
import {
  EDIT_SYSTEM,
  OWN_MATERIAL_MARK,
  VISION_SYSTEM,
  buildBriefPrompt,
  buildEditPrompt,
  staticSiteFiles,
} from './prompts';
import { PLAN_SYSTEM, SECTION_SYSTEM, buildPlanPrompt, buildSectionPrompt } from './kit/prompts';
import { normaliseTokens, type DesignTokens } from './kit/tokens';
import { renderStylesheet } from './kit/stylesheet';
import { chooseTemplate, templateById, type Template } from './kit/templates';
import { layoutFor } from './kit/layouts';
import { sectionBrief } from './brief';
import { renderPage, SITE_SCRIPT, type SiteSpec } from './kit/page';
import { hasContent, parseSection } from './kit/parse';
import type { Section, SectionKind } from './kit/sections';
import { DEFAULT_VERTICAL, VERTICALS, matchVertical, type Vertical } from './verticals';
import { pageLabel } from '@/lib/pages';
import { createVersion, getCurrentFiles } from './storage';
import { shopSection, type ShopSlot } from '@/lib/shop/inject';
import { seedShop } from '@/lib/shop/seed';
import { photographCatalogue } from '@/lib/shop/photograph';
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
  /** This business sells things, so there is a catalogue to photograph. */
  shop?: boolean;
  /**
   * The template this site is built from.
   *
   * It decides the arrangement of every section, the type pairing, the rhythm
   * and how much the page moves — not just its colours. Chosen once, at plan
   * time, and carried through every later step so a site written over four
   * invocations is one design rather than four.
   */
  templateId: string;
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
  /**
   * Whether the shop's products have been photographed.
   *
   * A shop whose every product is a grey placeholder looks broken, not
   * unfinished — and "generate product images" is the thing people ask for by
   * name. It runs last, after the site is already viewable, because it is the
   * slowest part of a build and nobody should wait on it to see their site.
   */
  photographed?: boolean;
}

export type BuildStep = 'plan' | 'section' | 'publish' | 'photos';

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
/**
 * How many sections may be in flight at once.
 *
 * Whole pages are taken off the queue until the batch is at least this wide, so
 * a page is never split across two steps — every page still lands complete, and
 * still publishes as soon as it does.
 */
export const SECTION_CONCURRENCY = 8;

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

  if (queue.length === 0) {
    if (unsaved || !state.published) return 'publish';
    // Everything is written and saved. A shop still needs its photographs.
    return state.plan.shop && !state.photographed ? 'photos' : null;
  }
  return unsaved ? 'publish' : 'section';
}

/** What to call a file on screen. Nobody wants to read `styles.css`. */
export function fileLabel(path: string): string {
  if (path.endsWith('.html')) return `the ${pageLabel(path)} page`;
  if (path.endsWith('.css')) return 'the stylesheet';
  if (path.endsWith('.js')) return 'the page scripts';
  return path;
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

/**
 * Everything a step needs from the account: a key, a catalog, a client.
 *
 * The intent is what this step is about to spend. A build is priced once, at
 * its first step; the dozen section calls that follow cost nothing, because
 * that first charge already paid for them. Charging each one as a full
 * generation is what emptied a new account three calls into its first site.
 */
async function openSession(input: GenerationInput, intent: CreditedEvent) {
  const { apiKey, source } = await resolveApiKey(
    input.userId,
    input.screenshotDataUrl && intent === 'generation' ? 'vision' : intent,
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
  // 'plan' is the whole build's charge; everything after it rides on it.
  const session = await openSession(input, step === 'plan' ? 'generation' : 'section');
  const { client, catalog, model, source } = session;

  const spend = async (
    usage: { prompt_tokens?: number; completion_tokens?: number } | undefined,
    eventType: 'generation' | 'section' | 'vision',
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
    // Recorded for the spend report, priced at nothing: see openSession.
    await spend(response.usage, 'section', model);

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

    // And the look comes from a template rather than from the model. Asking a
    // model for "a palette" produced sites that differed only in their colours,
    // because the shape was identical every time. The template decides the
    // shape; the model is left with the one judgement it is actually good at,
    // which is what this particular business should sound and feel like.
    const template = chooseTemplate(vertical.slug, `${input.businessType ?? ''} ${input.prompt}`);

    const planModel = catalog.fast?.id ?? model;
    const response = await callWithRetry(async () => {
      return client.chat.completions.create({
        model: planModel,
        messages: [
          { role: 'system', content: PLAN_SYSTEM },
          {
            role: 'user',
            content: `${buildPlanPrompt({ prompt: input.prompt, vertical, sitemap, template })}\n\n${buildBriefPrompt(
              {
                prompt: input.prompt,
                businessType: input.businessType,
                extraction,
                ownMaterial: input.prompt.includes(OWN_MATERIAL_MARK),
              },
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
      // The model writes the palette; everything else about the look comes
      // from the template, so a serif display face and a tight grid cannot
      // end up disagreeing with each other.
      tokens: {
        ...normaliseTokens(raw.tokens),
        fonts: template.shape.fonts,
        radius: template.shape.radius,
        radiusLarge: template.shape.radiusLarge,
        density: template.shape.density,
        texture: template.shape.texture,
      },
      verticalSlug: vertical.slug,
      shop: Boolean(vertical.shop),
      templateId: template.id,
    };

    // A shop, opened with something in it. Done here rather than at the end so
    // the Shop page has products in it the first time it is looked at, and
    // deliberately not awaited into the critical path of the build: a shop that
    // fails to seed leaves a site that is still a good site.
    if (vertical.shop) {
      await seedShop(input.projectId, Array.isArray(raw.products) ? (raw.products as never[]) : []);
    }

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
    const first = queue[0];
    if (!first) throw new Error('Nothing left to write.');

    // Whole pages at once, up to a ceiling, rather than one section per step.
    //
    // Each section is an independent request that knows nothing about its
    // neighbours, so writing them one after another only ever bought latency: a
    // five-page site is around twenty calls, and at twenty seconds each that is
    // minutes of "Working…" with nothing on screen. They go out together now,
    // taking whole pages off the queue until the batch reaches the ceiling — so
    // a typical site is two rounds rather than twenty, and still saves a page
    // at a time so the preview fills in as it goes.
    //
    // The ceiling is there because concurrency is not free: past a certain
    // width the requests start queueing behind the account's rate limit, where
    // each one comes back slower and a 429 costs a retry with a back-off. Eight
    // is wide enough to collapse a site into a couple of rounds and narrow
    // enough not to trip that.
    const batch: typeof queue = [];
    for (const entry of queue) {
      if (batch.length >= SECTION_CONCURRENCY && entry.page !== batch[batch.length - 1].page) break;
      batch.push(entry);
    }
    const taken = new Set(batch.map((entry) => entry.page));
    const rest = queue.filter((entry) => !taken.has(entry.page));

    const written = await Promise.all(
      batch.map(async (job) => {
        const page = vertical.pages.find((candidate) => candidate.path === job.page);
        const content = await ask(
          SECTION_SYSTEM,
          buildSectionPrompt({
            kind: job.kind,
            business: plan.businessName,
            tagline: plan.tagline,
            audience: plan.audience,
            vertical,
            pageTitle: page?.title ?? 'Home',
            // The gist, not the whole thing. A twenty-thousand-character brief
            // sent to every one of two dozen section calls is paid for two
            // dozen times; the planner already read all of it.
            brief: sectionBrief(input.prompt),
            sitemap: vertical.pages.map((entry) => ({ path: entry.path, title: entry.title })),
          }),
        );
        return { job, section: parseSection(job.kind, `${job.kind}-${job.index + 1}`, content) };
      }),
    );

    const sections = { ...(state.sections ?? {}) };
    for (const { job, section } of written) {
      if (hasContent(section)) sections[`${job.page}#${job.index}`] = section;
      emitFile(`${pageLabel(job.page)} · ${job.kind}`);
    }

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
          : `Writing ${pageLabel(rest[0]?.page ?? '')}…`,
    };
  }

  if (step === 'photos') {
    // The site is already saved and on screen. This only fills in the pictures
    // the shop grid is currently showing placeholders for.
    const result = await photographCatalogue({
      projectId: input.projectId,
      userId: input.userId,
      business: plan.businessName,
      onProgress: (done, total) => {
        say?.(`Photographing the products — ${done} of ${total}…`);
        emitFile(`product photograph ${done} of ${total}`);
      },
    }).catch(() => ({ photographed: 0, failed: 0 }));

    emitFile(`${result.photographed} product photographs`);

    const nextState: BuildState = { ...state, photographed: true };
    return {
      state: nextState,
      next: nextStep(nextState),
      stage: 'done',
      message:
        result.photographed > 0
          ? `Photographed ${result.photographed} product${result.photographed === 1 ? '' : 's'}. Your site is ready.`
          : 'Your site is ready.',
      published: true,
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
        : nextStep(nextState) === 'photos'
          ? 'Every page is written. Photographing the products…'
          : 'Your site is ready.',
    versionId,
    published: true,
  };
}

/**
 * Which of a vertical's pages are written into files on this save.
 *
 * Only pages that actually have content are linked. A nav entry to a page that
 * does not exist yet is a dead link on a site someone is about to show a
 * customer; the link appears on the next save, a minute later, with the page
 * behind it.
 *
 * A shop page is the exception. The basket and the checkout have no sections to
 * wait for — everything on them is rendered from the database when they are
 * served — so waiting for content that will never come would mean a shop whose
 * basket link went nowhere for as long as the site existed. They are written as
 * soon as the site has anything at all.
 */
export function pagesToWrite(
  vertical: Vertical,
  sections: Record<string, Section>,
): Vertical['pages'] {
  const anything = Object.keys(sections).length > 0;
  return vertical.pages.filter(
    (page) =>
      page.sections.some((_unused, index) => sections[`${page.path}#${index}`]) ||
      (Boolean(page.shopSlot) && anything),
  );
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
  const written = pagesToWrite(vertical, sections);

  const site: SiteSpec = {
    businessName: plan.businessName,
    tagline: plan.tagline,
    // The basket and the checkout are pages you are sent to, never pages you
    // browse to. A link to your own empty basket in the main nav of every page
    // is clutter; the basket in the header, with a count on it, is the answer.
    pages: written
      .filter((page) => !page.hidden)
      .map((page) => ({ path: page.path, title: page.title })),
    contact: plan.contact,
    tokens: plan.tokens,
  };

  const template = templateById(plan.templateId);

  const files: SiteFile[] = [
    { path: 'styles.css', content: renderStylesheet(plan.tokens, template) },
    { path: 'script.js', content: SITE_SCRIPT },
  ];

  for (const page of written) {
    // The template's arrangement is applied here rather than written into the
    // section when it was generated, so changing a template later re-lays an
    // existing site out instead of needing every section rewritten.
    const body = page.sections
      .map((_, index) => sections[`${page.path}#${index}`])
      .filter((section): section is Section => Boolean(section))
      .map((section) => ({
        ...section,
        layout: layoutFor(section.kind, template.layouts[section.kind]),
      }));

    files.push({
      path: page.path,
      content: renderPage(site, {
        path: page.path,
        title: page.path === 'index.html' ? `${plan.businessName} — ${plan.tagline}` : `${page.title} — ${plan.businessName}`,
        description: plan.seoDescription,
        sections: body,
        // The shop's own heading is written into the file so it can be edited
        // like any other; only what goes under it is rendered per request.
        extra: page.shopSlot
          ? shopSection(page.shopSlot, page.shopSlot === 'shop' ? undefined : page.title)
          : page.shopBands
            ? page.shopBands.map((slot: ShopSlot) => shopSection(slot)).join('\n')
            : undefined,
        // Directly under the hero on a home page. Products below the closing
        // call to action are products nobody scrolls to.
        extraAfter: page.shopBands ? 1 : undefined,
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
/** One thing the editor is doing, as it happens. */
export interface EditStep {
  /** Stable across the start and the finish of the same file. */
  id: string;
  label: string;
  done: boolean;
}

export async function runChatEdit(params: {
  projectId: string;
  userId: string;
  request: string;
  requestedModel?: string | null;
  source?: 'chat' | 'voice';
  onDelta?: (delta: string) => void;
  /**
   * Called as the work happens, not after it.
   *
   * The parser has always known when the model opens a file and when it closes
   * one — nothing was listening. An edit that rewrites four files showed one
   * line saying "Applying your change…" for a minute and then the finished
   * site, which is indistinguishable from a hang and says nothing about what
   * was touched.
   */
  onStep?: (step: EditStep) => void;
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

  const parser = new StreamingFileParser(
    (path) => params.onStep?.({ id: path, label: `Writing ${fileLabel(path)}`, done: false }),
    (file) => params.onStep?.({ id: file.path, label: `Writing ${fileLabel(file.path)}`, done: true }),
  );
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

import { env } from '@/lib/env';
import { notFound } from 'next/navigation';
import { Workspace } from '@/components/app/Workspace';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getCurrentFiles } from '@/lib/generation/storage';
import { resolveApiKeyForMetadata } from '@/lib/openai/client';
import { fallbackCatalog, getModelCatalog } from '@/lib/openai/models';
import { reapStaleJobs } from '@/lib/generation/reap';
import { BLOCK_MENU } from '@/lib/generation/blocks';

export const dynamic = 'force-dynamic';

export default async function ProjectWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ job?: string }>;
}) {
  const { id } = await params;
  const { job } = await searchParams;

  const user = await requireUser();

  // Settle abandoned builds before reading status, so a project whose build
  // died shows as stopped with a way to restart rather than a frozen spinner.
  await reapStaleJobs(user.id).catch(() => 0);

  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, status, model')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!project) notFound();

  // The job is looked up either way — by id when the creation redirect named
  // one, otherwise by finding the live one for this project. Coming back from
  // anywhere else there is no ?job= in the URL, and a build screen with nothing
  // behind it is worse than no build screen.
  //
  // created_at comes back with it because "how long has this been building" is
  // a fact about the build, not about how long this tab has been open.
  //
  // The job's own status comes back with it, and it is the only thing that
  // says whether a build is running. The project's status cannot: every page a
  // build saves writes a version, and writing a version sets the project to
  // `ready`, so a build three pages in leaves `projects.status = 'ready'` while
  // the job is still going. Reading the project row here was what made the
  // workspace decide, half way through, that the build had finished.
  const jobQuery = supabase
    .from('generation_jobs')
    .select('id, created_at, status')
    .eq('project_id', id);

  // Without ?job= in the URL, look for a live one whatever the project says —
  // for the same reason.
  const { data: liveJob } = job
    ? await jobQuery.eq('id', job).maybeSingle()
    : await jobQuery
        .in('status', ['queued', 'running'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

  const jobId = liveJob?.id ?? null;
  const jobStartedAt = liveJob?.created_at ?? null;
  const jobStatus = (liveJob?.status as 'queued' | 'running' | 'succeeded' | 'failed') ?? null;

  const [{ data: messages }, { data: versions }] = await Promise.all([
    supabase
      .from('chat_messages')
      .select('id, role, content')
      .eq('project_id', id)
      .order('created_at', { ascending: true })
      .limit(80),
    supabase
      .from('project_versions')
      .select('id, version_number, label, source, created_at')
      .eq('project_id', id)
      .order('version_number', { ascending: false })
      .limit(30),
  ]);

  // Asked for separately, and allowed to fail: these columns arrive in
  // migration 0008, and a database that has not run it yet should still open
  // the workspace rather than error on a select.
  const { data: publishState } = await supabase
    .from('projects')
    .select('public_slug, published_at, favicon_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const files = await getCurrentFiles(id).catch(() => []);
  const pages = files.filter((file) => file.path.endsWith('.html')).map((file) => file.path);

  let catalog = fallbackCatalog(true);
  try {
    const resolved = await resolveApiKeyForMetadata(user.id);
    if (resolved) catalog = await getModelCatalog(resolved.apiKey);
  } catch {
    // Falls back to the seed catalog; generation itself surfaces the real error.
  }

  return (
    <Workspace
      canonicalOrigin={env.canonicalOrigin}
      projectId={project.id}
      projectName={project.name}
      initialStatus={project.status}
      initialMessages={messages ?? []}
      initialVersions={versions ?? []}
      pages={pages.length > 0 ? pages : ['index.html']}
      models={{ quality: catalog.quality, fast: catalog.fast, all: catalog.all }}
      activeModel={project.model}
      initialJobId={jobId}
      initialJobStatus={jobStatus}
      jobStartedAt={jobStartedAt}
      publicSlug={publishState?.public_slug ?? null}
      published={Boolean(publishState?.published_at)}
      favicon={publishState?.favicon_url ?? null}
      blockMenu={BLOCK_MENU}
    />
  );
}

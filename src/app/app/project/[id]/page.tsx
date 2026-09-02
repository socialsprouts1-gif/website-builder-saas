import { notFound } from 'next/navigation';
import { Workspace } from '@/components/app/Workspace';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getCurrentFiles } from '@/lib/generation/storage';
import { resolveApiKeyForMetadata } from '@/lib/openai/client';
import { fallbackCatalog, getModelCatalog } from '@/lib/openai/models';

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
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, status, model')
    .eq('id', id)
    .maybeSingle();
  if (!project) notFound();

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
      projectId={project.id}
      projectName={project.name}
      initialStatus={project.status}
      initialMessages={messages ?? []}
      initialVersions={versions ?? []}
      pages={pages.length > 0 ? pages : ['index.html']}
      models={{ quality: catalog.quality, fast: catalog.fast, all: catalog.all }}
      activeModel={project.model}
      initialJobId={job ?? null}
    />
  );
}

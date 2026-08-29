import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ProjectRow } from '@/lib/database.types';
import type { SiteFile, VersionSourceLike } from './storage.types';
import type { DesignSystem } from './types';

/**
 * Version storage.
 *
 * `project_versions.files` (jsonb) is the source of truth for generated code:
 * the editor, the preview and the deploy step all read it transactionally, and
 * a version is only ever written as one row. Supabase Storage holds the things
 * that are genuinely blobs — uploaded screenshots and user images — under
 * `project-assets/`.
 */

export const ASSET_BUCKET = 'project-assets';

export async function createVersion(params: {
  projectId: string;
  files: SiteFile[];
  source: VersionSourceLike;
  label?: string;
  designSystem?: DesignSystem | null;
}): Promise<{ id: string; version_number: number }> {
  const supabase = createAdminClient();

  const { data: latest } = await supabase
    .from('project_versions')
    .select('version_number')
    .eq('project_id', params.projectId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const versionNumber = (latest?.version_number ?? 0) + 1;

  const { data, error } = await supabase
    .from('project_versions')
    .insert({
      project_id: params.projectId,
      version_number: versionNumber,
      source: params.source,
      label: params.label ?? defaultLabel(versionNumber, params.source),
      files: params.files as unknown as never,
    })
    .select('id, version_number')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Could not save version');

  const projectPatch: Partial<ProjectRow> = {
    current_version_id: data.id,
    status: 'ready',
    updated_at: new Date().toISOString(),
  };
  if (params.designSystem) {
    projectPatch.design_system = params.designSystem as unknown as ProjectRow['design_system'];
  }

  await supabase.from('projects').update(projectPatch).eq('id', params.projectId);

  return { id: data.id, version_number: data.version_number };
}

function defaultLabel(versionNumber: number, source: VersionSourceLike): string {
  const suffix: Record<string, string> = {
    initial: 'initial generation',
    chat: 'after chat edit',
    visual_edit: 'after visual edit',
    screenshot: 'from screenshot',
    voice: 'after voice edit',
    template: 'from template',
  };
  return `v${versionNumber} ${suffix[source] ?? 'update'}`;
}

export async function getCurrentFiles(projectId: string): Promise<SiteFile[]> {
  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from('projects')
    .select('current_version_id')
    .eq('id', projectId)
    .maybeSingle();

  if (!project?.current_version_id) return [];

  const { data: version } = await supabase
    .from('project_versions')
    .select('files')
    .eq('id', project.current_version_id)
    .maybeSingle();

  return (version?.files as unknown as SiteFile[]) ?? [];
}

export async function getVersionFiles(versionId: string): Promise<SiteFile[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('project_versions')
    .select('files')
    .eq('id', versionId)
    .maybeSingle();
  return (data?.files as unknown as SiteFile[]) ?? [];
}

/** Revert = a new version carrying the old files, so history is never destroyed. */
export async function revertToVersion(projectId: string, versionId: string) {
  const files = await getVersionFiles(versionId);
  if (files.length === 0) throw new Error('That version has no files to restore');

  const supabase = createAdminClient();
  const { data: source } = await supabase
    .from('project_versions')
    .select('version_number')
    .eq('id', versionId)
    .maybeSingle();

  return createVersion({
    projectId,
    files,
    source: 'chat',
    label: `restored from v${source?.version_number ?? '?'}`,
  });
}

export async function uploadAsset(params: {
  projectId: string;
  fileName: string;
  body: ArrayBuffer | Buffer;
  contentType: string;
}): Promise<string> {
  const supabase = createAdminClient();
  const path = `${params.projectId}/${Date.now()}-${params.fileName}`;

  const { error } = await supabase.storage
    .from(ASSET_BUCKET)
    .upload(path, params.body, { contentType: params.contentType, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

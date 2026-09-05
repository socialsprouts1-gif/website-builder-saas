import { notFound } from 'next/navigation';
import { EditorWorkspace } from '@/components/app/editor/EditorWorkspace';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getCurrentFiles } from '@/lib/generation/storage';
import { BLOCK_MENU } from '@/lib/generation/blocks';

export const metadata = { title: 'Editor' };
export const dynamic = 'force-dynamic';

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('id', id)
    .maybeSingle();
  if (!project) notFound();

  if (project.status !== 'ready') {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="font-display text-2xl text-ink-primary">Nothing to edit yet</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Generate the site first — the editor works on the pages the generator produces.
        </p>
      </div>
    );
  }

  const files = await getCurrentFiles(id).catch(() => []);
  const pages = files.filter((file) => file.path.endsWith('.html')).map((file) => file.path);

  return (
    <EditorWorkspace
      projectId={project.id}
      projectName={project.name}
      pages={pages.length > 0 ? pages : ['index.html']}
      blockMenu={BLOCK_MENU}
    />
  );
}

import { notFound } from 'next/navigation';
import { SectionHeader } from '@/components/ui/Card';
import { DeployPanel } from '@/components/app/DeployPanel';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { loadAccountContext } from '@/lib/connectors/registry';

export const metadata = { title: 'Deploy' };
export const dynamic = 'force-dynamic';

export default async function DeployPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, slug, status')
    .eq('id', id)
    .maybeSingle();
  if (!project) notFound();

  const [vercel, github] = await Promise.all([
    loadAccountContext(user.id, 'vercel'),
    loadAccountContext(user.id, 'github'),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <SectionHeader
        title="Ship it"
        description="Deploy to Vercel, push to GitHub, or take the code and host it anywhere. It is yours."
      />

      {project.status !== 'ready' ? (
        <p className="rounded-card border border-hairline bg-raised px-4 py-6 text-center text-[13px] text-ink-muted">
          Nothing to deploy yet — generate the site first.
        </p>
      ) : (
        <DeployPanel
          projectId={project.id}
          defaultName={project.slug}
          vercelConnected={Boolean(vercel.credentials?.access_token)}
          githubConnected={Boolean(github.credentials?.access_token)}
        />
      )}
    </div>
  );
}

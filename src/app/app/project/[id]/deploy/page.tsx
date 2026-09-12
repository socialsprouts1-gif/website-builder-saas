import { notFound } from 'next/navigation';
import { SectionHeader } from '@/components/ui/Card';
import { DeployPanel } from '@/components/app/DeployPanel';
import { PublishPanel } from '@/components/app/PublishPanel';
import { DomainPanel } from '@/components/app/DomainPanel';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { loadAccountContext } from '@/lib/connectors/registry';
import { env } from '@/lib/env';

export const metadata = { title: 'Deploy' };
export const dynamic = 'force-dynamic';

export default async function DeployPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select(
      'id, name, slug, status, vercel_project_id, custom_domain, deploy_url, public_slug, published_at, favicon_url',
    )
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
        description="Publish it on Lumen in one click, put it on your own domain, or take the code and host it anywhere. It is yours."
      />

      <div className="mb-10">
        <PublishPanel
          projectId={project.id}
          siteUrl={env.siteUrl}
          initialSlug={project.public_slug}
          initialPublished={Boolean(project.published_at)}
          initialFavicon={project.favicon_url}
          ready={project.status === 'ready'}
        />
      </div>

      {project.status !== 'ready' ? (
        <p className="rounded-card border border-hairline bg-raised px-4 py-6 text-center text-[13px] text-ink-muted">
          Nothing to deploy yet — generate the site first.
        </p>
      ) : (
        <>
          <DeployPanel
            projectId={project.id}
            defaultName={project.slug}
            vercelConnected={Boolean(vercel.credentials?.access_token)}
            githubConnected={Boolean(github.credentials?.access_token)}
          />

          <h2 className="mb-3 mt-10 font-display text-xl text-ink-primary">Your own domain</h2>
          <DomainPanel
            projectId={project.id}
            deployed={Boolean(project.vercel_project_id)}
            initialDomain={project.custom_domain}
          />
        </>
      )}
    </div>
  );
}

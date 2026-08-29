import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SectionHeader } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'My sites' };
export const dynamic = 'force-dynamic';

const STATUS_TONE = {
  ready: 'positive',
  generating: 'accent',
  failed: 'warning',
  draft: 'neutral',
} as const;

export default async function ProjectsPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, description, business_type, status, updated_at')
    .eq('is_template', false)
    .order('updated_at', { ascending: false });

  // Zero projects funnels straight into the generator rather than showing an
  // empty grid (spec Section 17).
  if (!projects || projects.length === 0) redirect('/app/new');

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <SectionHeader
        title="My sites"
        description="Every site you have generated. Open one to keep iterating."
        action={<ButtonLink href="/app/new">+ New site</ButtonLink>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/app/project/${project.id}`}
            className="group rounded-card border border-hairline bg-raised transition hover:border-accent/30"
          >
            <div className="aspect-[16/10] overflow-hidden rounded-t-card border-b border-hairline bg-[var(--bg-base-deep)]">
              {project.status === 'ready' ? (
                <iframe
                  src={`/preview/${project.id}/index.html`}
                  title={project.name}
                  loading="lazy"
                  sandbox="allow-scripts"
                  tabIndex={-1}
                  className="pointer-events-none h-[500px] w-[800px] origin-top-left scale-[0.42] border-0 bg-white"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[12px] text-ink-muted">
                  {project.status === 'generating' ? 'Building…' : 'No preview yet'}
                </div>
              )}
            </div>
            <div className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="truncate text-sm text-ink-primary">{project.name}</h2>
                <Badge tone={STATUS_TONE[project.status] ?? 'neutral'} className="shrink-0 px-2 py-1 text-[10px]">
                  {project.status}
                </Badge>
              </div>
              <p className="line-clamp-2 text-[12.5px] text-ink-muted">
                {project.description ?? project.business_type ?? 'Generated with Lumen'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

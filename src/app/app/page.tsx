import { redirect } from 'next/navigation';
import { SectionHeader } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { SiteCard, type SiteSummary } from '@/components/app/SiteCard';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { reapStaleJobs } from '@/lib/generation/reap';

export const metadata = { title: 'My sites' };
export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const user = await requireUser();

  // Builds only run while a browser holds their stream open, so one abandoned
  // mid-way leaves a project stuck on "generating" with nothing left to finish
  // it. Settle those before listing, so the page tells the truth.
  await reapStaleJobs(user.id).catch(() => 0);

  const supabase = await createClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, description, business_type, status, updated_at')
    .eq('is_template', false)
    .order('updated_at', { ascending: false });

  // Zero projects funnels straight into the generator rather than showing an
  // empty grid (spec Section 17).
  if (!projects || projects.length === 0) redirect('/app/new');

  const sites: SiteSummary[] = projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    businessType: project.business_type,
    status: project.status,
  }));

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <SectionHeader
        title="My sites"
        description="Every site you have generated. Open one to keep iterating."
        action={<ButtonLink href="/app/new">+ New site</ButtonLink>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <SiteCard key={site.id} site={site} />
        ))}
      </div>
    </div>
  );
}

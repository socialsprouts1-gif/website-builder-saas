import { notFound } from 'next/navigation';
import { ProjectTabs } from '@/components/app/ProjectTabs';
import { nextStepFor } from '@/components/app/project-nav';
import { createClient } from '@/lib/supabase/server';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, status, public_slug')
    .eq('id', id)
    .maybeSingle();
  if (!project) notFound();

  // Where to point. One tab, and only while there is a reason — the rule
  // itself lives in project-nav, where it can be tested.
  const nextStep = nextStepFor({ status: project.status, publicSlug: project.public_slug });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ProjectTabs projectId={project.id} name={project.name} nextStep={nextStep} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

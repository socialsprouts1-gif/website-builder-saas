import { notFound } from 'next/navigation';
import { ProjectTabs } from '@/components/app/ProjectTabs';
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

  const { data: project } = await supabase.from('projects').select('id, name').eq('id', id).maybeSingle();
  if (!project) notFound();

  return (
    <div className="flex h-screen flex-col">
      <ProjectTabs projectId={project.id} name={project.name} />
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

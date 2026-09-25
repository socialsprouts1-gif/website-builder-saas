import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { TrashList } from '@/components/app/TrashList';

export const metadata = { title: 'Trash' };
export const dynamic = 'force-dynamic';

/**
 * Deleted sites, still here.
 *
 * Deleting used to be immediate and permanent: one confirm, and every version,
 * page and order attached to the only copy of somebody's website was gone.
 * Nothing is destroyed until it is emptied from here.
 */
export default async function TrashPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from('projects')
    .select('id, name, deleted_at')
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(100);

  const projects = (data ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    deletedAt: project.deleted_at ?? new Date().toISOString(),
  }));

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-[28px] leading-tight text-ink-primary">Trash</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
        Sites you have deleted. They are off the internet but nothing has been destroyed — restore one
        and it comes back exactly as it was.
      </p>

      {projects.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing in the trash"
            description="Anything you delete lands here first, so a wrong click is never the end of a site."
            action={<ButtonLink href="/app">Go to my sites</ButtonLink>}
          />
        </div>
      ) : (
        <TrashList projects={projects} />
      )}
    </div>
  );
}

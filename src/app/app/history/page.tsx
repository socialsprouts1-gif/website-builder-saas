import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';

export const metadata = { title: 'Version history' };
export const dynamic = 'force-dynamic';

const SOURCE_LABEL: Record<string, string> = {
  generation: 'Built',
  chat: 'Changed in chat',
  manual: 'Edited by hand',
  editor: 'Edited visually',
  import: 'Imported',
  template: 'From a template',
};

/**
 * Every version of every site, newest first.
 *
 * A project's own history was already there, inside that project. This is the
 * same rows read across all of them, which answers the question the per-project
 * view cannot: what did I change this week, and where. Restoring still happens
 * inside a project, because that is where you can see what you would be
 * restoring.
 */
export default async function HistoryPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('user_id', user.id)
    .eq('is_template', false)
    .is('deleted_at', null);

  const owned = projects ?? [];
  const names = new Map(owned.map((project) => [project.id, project.name]));

  const { data: versions } = owned.length
    ? await supabase
        .from('project_versions')
        .select('id, project_id, version_number, label, source, created_at')
        .in(
          'project_id',
          owned.map((project) => project.id),
        )
        .order('created_at', { ascending: false })
        .limit(120)
    : { data: [] };

  const rows = versions ?? [];

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-[28px] leading-tight text-ink-primary">Version history</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
        Every save across every site, newest first. Open a project to look at a version or put it
        back.
      </p>

      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing saved yet"
            description="Every build and every change you make is kept as a version you can go back to. Build a site and this fills up."
            action={<ButtonLink href="/app/new">Build a site</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
          {rows.map((version) => (
            <li key={version.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3.5">
              <Link
                href={`/app/project/${version.project_id}`}
                className="text-[14.5px] text-ink-primary hover:underline"
              >
                {names.get(version.project_id) ?? 'A site'}
              </Link>
              <span className="text-[12.5px] text-ink-muted">v{version.version_number}</span>
              <span className="text-[13px] text-ink-secondary">
                {version.label || SOURCE_LABEL[version.source] || 'Saved'}
              </span>
              <time
                dateTime={version.created_at}
                className="ml-auto shrink-0 text-[12px] text-ink-muted"
              >
                {new Date(version.created_at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

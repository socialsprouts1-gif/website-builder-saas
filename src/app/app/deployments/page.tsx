import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { env } from '@/lib/env';
import { publicUrl, shareOrigin } from '@/lib/publish';

export const metadata = { title: 'Deployments' };
export const dynamic = 'force-dynamic';

/**
 * Every site of yours that is live somewhere, on one page.
 *
 * The information was only ever reachable one project at a time, which is no
 * use to somebody with a dozen: "which of these are actually published, and
 * where?" took twelve clicks to answer. Nothing new is stored for this — it is
 * the publish state that was already on each project, read together.
 */
export default async function DeploymentsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from('projects')
    .select('id, name, public_slug, published_at, custom_domain, deploy_url, updated_at, status')
    .eq('user_id', user.id)
    .eq('is_template', false)
    .is('deleted_at', null)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(200);

  const projects = data ?? [];
  const live = projects.filter((project) => project.published_at || project.deploy_url);
  const unpublished = projects.filter((project) => !project.published_at && !project.deploy_url);
  const origin = shareOrigin(env.canonicalOrigin, env.siteUrl);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-[28px] leading-tight text-ink-primary">Deployments</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
        Where each of your sites is live, and what it is live at. Publishing and unpublishing happen
        inside a project.
      </p>

      {live.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing is live yet"
            description="Open a site and press Publish. It gets an address straight away, and you can point your own domain at it afterwards."
            action={<ButtonLink href="/app">Go to my sites</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
          {live.map((project) => {
            const address = project.custom_domain
              ? `https://${project.custom_domain}`
              : project.public_slug
                ? publicUrl(origin, project.public_slug)
                : project.deploy_url;

            return (
              <li key={project.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/app/project/${project.id}`}
                    className="text-[15px] text-ink-primary hover:underline"
                  >
                    {project.name}
                  </Link>
                  {address ? (
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-muted">
                      <a
                        href={address}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="hover:text-ink-secondary"
                      >
                        {address.replace(/^https?:\/\//, '')}
                      </a>
                    </p>
                  ) : null}
                </div>

                <span className="flex flex-wrap items-center gap-2">
                  {project.custom_domain ? <Badge tone="accent">Own domain</Badge> : null}
                  {project.published_at ? <Badge tone="positive">Live</Badge> : null}
                  {project.deploy_url && !project.published_at ? <Badge>Deployed</Badge> : null}
                </span>

                <ButtonLink href={`/app/project/${project.id}/deploy`} size="sm" variant="secondary">
                  Manage
                </ButtonLink>
              </li>
            );
          })}
        </ul>
      )}

      {unpublished.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            Built but not published ({unpublished.length})
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {unpublished.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/app/project/${project.id}`}
                  className="inline-flex rounded-pill border border-hairline px-3.5 py-1.5 text-[13px] text-ink-secondary transition hover:border-white/25 hover:text-ink-primary"
                >
                  {project.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Which published site answers on a hostname.
 *
 * Its own small module because the middleware imports it, and the middleware
 * is loaded on requests that have not reached the application yet — pulling
 * the whole domain service in with it would mean shipping the Vercel client
 * to the edge for a two-column read.
 *
 * Answers are held briefly in the isolate that asked. A domain's mapping
 * changes when its owner connects or disconnects it, which is a handful of
 * times in the life of a site, so a minute of staleness costs nothing and
 * saves a round trip on every request to every live customer domain.
 */

export interface HostedSite {
  slug: string;
  projectId: string;
}

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; site: HostedSite | null }>();

/** Forgets a hostname, for the moment its mapping changes. */
export function forgetHostname(hostname: string): void {
  cache.delete(hostname);
}

export async function siteForHostname(hostname: string): Promise<HostedSite | null> {
  const hit = cache.get(hostname);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.site;

  let site: HostedSite | null = null;
  try {
    const { data } = await createAdminClient()
      .from('custom_domains')
      .select('project_id, projects(public_slug, published_at, deleted_at)')
      .eq('hostname', hostname)
      .maybeSingle();

    const project = (
      data as {
        projects?: { public_slug: string | null; published_at: string | null; deleted_at: string | null };
      } | null
    )?.projects;

    // Unpublished or trashed is the same as not connected: taking a site down
    // has to take it down everywhere it answers, not only on the Lumen link.
    if (data && project?.public_slug && project.published_at && !project.deleted_at) {
      site = { slug: project.public_slug, projectId: data.project_id };
    }
  } catch {
    // A database that cannot be reached must not be cached as "no such site",
    // or one blip takes every customer domain down for a minute.
    return null;
  }

  cache.set(hostname, { at: Date.now(), site });
  return site;
}

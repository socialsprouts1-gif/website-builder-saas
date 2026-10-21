import 'server-only';
import { env, isDomainHostingConfigured } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { addDomain, getDomain, removeDomain, verifyDomain } from '@/lib/vercel';
import { apexOf, dnsRowsFor, hostnamesToAttach, type DnsRow } from '@/lib/domains';

/**
 * Holding a customer's domain on Lumen's own deployment.
 *
 * The owner has no hosting of their own and no Vercel account; what they have
 * is a domain from GoDaddy and a published site. So the domain is attached to
 * the project that already serves Lumen — which is what gets it a certificate
 * — and a request arriving on it is routed to their site by its hostname.
 *
 * Everything here is the networked half. The decisions that do not need a
 * network live in `domains.ts` and are tested there.
 */

export interface DomainState {
  /** The domain as the owner typed it. */
  domain: string;
  /** Every name attached for it: the apex and its www, or just the one. */
  hostnames: string[];
  /** True once Vercel is serving it, which means DNS has landed. */
  live: boolean;
  records: DnsRow[];
  /** What is still wrong, in words the owner can act on. */
  note?: string;
}

function platform(): { token: string; projectId: string; teamId?: string } | null {
  if (!isDomainHostingConfigured) return null;
  return {
    token: env.platformVercel.token!,
    projectId: env.platformVercel.projectId!,
    teamId: env.platformVercel.teamId || undefined,
  };
}

/** The one sentence to show when the founder has not set the token yet. */
export const NOT_CONFIGURED =
  'Domain connection is not switched on for this Lumen yet. It needs VERCEL_TOKEN and VERCEL_PROJECT_ID in the environment.';

/**
 * Attaches a domain and records it against the project.
 *
 * Both names go up for a root domain. Attaching only what was typed is how
 * shop.com works and www.shop.com shows a certificate warning — reported, every
 * time, as "the domain is broken".
 */
export async function connectDomain(params: {
  projectId: string;
  userId: string;
  domain: string;
}): Promise<{ ok: true; state: DomainState } | { ok: false; error: string }> {
  const config = platform();
  if (!config) return { ok: false, error: NOT_CONFIGURED };

  const hostnames = hostnamesToAttach(params.domain);
  const root = apexOf(params.domain);
  const admin = createAdminClient();

  // Somebody else's, on another account. Checked before anything is attached:
  // a half-connected domain is worse than a refused one.
  const { data: taken } = await admin
    .from('custom_domains')
    .select('hostname, project_id')
    .in('hostname', hostnames);
  const clash = (taken ?? []).find((row) => row.project_id !== params.projectId);
  if (clash) {
    return { ok: false, error: `${clash.hostname} is already connected to another site.` };
  }

  const failures: string[] = [];
  for (const hostname of hostnames) {
    const result = await addDomain({ ...config, domain: hostname });
    if (!result.ok) failures.push(`${hostname}: ${result.error}`);
  }

  // The www failing on its own is survivable — the site answers, and the panel
  // says what is missing. The name they typed failing is not.
  if (failures.some((entry) => entry.startsWith(`${params.domain}:`))) {
    return { ok: false, error: failures[0].split(': ').slice(1).join(': ') };
  }

  for (const hostname of hostnames) {
    await admin
      .from('custom_domains')
      .upsert(
        {
          project_id: params.projectId,
          user_id: params.userId,
          hostname,
          root,
          verified: false,
          last_error: failures.find((entry) => entry.startsWith(`${hostname}:`)) ?? null,
        },
        { onConflict: 'hostname' },
      );
  }

  // Kept in step so the deployments list and the old panel keep working.
  await admin.from('projects').update({ custom_domain: params.domain }).eq('id', params.projectId);

  return { ok: true, state: await readState(params.projectId, params.domain) };
}

/** Asks Vercel to look at DNS now rather than on its own schedule. */
export async function recheckDomain(projectId: string, domain: string): Promise<DomainState> {
  const config = platform();
  if (!config) return { domain, hostnames: [], live: false, records: dnsRowsFor(domain), note: NOT_CONFIGURED };

  for (const hostname of hostnamesToAttach(domain)) {
    await verifyDomain({ ...config, domain: hostname });
  }
  return readState(projectId, domain);
}

/** Where the domain has got to, as of now. */
export async function readState(projectId: string, domain: string): Promise<DomainState> {
  const config = platform();
  const hostnames = hostnamesToAttach(domain);
  const records = dnsRowsFor(domain);
  if (!config) return { domain, hostnames, live: false, records, note: NOT_CONFIGURED };

  const admin = createAdminClient();
  const states = await Promise.all(
    hostnames.map(async (hostname) => {
      const result = await getDomain({ ...config, domain: hostname });
      return { hostname, ok: result.ok, verified: result.ok ? result.data.verified : false };
    }),
  );

  // The name the owner typed is the one that decides whether this worked. A
  // www that has not caught up yet is a note, not a failure.
  const primary = states.find((entry) => entry.hostname === domain);
  const live = Boolean(primary?.verified);
  const lagging = states.filter((entry) => !entry.verified).map((entry) => entry.hostname);

  for (const entry of states) {
    await admin
      .from('custom_domains')
      .update({
        verified: entry.verified,
        verified_at: entry.verified ? new Date().toISOString() : null,
      })
      .eq('hostname', entry.hostname)
      .eq('project_id', projectId);
  }

  return {
    domain,
    hostnames,
    live,
    records,
    note: live
      ? lagging.length > 0
        ? `${lagging.join(' and ')} has not caught up yet — add the www row above if you have not.`
        : undefined
      : 'Waiting for the records. It usually takes a few minutes, and can take a few hours.',
  };
}

/** Takes the domain off the site and off Lumen's deployment. */
export async function disconnectDomain(projectId: string, domain: string): Promise<void> {
  const config = platform();
  const admin = createAdminClient();

  if (config) {
    for (const hostname of hostnamesToAttach(domain)) {
      await removeDomain({ ...config, domain: hostname });
    }
  }

  await admin.from('custom_domains').delete().eq('project_id', projectId).eq('root', apexOf(domain));
  await admin.from('projects').update({ custom_domain: null }).eq('id', projectId);
}

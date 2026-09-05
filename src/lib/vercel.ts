import 'server-only';

/**
 * The slice of Vercel's API Lumen needs: deploy a set of static files, then
 * attach a domain to the project that deployment created.
 *
 * Everything takes an access token belonging to the user, obtained through the
 * Vercel connector — Lumen never deploys with its own account.
 */

const API = 'https://api.vercel.com';

async function call<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  try {
    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string; code?: string };
    } & T;

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: payload.error?.message ?? `Vercel returned ${response.status}`,
      };
    }
    return { ok: true, data: payload };
  } catch {
    return { ok: false, status: 0, error: 'Could not reach Vercel.' };
  }
}

export interface DeployResult {
  url: string;
  projectId: string;
  projectName: string;
}

export async function deployFiles(params: {
  token: string;
  name: string;
  files: { path: string; content: string }[];
}): Promise<{ ok: true; data: DeployResult } | { ok: false; error: string }> {
  const result = await call<{ url?: string; projectId?: string; name?: string }>(
    params.token,
    '/v13/deployments',
    {
      method: 'POST',
      body: JSON.stringify({
        name: params.name,
        target: 'production',
        files: params.files.map((file) => ({ file: file.path, data: file.content })),
        projectSettings: { framework: null, buildCommand: null, outputDirectory: null },
      }),
    },
  );

  if (!result.ok) return { ok: false, error: result.error };
  if (!result.data.url) return { ok: false, error: 'Vercel accepted the deploy but returned no URL.' };

  return {
    ok: true,
    data: {
      url: `https://${result.data.url}`,
      projectId: result.data.projectId ?? '',
      projectName: result.data.name ?? params.name,
    },
  };
}

export interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  purpose: string;
}

export interface DomainStatus {
  domain: string;
  verified: boolean;
  /** Exactly what to enter at the registrar. */
  records: DnsRecord[];
  misconfigured: boolean;
  note?: string;
}

/** Vercel's documented targets for pointing a domain at a project. */
const APEX_A_RECORD = '76.76.21.21';
const SUBDOMAIN_CNAME = 'cname.vercel-dns.com';

function isApex(domain: string): boolean {
  // Treats two-label domains as apex. Multi-part public suffixes such as
  // .co.uk are handled by the fact that Vercel echoes back apexName, which the
  // caller prefers when present.
  return domain.split('.').length === 2;
}

function routingRecord(domain: string, apexName?: string): DnsRecord {
  const apex = apexName ? domain === apexName : isApex(domain);
  return apex
    ? {
        type: 'A',
        name: '@',
        value: APEX_A_RECORD,
        purpose: 'Points the root of your domain at Vercel.',
      }
    : {
        type: 'CNAME',
        name: domain.split('.')[0],
        value: SUBDOMAIN_CNAME,
        purpose: 'Points this subdomain at Vercel.',
      };
}

interface VercelDomain {
  name?: string;
  apexName?: string;
  verified?: boolean;
  verification?: { type: string; domain: string; value: string; reason?: string }[];
}

function toStatus(domain: string, data: VercelDomain): DomainStatus {
  const records: DnsRecord[] = [routingRecord(domain, data.apexName)];

  for (const challenge of data.verification ?? []) {
    records.push({
      type: 'TXT',
      name: challenge.domain.replace(`.${data.apexName ?? domain}`, '') || '@',
      value: challenge.value,
      purpose: 'Proves to Vercel that you own this domain.',
    });
  }

  return {
    domain,
    verified: Boolean(data.verified),
    records,
    misconfigured: false,
  };
}

export async function addDomain(params: {
  token: string;
  projectId: string;
  domain: string;
}): Promise<{ ok: true; data: DomainStatus } | { ok: false; error: string }> {
  const result = await call<VercelDomain>(
    params.token,
    `/v10/projects/${encodeURIComponent(params.projectId)}/domains`,
    { method: 'POST', body: JSON.stringify({ name: params.domain }) },
  );

  // Already attached to this project is a success from the user's point of view.
  if (!result.ok && result.status !== 409) return { ok: false, error: result.error };
  if (!result.ok) return getDomain(params);

  return { ok: true, data: toStatus(params.domain, result.data) };
}

export async function getDomain(params: {
  token: string;
  projectId: string;
  domain: string;
}): Promise<{ ok: true; data: DomainStatus } | { ok: false; error: string }> {
  const result = await call<VercelDomain>(
    params.token,
    `/v9/projects/${encodeURIComponent(params.projectId)}/domains/${encodeURIComponent(params.domain)}`,
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: toStatus(params.domain, result.data) };
}

/** Asks Vercel to re-check DNS now rather than waiting for its own schedule. */
export async function verifyDomain(params: {
  token: string;
  projectId: string;
  domain: string;
}): Promise<{ ok: true; data: DomainStatus } | { ok: false; error: string }> {
  const result = await call<VercelDomain>(
    params.token,
    `/v9/projects/${encodeURIComponent(params.projectId)}/domains/${encodeURIComponent(params.domain)}/verify`,
    { method: 'POST' },
  );

  // A failed verify is the normal state while DNS propagates, so report the
  // current status rather than treating it as an error.
  if (!result.ok) return getDomain(params);
  return { ok: true, data: toStatus(params.domain, result.data) };
}

export async function removeDomain(params: {
  token: string;
  projectId: string;
  domain: string;
}): Promise<{ ok: boolean; error?: string }> {
  const result = await call(
    params.token,
    `/v9/projects/${encodeURIComponent(params.projectId)}/domains/${encodeURIComponent(params.domain)}`,
    { method: 'DELETE' },
  );
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

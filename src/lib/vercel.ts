import 'server-only';

/**
 * The slice of Vercel's API Lumen needs: deploy a set of static files, then
 * attach a domain to the project that deployment created.
 *
 * Everything takes an access token belonging to the user, obtained through the
 * Vercel connector — Lumen never deploys with its own account.
 */

const API = 'https://api.vercel.com';

/**
 * A token issued under a Vercel team only sees that team's resources when the
 * team is named on the request, so every call carries it when there is one.
 */
function withTeam(path: string, teamId?: string): string {
  if (!teamId) return path;
  return `${path}${path.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(teamId)}`;
}

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

interface VercelDeployment {
  id?: string;
  url?: string;
  projectId?: string;
  name?: string;
  readyState?: string;
  alias?: string[];
}

/**
 * The address to show the user. A production deployment gets a stable alias
 * (`the-project.vercel.app`) alongside its one-off build URL; the alias is the
 * one worth handing over, so prefer the shortest one Vercel reports.
 */
function bestUrl(deployment: VercelDeployment): string | undefined {
  const alias = (deployment.alias ?? []).filter(Boolean).sort((a, b) => a.length - b.length)[0];
  return alias ?? deployment.url;
}

export async function deployFiles(params: {
  token: string;
  name: string;
  teamId?: string;
  files: { path: string; content: string }[];
}): Promise<{ ok: true; data: DeployResult } | { ok: false; error: string }> {
  const result = await call<VercelDeployment>(params.token, withTeam('/v13/deployments', params.teamId), {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      target: 'production',
      // base64 rather than raw text: it survives any byte the generated site
      // happens to contain without depending on JSON transport encoding.
      files: params.files.map((file) => ({
        file: file.path,
        data: Buffer.from(file.content, 'utf8').toString('base64'),
        encoding: 'base64',
      })),
      projectSettings: { framework: null, buildCommand: null, outputDirectory: null },
    }),
  });

  if (!result.ok) return { ok: false, error: result.error };

  const created = result.data;
  if (!created.url) return { ok: false, error: 'Vercel accepted the deploy but returned no URL.' };

  const ready = created.id
    ? await waitForReady({ token: params.token, teamId: params.teamId, id: created.id })
    : null;

  if (ready && !ready.ok) return ready;

  const deployment = ready?.deployment ?? created;

  return {
    ok: true,
    data: {
      url: `https://${bestUrl(deployment) ?? created.url}`,
      projectId: created.projectId ?? deployment.projectId ?? '',
      projectName: created.name ?? params.name,
    },
  };
}

/**
 * Vercel answers the create call while the deployment is still queued, so the
 * URL it hands back 404s for a moment. These sites are static — no build step —
 * so waiting the few seconds out means the link works when the user clicks it.
 * Running long is not a failure: the deployment finishes on Vercel regardless,
 * so a timeout falls through to returning the URL anyway.
 */
async function waitForReady(params: {
  token: string;
  teamId?: string;
  id: string;
}): Promise<{ ok: true; deployment: VercelDeployment } | { ok: false; error: string }> {
  const deadline = Date.now() + 60_000;

  for (let attempt = 0; ; attempt += 1) {
    const result = await call<VercelDeployment>(
      params.token,
      withTeam(`/v13/deployments/${encodeURIComponent(params.id)}`, params.teamId),
    );

    // A transient read failure says nothing about the deployment itself.
    if (result.ok) {
      const state = result.data.readyState;
      if (state === 'READY') return { ok: true, deployment: result.data };
      if (state === 'ERROR' || state === 'CANCELED') {
        return { ok: false, error: 'Vercel could not finish this deployment. Check its build logs.' };
      }
      if (Date.now() >= deadline) return { ok: true, deployment: result.data };
    } else if (Date.now() >= deadline) {
      return { ok: true, deployment: {} };
    }

    // Back off from half a second to two, so a fast deploy returns quickly.
    await new Promise((resolve) => setTimeout(resolve, Math.min(500 * (attempt + 1), 2_000)));
  }
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
  teamId?: string;
}): Promise<{ ok: true; data: DomainStatus } | { ok: false; error: string }> {
  const result = await call<VercelDomain>(
    params.token,
    withTeam(`/v10/projects/${encodeURIComponent(params.projectId)}/domains`, params.teamId),
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
  teamId?: string;
}): Promise<{ ok: true; data: DomainStatus } | { ok: false; error: string }> {
  const result = await call<VercelDomain>(
    params.token,
    withTeam(
      `/v9/projects/${encodeURIComponent(params.projectId)}/domains/${encodeURIComponent(params.domain)}`,
      params.teamId,
    ),
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: toStatus(params.domain, result.data) };
}

/** Asks Vercel to re-check DNS now rather than waiting for its own schedule. */
export async function verifyDomain(params: {
  token: string;
  projectId: string;
  domain: string;
  teamId?: string;
}): Promise<{ ok: true; data: DomainStatus } | { ok: false; error: string }> {
  const result = await call<VercelDomain>(
    params.token,
    withTeam(
      `/v9/projects/${encodeURIComponent(params.projectId)}/domains/${encodeURIComponent(params.domain)}/verify`,
      params.teamId,
    ),
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
  teamId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const result = await call(
    params.token,
    withTeam(
      `/v9/projects/${encodeURIComponent(params.projectId)}/domains/${encodeURIComponent(params.domain)}`,
      params.teamId,
    ),
    { method: 'DELETE' },
  );
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

// --------------------------------------------------------- buying a domain --

export interface DomainOffer {
  domain: string;
  available: boolean;
  /** USD for the whole registration period. Absent when Vercel will not quote. */
  price?: number;
  /** Years the price covers. */
  years?: number;
}

/**
 * Availability and price for one domain. Vercel answers these separately, and a
 * taken domain has no price, so a failed price lookup is not an error.
 */
export async function checkDomain(params: {
  token: string;
  teamId?: string;
  domain: string;
}): Promise<DomainOffer> {
  const status = await call<{ available?: boolean }>(
    params.token,
    withTeam(`/v4/domains/status?name=${encodeURIComponent(params.domain)}`, params.teamId),
  );

  if (!status.ok || !status.data.available) {
    return { domain: params.domain, available: false };
  }

  const price = await call<{ price?: number; period?: number }>(
    params.token,
    withTeam(`/v4/domains/price?name=${encodeURIComponent(params.domain)}`, params.teamId),
  );

  return {
    domain: params.domain,
    available: true,
    price: price.ok ? price.data.price : undefined,
    years: price.ok ? price.data.period : undefined,
  };
}

/** The endings worth offering a small business, cheapest intent first. */
export const SUGGESTED_TLDS = ['com', 'in', 'co', 'co.in', 'shop', 'studio', 'online'] as const;

/** Strips whatever the user typed down to a registrable second-level label. */
export function toDomainLabel(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .split('.')[0]
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

/**
 * Buys a domain on the user's own Vercel account.
 *
 * expectedPrice is sent so Vercel rejects the purchase if its price moved
 * between the quote the user agreed to and this call — the user is never
 * charged an amount they did not see.
 */
export async function buyDomain(params: {
  token: string;
  teamId?: string;
  domain: string;
  expectedPrice: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await call<unknown>(params.token, withTeam('/v4/domains/buy', params.teamId), {
    method: 'POST',
    body: JSON.stringify({
      name: params.domain,
      expectedPrice: params.expectedPrice,
      renew: true,
    }),
  });

  if (result.ok) return { ok: true };

  // 402 is Vercel's "no payment method on this account", which is the one
  // failure the user can fix in a minute, so it says exactly that.
  if (result.status === 402) {
    return {
      ok: false,
      error: 'Vercel has no payment method for this account. Add a card in Vercel, then try again.',
    };
  }
  return { ok: false, error: result.error };
}

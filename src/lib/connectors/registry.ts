import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptSecret, encryptSecret } from '@/lib/crypto';
import { CONNECTORS } from './providers';
import type { Connector, ConnectorContext, ConnectorScope, ConnectorStatus } from './types';

export { CATEGORY_LABELS } from './types';
export type { Connector, ConnectorStatus } from './types';

export function allConnectors(scope?: ConnectorScope): Connector[] {
  return scope ? CONNECTORS.filter((connector) => connector.scope === scope) : CONNECTORS;
}

export function getConnector(provider: string): Connector | undefined {
  return CONNECTORS.find((connector) => connector.provider === provider);
}

function decodeCredentials(encrypted: string | null): Record<string, string> | null {
  if (!encrypted) return null;
  try {
    return JSON.parse(decryptSecret(encrypted)) as Record<string, string>;
  } catch {
    // A credential blob that will not decrypt (rotated master key) reads as
    // "not connected" rather than crashing the settings page.
    return null;
  }
}

export function encodeCredentials(credentials: Record<string, string>): string {
  return encryptSecret(JSON.stringify(credentials));
}

export async function loadAccountContext(userId: string, provider: string): Promise<ConnectorContext> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('connectors_account')
    .select('encrypted_credentials, metadata')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle();

  return {
    userId,
    credentials: decodeCredentials(data?.encrypted_credentials ?? null),
    config: (data?.metadata as Record<string, unknown>) ?? {},
  };
}

export async function loadProjectContext(
  userId: string,
  projectId: string,
  provider: string,
): Promise<ConnectorContext> {
  const supabase = createAdminClient();

  const [{ data: projectRow }, accountContext] = await Promise.all([
    supabase
      .from('connectors_project')
      .select('config')
      .eq('project_id', projectId)
      .eq('provider', provider)
      .maybeSingle(),
    loadAccountContext(userId, provider),
  ]);

  const config = (projectRow?.config as Record<string, unknown>) ?? {};

  return {
    userId,
    projectId,
    // Project-scoped connectors keep their secrets in the account row so one
    // credential can serve several sites; project rows hold only per-site config.
    credentials:
      accountContext.credentials ??
      (config.credentials ? (config.credentials as Record<string, string>) : null),
    config,
  };
}

export interface ConnectorCard {
  provider: string;
  name: string;
  category: Connector['category'];
  summary: string;
  authKind: Connector['auth']['kind'];
  fields: { name: string; label: string; placeholder?: string; secret?: boolean; help?: string }[];
  configured: boolean;
  status: ConnectorStatus;
  canSync: boolean;
}

/** Everything the connector grid needs, computed on the server. */
export async function buildConnectorCards(params: {
  userId: string;
  scope: ConnectorScope;
  projectId?: string;
}): Promise<ConnectorCard[]> {
  const connectors = allConnectors(params.scope);

  return Promise.all(
    connectors.map(async (connector) => {
      const context =
        params.scope === 'project' && params.projectId
          ? await loadProjectContext(params.userId, params.projectId, connector.provider)
          : await loadAccountContext(params.userId, connector.provider);

      return {
        provider: connector.provider,
        name: connector.name,
        category: connector.category,
        summary: connector.summary,
        authKind: connector.auth.kind,
        fields: connector.auth.kind === 'api_key' ? connector.auth.fields : [],
        configured: connector.isConfigured(),
        status: await connector.status(context),
        canSync: Boolean(connector.sync),
      };
    }),
  );
}

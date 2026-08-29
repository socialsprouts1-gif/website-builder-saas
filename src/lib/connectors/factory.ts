import type {
  Connector,
  ConnectorContext,
  ConnectorField,
  ConnectorScope,
  ConnectorStatus,
  ConnectorSyncResult,
} from './types';

/**
 * Two factories cover almost every integration: one for OAuth providers and one
 * for the API-key/webhook kind. A provider only writes bespoke code when it has
 * genuinely bespoke behaviour (see github.ts, vercel.ts).
 */

function defaultStatus(connected: boolean, name: string): ConnectorStatus {
  return {
    connected,
    label: connected ? 'Connected' : 'Not connected',
    detail: connected ? `${name} is wired up.` : undefined,
  };
}

export function oauthConnector(spec: {
  provider: string;
  name: string;
  category: Connector['category'];
  scope?: ConnectorScope;
  summary: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  envKey: string;
  clientId?: string;
  clientSecret?: string;
  verify?: (accessToken: string) => Promise<ConnectorSyncResult>;
  sync?: (context: ConnectorContext) => Promise<ConnectorSyncResult>;
}): Connector {
  return {
    provider: spec.provider,
    name: spec.name,
    category: spec.category,
    scope: spec.scope ?? 'account',
    summary: spec.summary,
    auth: {
      kind: 'oauth',
      authorizeUrl: spec.authorizeUrl,
      tokenUrl: spec.tokenUrl,
      scopes: spec.scopes,
      envKey: spec.envKey,
    },
    isConfigured: () => Boolean(spec.clientId && spec.clientSecret),
    async connect(context) {
      const token = context.credentials?.access_token;
      if (!token) return { ok: false, message: `Finish the ${spec.name} sign-in first.` };
      if (spec.verify) return spec.verify(token);
      return { ok: true, message: `${spec.name} connected.` };
    },
    sync: spec.sync,
    async status(context) {
      return defaultStatus(Boolean(context.credentials?.access_token), spec.name);
    },
  };
}

export function apiKeyConnector(spec: {
  provider: string;
  name: string;
  category: Connector['category'];
  scope?: ConnectorScope;
  summary: string;
  fields: ConnectorField[];
  verify?: (credentials: Record<string, string>) => Promise<ConnectorSyncResult>;
  sync?: (context: ConnectorContext) => Promise<ConnectorSyncResult>;
}): Connector {
  return {
    provider: spec.provider,
    name: spec.name,
    category: spec.category,
    scope: spec.scope ?? 'account',
    summary: spec.summary,
    auth: { kind: 'api_key', fields: spec.fields },
    // API-key connectors need nothing from the deployment — the user supplies
    // the credential, so they are always available to connect.
    isConfigured: () => true,
    async connect(context) {
      const credentials = context.credentials ?? {};
      const missing = spec.fields.filter((field) => !credentials[field.name]?.trim());
      if (missing.length > 0) {
        return { ok: false, message: `Missing: ${missing.map((field) => field.label).join(', ')}` };
      }
      if (spec.verify) return spec.verify(credentials);
      return { ok: true, message: `${spec.name} connected.` };
    },
    sync: spec.sync,
    async status(context) {
      const hasAll = spec.fields.every((field) => context.credentials?.[field.name]);
      return defaultStatus(hasAll, spec.name);
    },
  };
}

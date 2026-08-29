/**
 * The connector contract (spec Section 10).
 *
 * Every integration implements this one interface and is registered in
 * registry.ts. The UI renders whatever the registry contains, so adding the
 * next integration is a new module plus a registry line — never a UI change.
 */

export type ConnectorScope = 'account' | 'project';

export type ConnectorAuth =
  | { kind: 'oauth'; authorizeUrl: string; tokenUrl: string; scopes: string[]; envKey: string }
  | { kind: 'api_key'; fields: ConnectorField[] }
  | { kind: 'none' };

export interface ConnectorField {
  name: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  help?: string;
}

export interface ConnectorStatus {
  connected: boolean;
  label: string;
  detail?: string;
  lastSyncedAt?: string | null;
}

export interface ConnectorContext {
  userId: string;
  projectId?: string;
  /** Decrypted credentials for this connector, or null when not connected. */
  credentials: Record<string, string> | null;
  config: Record<string, unknown>;
}

export interface ConnectorSyncResult {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface Connector {
  provider: string;
  name: string;
  category: 'deploy' | 'business' | 'content' | 'commerce';
  scope: ConnectorScope;
  summary: string;
  auth: ConnectorAuth;
  /** Whether the deployment has the credentials this connector needs. */
  isConfigured(): boolean;
  /** Validates supplied credentials before they are stored. */
  connect(context: ConnectorContext): Promise<ConnectorSyncResult>;
  disconnect?(context: ConnectorContext): Promise<void>;
  /** Pulls or pushes data. Optional — not every connector has anything to sync. */
  sync?(context: ConnectorContext): Promise<ConnectorSyncResult>;
  status(context: ConnectorContext): Promise<ConnectorStatus>;
}

export const CATEGORY_LABELS: Record<Connector['category'], string> = {
  deploy: 'Dev & deploy',
  business: 'Business tools',
  content: 'Content sources',
  commerce: 'Commerce & bookings',
};

import { SectionHeader } from '@/components/ui/Card';
import { ConnectorGrid } from '@/components/app/ConnectorGrid';
import { requireUser } from '@/lib/auth';
import { buildConnectorCards } from '@/lib/connectors/registry';

export const metadata = { title: 'Connectors' };
export const dynamic = 'force-dynamic';

export default async function AccountConnectorsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { connected, error } = await searchParams;
  const cards = await buildConnectorCards({ userId: user.id, scope: 'account' });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <SectionHeader
        title="Connectors"
        description="Credentials you connect once and reuse across every site you build."
      />

      {connected ? (
        <p className="mb-6 rounded-[10px] border border-accent/30 bg-accent-soft px-4 py-3 text-[13px] text-accent">
          {connected} connected.
        </p>
      ) : null}
      {error ? (
        <p className="mb-6 rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-3 text-[13px] text-[#e5735a]">
          {OAUTH_ERRORS[error] ?? 'That connection did not complete.'}
        </p>
      ) : null}

      <ConnectorGrid cards={cards} />
    </div>
  );
}

const OAUTH_ERRORS: Record<string, string> = {
  state_mismatch: 'That sign-in could not be verified. Start the connection again.',
  token_exchange_failed: 'The provider refused the connection. Try again.',
  not_configured: 'This provider is not configured on this deployment yet.',
  verification_failed: 'The token came back but the provider rejected it.',
  unknown_connector: 'That connector does not exist.',
};

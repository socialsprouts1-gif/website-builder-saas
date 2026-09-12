import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SectionHeader } from '@/components/ui/Card';
import { ConnectorGrid } from '@/components/app/ConnectorGrid';
import { PaymentPanel } from '@/components/app/PaymentPanel';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { buildConnectorCards } from '@/lib/connectors/registry';

export const metadata = { title: 'Project connectors' };
export const dynamic = 'force-dynamic';

export default async function ProjectConnectorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const supabase = await createClient();
  const { data: project } = await supabase.from('projects').select('id, name').eq('id', id).maybeSingle();
  if (!project) notFound();

  // Asked for separately and allowed to fail: the payment columns arrive in
  // migration 0009, and the page should still open without them.
  const { data: payment } = await supabase
    .from('projects')
    .select('payment_url, payment_label')
    .eq('id', id)
    .maybeSingle();

  const cards = await buildConnectorCards({ userId: user.id, scope: 'project', projectId: id });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <SectionHeader
        title="Connectors for this site"
        description={`What ${project.name} is wired into. Account-wide credentials live in Settings.`}
      />

      <PaymentPanel
        projectId={id}
        initialUrl={payment?.payment_url ?? null}
        initialLabel={payment?.payment_label ?? null}
      />

      <ConnectorGrid cards={cards} projectId={id} />

      <p className="mt-8 text-[13px] text-ink-muted">
        Looking for GitHub, Vercel, Analytics or Slack?{' '}
        <Link href="/app/settings/connectors" className="text-accent hover:underline">
          Those connect once at the account level.
        </Link>
      </p>
    </div>
  );
}

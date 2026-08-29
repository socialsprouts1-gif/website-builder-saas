'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';

export function DeployPanel({
  projectId,
  defaultName,
  vercelConnected,
  githubConnected,
}: {
  projectId: string;
  defaultName: string;
  vercelConnected: boolean;
  githubConnected: boolean;
}) {
  const [repoName, setRepoName] = useState(defaultName);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function deploy(target: 'vercel' | 'github' | 'zip') {
    setBusy(target);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/deploy`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target, repoName }),
      });

      if (target === 'zip') {
        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error ?? 'Export failed');
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${repoName || 'lumen-site'}.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        return;
      }

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Deploy failed');
      if (payload.url) {
        setResult({ url: payload.url, label: target === 'vercel' ? 'View live site' : 'Open repository' });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not work');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <Field label="Name" hint="Used for the Vercel project, the repository, and the zip file.">
          <Input
            value={repoName}
            onChange={(event) => setRepoName(event.target.value)}
            placeholder="bistro-lunaire"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <DeployButton
            title="Vercel"
            body={vercelConnected ? 'Deploy to production.' : 'Connect Vercel first.'}
            disabled={!vercelConnected || busy !== null}
            busy={busy === 'vercel'}
            onClick={() => deploy('vercel')}
          />
          <DeployButton
            title="GitHub"
            body={githubConnected ? 'Push to a private repo.' : 'Connect GitHub first.'}
            disabled={!githubConnected || busy !== null}
            busy={busy === 'github'}
            onClick={() => deploy('github')}
          />
          <DeployButton
            title="Download"
            body="A zip of the whole site."
            disabled={busy !== null}
            busy={busy === 'zip'}
            onClick={() => deploy('zip')}
          />
        </div>
      </Card>

      {result ? (
        <p className="rounded-[10px] border border-accent/30 bg-accent-soft px-4 py-3 text-[13px] text-accent">
          Done —{' '}
          <a href={result.url} target="_blank" rel="noreferrer" className="underline">
            {result.label}
          </a>
        </p>
      ) : null}

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-3 text-[13px] text-[#e5735a]">
          {error}
        </p>
      ) : null}

      {!vercelConnected || !githubConnected ? (
        <p className="text-[13px] text-ink-muted">
          <Link href="/app/settings/connectors" className="text-accent hover:underline">
            Connect your deploy targets
          </Link>{' '}
          to enable one-click publishing. The zip export always works.
        </p>
      ) : null}
    </div>
  );
}

function DeployButton({
  title,
  body,
  disabled,
  busy,
  onClick,
}: {
  title: string;
  body: string;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <div className="rounded-card border border-hairline p-4">
      <p className="text-sm text-ink-primary">{title}</p>
      <p className="mt-1 text-[12.5px] text-ink-muted">{body}</p>
      <Button size="sm" className="mt-3 w-full" onClick={onClick} disabled={disabled}>
        {busy ? 'Working…' : title === 'Download' ? 'Download zip' : 'Deploy'}
      </Button>
    </div>
  );
}

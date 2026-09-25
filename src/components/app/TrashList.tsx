'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export interface TrashedProject {
  id: string;
  name: string;
  deletedAt: string;
}

/**
 * Restoring, and the one press that is genuinely final.
 *
 * Emptying asks again, in the same place, rather than in a dialog somebody
 * dismisses without reading — and it says what goes with it, because a project
 * takes its versions, its enquiries and its orders when it goes.
 */
export function TrashList({ projects }: { projects: TrashedProject[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: 'restore' | 'purge') {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(
        action === 'restore' ? `/api/projects/${id}/restore` : `/api/projects/${id}?purge=1`,
        { method: action === 'restore' ? 'POST' : 'DELETE' },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'That did not work');
      }
      setConfirming(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not work');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {error ? (
        <p className="mt-4 rounded-card border border-[#c46026]/40 bg-[#c46026]/10 px-4 py-3 text-[13px] text-ink-secondary">
          {error}
        </p>
      ) : null}

      <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
        {projects.map((project) => (
          <li key={project.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] text-ink-primary">{project.name}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">
                In the trash since{' '}
                {new Date(project.deletedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                })}
                . Its published address stopped working when it was deleted.
              </p>
            </div>

            {confirming === project.id ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] text-ink-secondary">
                  Delete for good, with every version, enquiry and order?
                </span>
                <Button size="sm" onClick={() => act(project.id, 'purge')} disabled={busy === project.id}>
                  {busy === project.id ? 'Deleting…' : 'Yes, delete'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setConfirming(null)}>
                  Keep it
                </Button>
              </span>
            ) : (
              <span className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => act(project.id, 'restore')}
                  disabled={busy === project.id}
                >
                  {busy === project.id ? 'Restoring…' : 'Restore'}
                </Button>
                <button
                  type="button"
                  onClick={() => setConfirming(project.id)}
                  className="text-[12.5px] text-ink-muted transition hover:text-[#e5735a]"
                >
                  Delete for good
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

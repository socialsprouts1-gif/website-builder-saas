'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import type { VisualEdit } from '@/lib/generation/html-edit';

interface Selection {
  lumenId: string;
  tag: string;
  kind: 'text' | 'image' | 'block';
  text: string;
  src: string | null;
  alt: string | null;
}

/**
 * Drives the sandboxed preview over postMessage: click an element in the page,
 * edit it here, and the change is written back into the real generated HTML on
 * save. Colours come from the project's own design tokens — deliberately a
 * constrained palette rather than an open picker that lets a user wreck the
 * design (spec Section 7).
 */
export function VisualEditorPanel({
  projectId,
  page,
  onSaved,
}: {
  projectId: string;
  page: string;
  onSaved: () => void;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pending, setPending] = useState<VisualEdit[]>([]);
  const [draftText, setDraftText] = useState('');
  const [draftSrc, setDraftSrc] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || data.source !== 'lumen-preview') return;
      if (data.type === 'select') {
        const payload = data.payload as Selection;
        setSelection(payload);
        setDraftText(payload.text ?? '');
        setDraftSrc(payload.src ?? '');
        setError(null);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function postToPreview(message: Record<string, unknown>) {
    const frame = document.querySelector<HTMLIFrameElement>('iframe[title$="preview"]');
    frame?.contentWindow?.postMessage({ source: 'lumen-editor', ...message }, '*');
  }

  function queue(edit: VisualEdit) {
    setPending((current) => {
      const withoutDuplicate = current.filter((existing) =>
        existing.kind === 'token' || edit.kind === 'token'
          ? !(existing.kind === 'token' && edit.kind === 'token' && existing.name === edit.name)
          : !('lumenId' in existing && 'lumenId' in edit && existing.lumenId === edit.lumenId && existing.kind === edit.kind),
      );
      return [...withoutDuplicate, edit];
    });
  }

  function applyText() {
    if (!selection) return;
    queue({ kind: 'text', lumenId: selection.lumenId, value: draftText });
    postToPreview({ type: 'preview-text', value: draftText });
  }

  function applyImage() {
    if (!selection || !draftSrc.trim()) return;
    queue({ kind: 'image', lumenId: selection.lumenId, src: draftSrc.trim(), alt: selection.alt ?? undefined });
    postToPreview({ type: 'preview-image', value: draftSrc.trim() });
  }

  function removeElement() {
    if (!selection) return;
    queue({ kind: 'remove', lumenId: selection.lumenId });
    setSelection(null);
    postToPreview({ type: 'deselect' });
  }

  async function save() {
    if (pending.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/visual-edit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ edits: pending, path: page }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not save those edits');
      setPending([]);
      setSelection(null);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save those edits');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5">
        <p className="text-[13px] leading-relaxed text-ink-secondary">
          Click anything in the preview to select it. Edits are queued here and written into your site&apos;s
          real code when you save.
        </p>

        {selection ? (
          <div className="space-y-4 rounded-card border border-hairline bg-raised p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              &lt;{selection.tag}&gt; · {selection.lumenId}
            </p>

            {selection.kind === 'image' ? (
              <Field label="Image URL" hint="Paste a URL, or upload one from the Connectors tab.">
                <Input value={draftSrc} onChange={(event) => setDraftSrc(event.target.value)} />
              </Field>
            ) : selection.kind === 'text' ? (
              <Field label="Text">
                <Textarea rows={3} value={draftText} onChange={(event) => setDraftText(event.target.value)} />
              </Field>
            ) : (
              <p className="text-[13px] text-ink-muted">
                This is a container. Select the text or image inside it to edit, or remove the whole block.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {selection.kind === 'text' ? (
                <Button size="sm" onClick={applyText}>
                  Apply text
                </Button>
              ) : null}
              {selection.kind === 'image' ? (
                <Button size="sm" onClick={applyImage}>
                  Apply image
                </Button>
              ) : null}
              <Button size="sm" variant="danger" onClick={removeElement}>
                Remove element
              </Button>
            </div>
          </div>
        ) : (
          <p className="rounded-card border border-dashed border-hairline px-4 py-8 text-center text-[13px] text-ink-muted">
            Nothing selected yet.
          </p>
        )}

        {pending.length > 0 ? (
          <div className="space-y-2 rounded-card border border-hairline bg-raised p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              {pending.length} unsaved change{pending.length === 1 ? '' : 's'}
            </p>
            <ul className="space-y-1 text-[12.5px] text-ink-secondary">
              {pending.map((edit, index) => (
                <li key={index} className="truncate">
                  {edit.kind === 'token'
                    ? `token --${edit.name} → ${edit.value}`
                    : `${edit.kind} · ${edit.lumenId}`}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-3.5 py-2.5 text-[13px] text-[#e5735a]">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2 border-t border-hairline p-3">
        <Button className="flex-1" onClick={save} disabled={pending.length === 0 || saving}>
          {saving ? 'Saving…' : `Save ${pending.length || ''} change${pending.length === 1 ? '' : 's'}`.trim()}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setPending([]);
            setSelection(null);
            onSaved();
          }}
          disabled={saving}
        >
          Discard
        </Button>
      </div>
    </div>
  );
}

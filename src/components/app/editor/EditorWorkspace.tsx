'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Field';
import { cn } from '@/components/ui/cn';
import { LayersPanel, type OutlineBlock } from './LayersPanel';
import { Inspector, type PaletteToken, type Selection } from './Inspector';
import { ThemePanel } from './ThemePanel';
import { AddSection } from './AddSection';
import { describeEdit, type ClientVisualEdit } from '@/lib/generation/html-edit';
import { pageLabel } from '@/lib/pages';

type Viewport = 'desktop' | 'tablet' | 'mobile';
const WIDTHS: Record<Viewport, string> = { desktop: '100%', tablet: '820px', mobile: '390px' };

export interface BlockMenuItem {
  id: string;
  name: string;
  description: string;
  group: 'Text' | 'Media' | 'Layout' | 'Action';
  /** What must be collected before it can be inserted. */
  needs: 'image' | 'video' | null;
}

/**
 * The editor: blocks on the left, the live page in the middle, the inspector on
 * the right. Changes preview instantly in the iframe over postMessage and are
 * queued locally; Save posts them to the server, which writes them into the
 * project's real HTML and stores a new version.
 */
export function EditorWorkspace({
  projectId,
  projectName,
  pages,
  blockMenu,
}: {
  projectId: string;
  projectName: string;
  pages: string[];
  blockMenu: BlockMenuItem[];
}) {
  const router = useRouter();
  const frameRef = useRef<HTMLIFrameElement>(null);

  const [page, setPage] = useState(pages[0] ?? 'index.html');
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [blocks, setBlocks] = useState<OutlineBlock[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [palette, setPalette] = useState<PaletteToken[]>([]);
  const [pending, setPending] = useState<ClientVisualEdit[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBlocks, setShowBlocks] = useState(false);
  const [rail, setRail] = useState<'sections' | 'theme'>('sections');
  const [frameKey, setFrameKey] = useState(0);
  const [awaitingOutline, setAwaitingOutline] = useState(true);

  const post = useCallback((message: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage({ source: 'lumen-editor', ...message }, '*');
  }, []);

  /**
   * Ask the page for its outline and palette.
   *
   * The bridge pushes both when it boots, but a single push is not enough to
   * rely on: the frame can finish loading before the listener below is
   * attached, and in development StrictMode tears that listener down and
   * re-attaches it, so anything arriving in the gap is gone. Asking is cheap,
   * so we ask until we get an answer.
   */
  const requestState = useCallback(() => {
    post({ type: 'outline' });
    post({ type: 'tokens' });
  }, [post]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || data.source !== 'lumen-preview') return;
      if (data.type === 'ready' || data.type === 'outline') setBlocks(data.payload ?? []);
      if (data.type === 'select') setSelection(data.payload as Selection);
      if (data.type === 'tokens') setPalette((data.payload as PaletteToken[]) ?? []);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Retry until the page answers, then stop. Covers the load race, the
  // StrictMode remount, and a page that is simply slow to parse.
  useEffect(() => {
    setBlocks([]);
    let attempts = 0;
    requestState();
    const timer = setInterval(() => {
      attempts += 1;
      if (attempts > 12) {
        clearInterval(timer);
        return;
      }
      requestState();
    }, 300);
    return () => clearInterval(timer);
  }, [frameKey, page, requestState]);

  useEffect(() => {
    if (blocks.length > 0) setAwaitingOutline(false);
  }, [blocks]);

  /** Queues an edit, replacing an earlier one that targets the same thing. */
  const queue = useCallback((edit: ClientVisualEdit) => {
    setPending((current) => {
      const isSuperseded = (existing: ClientVisualEdit) => {
        if (existing.kind !== edit.kind) return false;
        if (edit.kind === 'token' && existing.kind === 'token') return existing.name === edit.name;
        // Style edits merge rather than replace, so they are never superseded.
        if (edit.kind === 'style' || edit.kind === 'insert') return false;
        if ('lumenId' in existing && 'lumenId' in edit) return existing.lumenId === edit.lumenId;
        return false;
      };
      return [...current.filter((existing) => !isSuperseded(existing)), edit];
    });
  }, []);

  function editText(value: string) {
    if (!selection) return;
    queue({ kind: 'text', lumenId: selection.lumenId, value });
    post({ type: 'preview-text', lumenId: selection.lumenId, value });
  }

  function editStyle(styles: Record<string, string>) {
    if (!selection) return;
    queue({ kind: 'style', lumenId: selection.lumenId, styles });
    post({ type: 'preview-style', lumenId: selection.lumenId, styles });
    setSelection({ ...selection });
  }

  function editImage(src: string, alt?: string, lumenId?: string) {
    const target = lumenId ?? selection?.lumenId;
    if (!target || !src) return;
    queue({ kind: 'image', lumenId: target, src, alt });
    post({ type: 'preview-image', lumenId: target, value: src });
  }

  function move(lumenId: string, direction: 'up' | 'down') {
    queue({ kind: 'move', lumenId, direction });
    post({ type: 'preview-move', lumenId, direction });
  }

  function duplicate(lumenId: string) {
    queue({ kind: 'duplicate', lumenId });
    // A duplicate cannot be previewed faithfully — the copy needs fresh ids the
    // server assigns — so it is shown as pending and appears after saving.
    setNotice('Duplicate queued. Save to see it on the page.');
  }

  function remove(lumenId: string) {
    queue({ kind: 'remove', lumenId });
    post({ type: 'preview-remove', lumenId });
    if (selection?.lumenId === lumenId) setSelection(null);
  }

  function addBlock(blockId: string, options: { imageUrl?: string; videoUrl?: string }) {
    queue({ kind: 'insert', afterLumenId: selection?.lumenId ?? null, blockId, ...options });
    setShowBlocks(false);
    setNotice('Section queued. Save to put it on the page.');
  }

  /**
   * A theme colour. It repaints the whole page instantly through the bridge and
   * is written into the stylesheet on save, so it holds across every page
   * rather than on the one element that happened to be selected.
   */
  function editToken(name: string, value: string) {
    queue({ kind: 'token', name, value });
    post({ type: 'preview-token', name, value });
    setPalette((current) =>
      current.map((token) => (token.name === name ? { ...token, value } : token)),
    );
  }

  async function save() {
    if (pending.length === 0) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/visual-edit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ edits: pending, path: page }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not save those changes');

      setPending([]);
      setSelection(null);
      setNotice(`Saved ${payload.appliedEdits} change${payload.appliedEdits === 1 ? '' : 's'}.`);
      setFrameKey((key) => key + 1);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save those changes');
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setPending([]);
    setSelection(null);
    setFrameKey((key) => key + 1);
    setNotice(null);
    setError(null);
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-4 py-2.5">
        <div className="w-44">
          <Select value={page} onChange={(event) => setPage(event.target.value)} className="py-1.5 text-[12.5px]">
            {pages.map((item) => (
              <option key={item} value={item}>
                {pageLabel(item)}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex gap-0.5">
          {(['desktop', 'tablet', 'mobile'] as Viewport[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setViewport(item)}
              className={cn(
                'rounded-pill px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] transition',
                viewport === item ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:text-ink-primary',
              )}
            >
              {item[0]}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {pending.length > 0 ? (
            <Badge tone="accent">{pending.length} unsaved</Badge>
          ) : notice ? (
            <span className="text-[12px] text-accent">{notice}</span>
          ) : null}
          <Button size="sm" variant="secondary" onClick={discard} disabled={saving || pending.length === 0}>
            Discard
          </Button>
          <Button size="sm" onClick={save} disabled={saving || pending.length === 0}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 lg:grid-cols-[228px_minmax(0,1fr)_280px]">
        <div className="flex min-h-0 flex-col overflow-y-auto border-hairline lg:border-r">
          {/* Two things live in this rail and they are not the same job:
              arranging this page, and setting the look of the whole site. */}
          <div className="flex shrink-0 gap-1 border-b border-hairline p-2">
            {(['sections', 'theme'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRail(item)}
                className={cn(
                  'flex-1 rounded-[8px] px-2 py-1.5 text-[11.5px] capitalize transition',
                  rail === item
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink-muted hover:text-ink-primary',
                )}
              >
                {item}
              </button>
            ))}
          </div>

          {rail === 'sections' ? (
            <>
              <LayersPanel
                blocks={blocks}
                selected={selection?.lumenId ?? null}
                onSelect={(lumenId) => post({ type: 'select', lumenId })}
                onMove={move}
                onDuplicate={duplicate}
                onRemove={remove}
                onAdd={() => setShowBlocks((value) => !value)}
                loading={awaitingOutline}
              />

              {showBlocks ? (
                <AddSection
                  blocks={blockMenu}
                  projectId={projectId}
                  belowLabel={selection?.label ?? null}
                  onAdd={addBlock}
                  onCancel={() => setShowBlocks(false)}
                />
              ) : null}
            </>
          ) : (
            <ThemePanel palette={palette} onToken={editToken} loading={awaitingOutline} />
          )}
        </div>

        <div className="flex min-h-0 justify-center overflow-auto bg-[var(--bg-base-deep)] p-4">
          <iframe
            key={frameKey}
            ref={frameRef}
            src={`/preview/${projectId}/${page}?editor=1&k=${frameKey}`}
            onLoad={requestState}
            title={`${projectName} editor`}
            // No allow-same-origin: generated code runs in an opaque origin.
            sandbox="allow-scripts allow-forms"
            className="h-full w-full rounded-[10px] border-0 bg-white transition-[width] duration-300"
            style={{ width: WIDTHS[viewport], maxWidth: '100%' }}
          />
        </div>

        <div className="min-h-0 overflow-y-auto border-hairline lg:border-l">
          <Inspector
            selection={selection}
            projectId={projectId}
            palette={palette}
            onText={editText}
            onStyle={editStyle}
            onImage={editImage}
            onRemove={() => selection && remove(selection.lumenId)}
            onDuplicate={() => selection && duplicate(selection.lumenId)}
          />

          {pending.length > 0 ? (
            <div className="border-t border-hairline p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Unsaved</p>
              <ul className="mt-2 space-y-1">
                {pending.map((edit, index) => (
                  <li key={index} className="truncate text-[11.5px] text-ink-secondary">
                    {describeEdit(edit)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? (
            <p className="mx-4 mb-4 rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-3 py-2 text-[12px] text-[#e5735a]">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

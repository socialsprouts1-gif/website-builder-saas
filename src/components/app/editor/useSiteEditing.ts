'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { OutlineBlock } from './LayersPanel';
import type { PaletteToken, Selection } from './Inspector';
import type { ClientVisualEdit } from '@/lib/generation/html-edit';

/**
 * Editing a page through the sandboxed preview.
 *
 * Extracted from the three-pane editor so the workspace's own "Visual edit"
 * tab can be the same editor rather than a second, weaker one. It was a second,
 * weaker one: a panel that listened for a selection and never asked the page
 * for anything, so it showed "nothing selected yet" and — because the bridge's
 * one unprompted push can easily arrive before the listener is attached —
 * frequently went on showing it whatever you clicked.
 *
 * The frame is not ours to touch. Everything crosses by postMessage, edits are
 * queued locally and previewed optimistically, and nothing reaches the site
 * until Save posts the queue to the server.
 */
export function useSiteEditing({
  projectId,
  page,
  frameRef,
  reloadToken,
  onReload,
}: {
  projectId: string;
  page: string;
  frameRef: RefObject<HTMLIFrameElement | null>;
  /** Changes whenever the frame is reloaded, so the outline is asked for again. */
  reloadToken: number;
  /** Reload the preview and re-read whatever the server now holds. */
  onReload: () => void;
}) {
  const [blocks, setBlocks] = useState<OutlineBlock[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [palette, setPalette] = useState<PaletteToken[]>([]);
  const [pending, setPending] = useState<ClientVisualEdit[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [awaitingOutline, setAwaitingOutline] = useState(true);

  const post = useCallback(
    (message: Record<string, unknown>) => {
      frameRef.current?.contentWindow?.postMessage({ source: 'lumen-editor', ...message }, '*');
    },
    [frameRef],
  );

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
    setAwaitingOutline(true);
    let attempts = 0;
    requestState();
    const timer = setInterval(() => {
      attempts += 1;
      if (attempts > 25) {
        clearInterval(timer);
        return;
      }
      requestState();
    }, 300);
    return () => clearInterval(timer);
  }, [reloadToken, page, requestState]);

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

  /** A drag: one edit that says where the block ended up. */
  function moveTo(lumenId: string, beforeLumenId: string | null) {
    queue({ kind: 'moveTo', lumenId, beforeLumenId });
    post({ type: 'preview-move-to', lumenId, beforeLumenId });
  }

  /**
   * Rewrites the selected section, on the server, as its own version.
   *
   * Not queued with the rest. The replacement is markup, and markup the browser
   * supplied must never reach a published page — so the browser names a section
   * and the server decides what it becomes. Being its own version also means it
   * is one thing to undo rather than something tangled into a pending save.
   */
  async function rewrite(lumenId: string, instruction: string | null) {
    const response = await fetch(`/api/projects/${projectId}/rewrite`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ page, lumenId, instruction }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? 'That rewrite failed');

    setSelection(null);
    setNotice('Section rewritten and saved. Undo it from version history.');
    onReload();
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

  /**
   * Adds a section and shows it straight away.
   *
   * The markup is fetched from the server rather than written here — the browser
   * never authors what ends up in a published site — and the save renders the
   * same section again from the same id and uid, so what you see before saving
   * is what you keep.
   */
  async function addBlock(blockId: string, options: { imageUrl?: string; videoUrl?: string }) {
    const uid = Math.random().toString(36).slice(2, 8).replace(/[^a-z0-9]/g, '0');
    const afterLumenId = selection?.lumenId ?? null;

    queue({ kind: 'insert', afterLumenId, blockId, uid, ...options });
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/blocks`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ blockId, uid, ...options }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not draw that section');
      post({ type: 'preview-insert', lumenId: afterLumenId, html: payload.html });
      setNotice('Section added. Edit it here, then Save.');
    } catch (cause) {
      // The edit is still queued, so Save will produce it either way.
      setNotice('Section queued. Save to put it on the page.');
      setError(cause instanceof Error ? cause.message : null);
    }
  }

  function editLink(href: string) {
    if (!selection) return;
    queue({ kind: 'link', lumenId: selection.lumenId, href });
    post({ type: 'preview-link', lumenId: selection.lumenId, value: href });
    setSelection({ ...selection, href });
  }

  function editFont(role: 'display' | 'body', family: string, googleHref: string | null) {
    queue({ kind: 'font', role, family, googleHref });
    post({
      type: 'preview-token',
      name: role === 'display' ? '--font-display' : '--font-body',
      value: family,
    });
    if (googleHref) post({ type: 'preview-font-link', href: googleHref });
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
      onReload();
      return payload.appliedEdits as number;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save those changes');
      return null;
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setPending([]);
    setSelection(null);
    setNotice(null);
    setError(null);
    onReload();
  }

  /** Select a block by id, and highlight it in the page. */
  const select = useCallback(
    (lumenId: string) => {
      post({ type: 'select', lumenId });
    },
    [post],
  );

  return {
    blocks,
    selection,
    palette,
    pending,
    saving,
    notice,
    error,
    awaitingOutline,
    setNotice,
    setError,
    requestState,
    select,
    editText,
    editStyle,
    editImage,
    editLink,
    editFont,
    editToken,
    move,
    moveTo,
    duplicate,
    remove,
    addBlock,
    rewrite,
    save,
    discard,
  };
}

/** So a component can name the shape without re-deriving it. */
export type SiteEditing = ReturnType<typeof useSiteEditing>;

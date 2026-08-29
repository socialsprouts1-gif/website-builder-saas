'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CodeWindow } from '@/components/ui/CodeWindow';
import { PromptBar } from '@/components/ui/PromptBar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/components/ui/cn';
import { VisualEditorPanel } from '@/components/app/VisualEditorPanel';
import type { ModelOption } from '@/lib/openai/models';

export interface WorkspaceMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface WorkspaceVersion {
  id: string;
  version_number: number;
  label: string | null;
  source: string;
  created_at: string;
}

type Mode = 'chat' | 'visual';
type Viewport = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTH: Record<Viewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '390px',
};

export function Workspace({
  projectId,
  projectName,
  initialStatus,
  initialMessages,
  initialVersions,
  pages,
  models,
  activeModel,
  initialJobId,
}: {
  projectId: string;
  projectName: string;
  initialStatus: string;
  initialMessages: WorkspaceMessage[];
  initialVersions: WorkspaceVersion[];
  pages: string[];
  models: { quality: ModelOption | null; fast: ModelOption | null; all: ModelOption[] };
  activeModel: string | null;
  initialJobId: string | null;
}) {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('chat');
  const [messages, setMessages] = useState<WorkspaceMessage[]>(initialMessages);
  const [versions, setVersions] = useState<WorkspaceVersion[]>(initialVersions);
  const [input, setInput] = useState('');
  const [model, setModel] = useState(activeModel ?? models.quality?.id ?? '');
  const [busy, setBusy] = useState(initialStatus === 'generating');
  const [progress, setProgress] = useState<string | null>(
    initialStatus === 'generating' ? 'Starting up…' : null,
  );
  const [streamPreview, setStreamPreview] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [page, setPage] = useState(pages[0] ?? 'index.html');
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [ready, setReady] = useState(initialStatus === 'ready');

  const logRef = useRef<HTMLDivElement>(null);
  const generationStarted = useRef(false);

  const scrollLog = useCallback(() => {
    requestAnimationFrame(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, []);

  useEffect(scrollLog, [messages, progress, scrollLog]);

  const refreshPreview = useCallback(() => {
    setPreviewKey((key) => key + 1);
    router.refresh();
  }, [router]);

  // ---- initial generation ---------------------------------------------------
  useEffect(() => {
    if (!initialJobId || generationStarted.current || initialStatus !== 'generating') return;
    generationStarted.current = true;

    const source = new EventSource(`/api/generate/${initialJobId}/stream`);

    source.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'ping') return;

      if (payload.type === 'stage' || payload.type === 'file') {
        setProgress(payload.message ?? payload.stage ?? null);
      }
      if (payload.type === 'token') {
        setStreamPreview((current) => (current + payload.delta).slice(-2200));
      }
      if (payload.type === 'meta' && payload.substituted) {
        setError(`That model was unavailable — Lumen used ${payload.model} instead.`);
      }
      if (payload.type === 'done') {
        setProgress(null);
        setStreamPreview('');
        setBusy(false);
        setReady(true);
        source.close();
        refreshPreview();
      }
      if (payload.type === 'error') {
        setError(payload.message ?? 'Generation failed');
        setProgress(null);
        setBusy(false);
        source.close();
      }
    };

    source.onerror = () => {
      source.close();
      setBusy(false);
      setProgress(null);
      setError('The connection dropped. Reload to see where it got to.');
    };

    return () => source.close();
  }, [initialJobId, initialStatus, refreshPreview]);

  // ---- chat iteration -------------------------------------------------------
  async function sendMessage(text: string, source: 'chat' | 'voice' = 'chat') {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setError(null);
    setBusy(true);
    setInput('');
    setProgress('Applying your change…');
    setMessages((current) => [
      ...current,
      { id: `local-${Date.now()}`, role: 'user', content: trimmed },
    ]);

    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: trimmed, model: model || null, source }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({ error: 'That edit failed' }));
        throw new Error(payload.error ?? 'That edit failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const raw = buffer.slice(0, boundary).replace(/^data: /, '');
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');
          if (!raw.trim()) continue;

          const payload = JSON.parse(raw);
          if (payload.type === 'ping') continue;
          if (payload.type === 'stage') setProgress(payload.message ?? null);
          if (payload.type === 'token') setStreamPreview((current) => (current + payload.delta).slice(-2200));
          if (payload.type === 'error') throw new Error(payload.message);
          if (payload.type === 'done') {
            setMessages((current) => [
              ...current,
              { id: payload.versionId, role: 'assistant', content: payload.message },
            ]);
            setVersions((current) => [
              {
                id: payload.versionId,
                version_number: (current[0]?.version_number ?? 0) + 1,
                label: null,
                source: 'chat',
                created_at: new Date().toISOString(),
              },
              ...current,
            ]);
            refreshPreview();
          }
        }
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'That edit failed';
      setError(message);
      setMessages((current) => [
        ...current,
        { id: `err-${Date.now()}`, role: 'assistant', content: `I could not apply that: ${message}` },
      ]);
    } finally {
      setBusy(false);
      setProgress(null);
      setStreamPreview('');
    }
  }

  async function revert(versionId: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/versions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not restore that version');
      refreshPreview();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not restore that version');
    } finally {
      setBusy(false);
    }
  }

  const previewSrc = `/preview/${projectId}/${page}?k=${previewKey}${mode === 'visual' ? '&editor=1' : ''}`;

  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[380px_minmax(0,1fr)] lg:grid-rows-1">
      {/* ---- left pane: chat / visual editor ---- */}
      <div className="flex min-h-0 flex-col border-hairline lg:border-r">
        <div className="flex gap-1 border-b border-hairline p-3">
          {(['chat', 'visual'] as Mode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              disabled={!ready && item === 'visual'}
              className={cn(
                'flex-1 rounded-pill px-3 py-2 text-[13px] transition disabled:opacity-40',
                mode === item ? 'bg-accent text-accent-ink' : 'text-ink-secondary hover:text-ink-primary',
              )}
            >
              {item === 'chat' ? 'Chat' : 'Visual edit'}
            </button>
          ))}
        </div>

        {mode === 'chat' ? (
          <>
            <div ref={logRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'rounded-[12px] px-3.5 py-2.5 text-[13.5px] leading-relaxed',
                    message.role === 'user'
                      ? 'ml-8 bg-accent-soft text-ink-primary'
                      : 'mr-4 border border-hairline bg-raised text-ink-secondary',
                  )}
                >
                  {message.content}
                </div>
              ))}

              {progress ? (
                <div className="mr-4 space-y-2 rounded-[12px] border border-hairline bg-raised px-3.5 py-3">
                  <p className="flex items-center gap-2 text-[13px] text-accent">
                    <span className="h-1.5 w-1.5 animate-pulse-dot rounded-pill bg-accent" />
                    {progress}
                  </p>
                  {streamPreview ? (
                    <pre className="max-h-40 overflow-hidden whitespace-pre-wrap break-all font-mono text-[10.5px] leading-relaxed text-ink-muted">
                      {streamPreview}
                    </pre>
                  ) : null}
                </div>
              ) : null}

              {error ? (
                <p className="rounded-[12px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-3.5 py-2.5 text-[13px] text-[#e5735a]">
                  {error}
                </p>
              ) : null}

              {versions.length > 0 ? (
                <details className="rounded-[12px] border border-hairline bg-raised px-3.5 py-3">
                  <summary className="cursor-pointer text-[12.5px] text-ink-muted">
                    Version history ({versions.length})
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {versions.map((version, index) => (
                      <li key={version.id} className="flex items-center justify-between gap-3">
                        <span className="truncate text-[12.5px] text-ink-secondary">
                          {version.label ?? `v${version.version_number}`}
                        </span>
                        {index === 0 ? (
                          <Badge className="px-2 py-0.5 text-[10px]">current</Badge>
                        ) : (
                          <button
                            type="button"
                            onClick={() => revert(version.id)}
                            disabled={busy}
                            className="shrink-0 text-[12px] text-accent transition hover:underline disabled:opacity-40"
                          >
                            restore
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>

            <div className="space-y-2 border-t border-hairline p-3">
              <PromptBar
                value={input}
                onChange={setInput}
                onSubmit={() => sendMessage(input)}
                busy={busy}
                disabled={!ready}
                placeholder={ready ? 'Make the hero darker…' : 'Building your site…'}
                submitLabel="Send"
              />
              <label className="flex items-center justify-between gap-2 px-1 text-[11.5px] text-ink-muted">
                <span>Model</span>
                <select
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  className="max-w-[62%] truncate rounded-pill border border-hairline bg-raised px-2.5 py-1 text-[11.5px] text-ink-secondary outline-none focus:border-accent/40"
                >
                  {models.quality ? (
                    <option value={models.quality.id}>Best quality — {models.quality.label}</option>
                  ) : null}
                  {models.fast ? (
                    <option value={models.fast.id}>Fast &amp; cheap — {models.fast.label}</option>
                  ) : null}
                  <optgroup label="All models">
                    {models.all.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.id}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
            </div>
          </>
        ) : (
          <VisualEditorPanel
            projectId={projectId}
            page={page}
            onSaved={() => {
              refreshPreview();
              setMode('chat');
            }}
          />
        )}
      </div>

      {/* ---- right pane: live preview ---- */}
      <div className="flex min-h-0 flex-col bg-[var(--bg-base-deep)] p-4 lg:p-6">
        <CodeWindow
          title={`LUMEN / ${projectName.toUpperCase().replace(/\s+/g, '-')}`}
          className="flex min-h-0 flex-1 flex-col"
          bodyClassName="flex-1 min-h-0 flex justify-center overflow-auto p-0"
          actions={
            <>
              <select
                value={page}
                onChange={(event) => setPage(event.target.value)}
                className="rounded-pill border border-hairline bg-raised px-2.5 py-1 text-[11px] text-ink-secondary outline-none"
              >
                {pages.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <div className="hidden gap-0.5 sm:flex">
                {(['desktop', 'tablet', 'mobile'] as Viewport[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setViewport(item)}
                    title={item}
                    className={cn(
                      'rounded-pill px-2 py-1 text-[10.5px] uppercase tracking-[0.1em] transition',
                      viewport === item ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:text-ink-primary',
                    )}
                  >
                    {item[0]}
                  </button>
                ))}
              </div>
              <a
                href={`/preview/${projectId}/${page}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-ink-muted transition hover:text-ink-primary"
              >
                open ↗
              </a>
            </>
          }
        >
          {ready ? (
            <iframe
              key={previewKey}
              src={previewSrc}
              title={`${projectName} preview`}
              // No allow-same-origin: generated code runs in an opaque origin and
              // can never touch Lumen's cookies or DOM.
              sandbox="allow-scripts allow-forms allow-popups"
              className="h-full w-full border-0 bg-white transition-[width] duration-300"
              style={{ width: VIEWPORT_WIDTH[viewport], maxWidth: '100%' }}
            />
          ) : (
            <BuildingState progress={progress} stream={streamPreview} />
          )}
        </CodeWindow>
      </div>
    </div>
  );
}

function BuildingState({ progress, stream }: { progress: string | null; stream: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-8 py-16 text-center">
      <span className="h-2 w-2 animate-pulse-dot rounded-pill bg-accent" />
      <p className="font-display text-xl text-ink-primary">{progress ?? 'Building your site…'}</p>
      <p className="max-w-sm text-[13px] text-ink-muted">
        Lumen is writing the brief, the design system and the code. This usually takes under a minute.
      </p>
      {stream ? (
        <pre className="mt-2 max-h-48 w-full max-w-xl overflow-hidden whitespace-pre-wrap break-all rounded-[10px] border border-hairline bg-raised p-3 text-left font-mono text-[10.5px] leading-relaxed text-ink-muted">
          {stream}
        </pre>
      ) : null}
    </div>
  );
}

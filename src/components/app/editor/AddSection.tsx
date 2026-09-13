'use client';

import { useRef, useState } from 'react';
import type { BlockMenuItem } from './EditorWorkspace';

/**
 * Choosing a section to add, the way a theme editor does it.
 *
 * Grouped by what the section is for — words, pictures, layout, an action —
 * rather than listed flat, and a section that needs a picture asks for it here
 * rather than inserting a grey placeholder and leaving you to find the upload
 * button afterwards. That gap is why adding an image section appeared to have
 * no way to upload an image at all.
 */

const GROUP_ORDER = ['Text', 'Media', 'Layout', 'Action'] as const;

export function AddSection({
  blocks,
  projectId,
  belowLabel,
  onAdd,
  onCancel,
}: {
  blocks: BlockMenuItem[];
  projectId: string;
  /** What the new section lands under, named so the position is not a guess. */
  belowLabel: string | null;
  onAdd: (blockId: string, options: { imageUrl?: string; videoUrl?: string }) => void;
  onCancel: () => void;
}) {
  const [chosen, setChosen] = useState<BlockMenuItem | null>(null);

  return (
    <div className="border-t border-hairline p-3">
      <div className="flex items-baseline justify-between gap-2 px-1 pb-2">
        <p className="text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">
          {chosen ? chosen.name : 'Add a section'}
        </p>
        <button
          type="button"
          onClick={chosen ? () => setChosen(null) : onCancel}
          className="text-[11px] text-ink-muted transition hover:text-ink-primary"
        >
          {chosen ? '← Back' : 'Cancel'}
        </button>
      </div>

      {!chosen ? (
        <>
          <p className="px-1 pb-2 text-[11px] leading-relaxed text-ink-muted">
            {belowLabel ? `It goes under “${belowLabel}”.` : 'It goes at the bottom of the page.'}
          </p>
          {GROUP_ORDER.map((group) => {
            const inGroup = blocks.filter((block) => block.group === group);
            if (inGroup.length === 0) return null;
            return (
              <div key={group} className="mb-3">
                <p className="px-1 pb-1 text-[10px] uppercase tracking-[0.12em] text-ink-muted/70">
                  {group}
                </p>
                <div className="space-y-1">
                  {inGroup.map((block) => (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() =>
                        block.needs ? setChosen(block) : onAdd(block.id, {})
                      }
                      className="lumen-raise block w-full rounded-[9px] border border-hairline px-2.5 py-2 text-left"
                    >
                      <span className="block text-[12.5px] text-ink-primary">{block.name}</span>
                      <span className="block text-[11px] leading-relaxed text-ink-muted">
                        {block.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      ) : chosen.needs === 'image' ? (
        <ImageStep projectId={projectId} onAdd={(imageUrl) => onAdd(chosen.id, { imageUrl })} />
      ) : (
        <VideoStep onAdd={(videoUrl) => onAdd(chosen.id, { videoUrl })} />
      )}
    </div>
  );
}

function ImageStep({
  projectId,
  onAdd,
}: {
  projectId: string;
  onAdd: (imageUrl?: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(`/api/projects/${projectId}/assets`, {
        method: 'POST',
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'That upload failed');
      setUrl(payload.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2.5 px-1">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="lumen-well flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-hairline transition hover:border-accent/40 disabled:opacity-50"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full rounded-[9px] object-cover" />
        ) : (
          <>
            <span className="text-[12.5px] text-ink-secondary">
              {busy ? 'Uploading…' : 'Choose a picture'}
            </span>
            <span className="text-[10.5px] text-ink-muted">PNG, JPG, WEBP or SVG</span>
          </>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = '';
        }}
      />

      {error ? <p className="text-[11px] text-[#e5735a]">{error}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onAdd(url ?? undefined)}
          disabled={busy}
          className="lumen-key rounded-pill px-3.5 py-1.5 text-[12px] disabled:opacity-40"
        >
          Add section
        </button>
        {!url ? (
          <button
            type="button"
            onClick={() => onAdd(undefined)}
            className="text-[11px] text-ink-muted transition hover:text-ink-secondary"
          >
            Add it without a picture
          </button>
        ) : null}
      </div>
    </div>
  );
}

function VideoStep({ onAdd }: { onAdd: (videoUrl?: string) => void }) {
  const [url, setUrl] = useState('');

  return (
    <div className="space-y-2.5 px-1">
      <input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://youtu.be/…"
        inputMode="url"
        spellCheck={false}
        className="lumen-well w-full rounded-[10px] border border-hairline px-3 py-2 text-[12.5px] text-ink-primary outline-none focus:border-accent/50"
      />
      <p className="text-[10.5px] leading-relaxed text-ink-muted">
        A YouTube or Vimeo link. Lumen turns it into an embed itself — nothing else is accepted.
      </p>
      <button
        type="button"
        onClick={() => onAdd(url.trim() || undefined)}
        className="lumen-key rounded-pill px-3.5 py-1.5 text-[12px]"
      >
        Add section
      </button>
    </div>
  );
}

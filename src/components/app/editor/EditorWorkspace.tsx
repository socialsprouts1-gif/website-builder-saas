'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Field';
import { cn } from '@/components/ui/cn';
import { LayersPanel } from './LayersPanel';
import { Inspector } from './Inspector';
import { ThemePanel } from './ThemePanel';
import { AddSection } from './AddSection';
import { describeEdit } from '@/lib/generation/html-edit';
import { useSiteEditing } from './useSiteEditing';
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
  const [showBlocks, setShowBlocks] = useState(false);
  const [rail, setRail] = useState<'sections' | 'theme'>('sections');
  const [frameKey, setFrameKey] = useState(0);
  /**
   * Which of the three panes a phone is looking at.
   *
   * Ignored from `lg` up, where all three are on screen. Below it they were a
   * single-column grid of three panes that each measure to nothing, which is
   * the same collapse the workspace had: a toolbar, then a long emptiness.
   */
  const [pane, setPane] = useState<'rail' | 'canvas' | 'inspector'>('canvas');

  const reload = useCallback(() => {
    setFrameKey((key) => key + 1);
    router.refresh();
  }, [router]);

  // The editing itself lives in a hook, because the workspace's own Visual edit
  // tab is this same editor rather than a second one that behaves differently.
  const editing = useSiteEditing({
    projectId,
    page,
    frameRef,
    reloadToken: frameKey,
    onReload: reload,
  });

  const {
    blocks,
    selection,
    palette,
    pending,
    saving,
    notice,
    error,
    awaitingOutline,
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
    rewrite,
    save,
    discard,
  } = editing;

  async function addBlock(blockId: string, options: { imageUrl?: string; videoUrl?: string }) {
    setShowBlocks(false);
    await editing.addBlock(blockId, options);
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline px-3 py-2.5 sm:px-4">
        <div className="w-36 sm:w-44">
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

      <div className="flex min-h-0 flex-col lg:grid lg:grid-cols-[228px_minmax(0,1fr)_280px]">
        {/* Phone only; display:none takes it out of the grid entirely. */}
        <div className="flex shrink-0 gap-1 border-b border-hairline p-2 lg:hidden">
          {(
            [
              { id: 'rail', label: 'Blocks' },
              { id: 'canvas', label: 'Page' },
              { id: 'inspector', label: 'Edit' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPane(item.id)}
              className={cn(
                'flex-1 rounded-pill px-2 py-2 text-[12.5px] transition',
                pane === item.id ? 'bg-accent text-accent-ink' : 'text-ink-secondary',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          className={cn(
            'min-h-0 flex-1 flex-col overflow-y-auto border-hairline lg:flex lg:border-r',
            pane === 'rail' ? 'flex' : 'hidden',
          )}
        >
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
                onSelect={(lumenId) => {
                  select(lumenId);
                  // On a phone the Edit panel is a different screen, and
                  // selecting a block with nothing visibly happening reads as
                  // the tap not working.
                  if (window.innerWidth < 1024) setPane('inspector');
                }}
                onMove={move}
                onMoveTo={moveTo}
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
            <ThemePanel
              palette={palette}
              onToken={editToken}
              onFont={editFont}
              loading={awaitingOutline}
              projectId={projectId}
              onLookApplied={() => {
                // Saved on the server, so the pending queue knows nothing about
                // it — the frame has to be reloaded rather than nudged.
                editing.setNotice('New look applied and saved.');
                reload();
              }}
            />
          )}
        </div>

        <div
          className={cn(
            'min-h-0 flex-1 justify-center overflow-auto bg-[var(--bg-base-deep)] p-2 sm:p-4 lg:flex',
            pane === 'canvas' ? 'flex' : 'hidden',
          )}
        >
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

        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto border-hairline lg:block lg:border-l',
            pane === 'inspector' ? 'block' : 'hidden',
          )}
        >
          <Inspector
            selection={selection}
            projectId={projectId}
            palette={palette}
            pages={pages}
            onText={editText}
            onStyle={editStyle}
            onImage={editImage}
            onLink={editLink}
            onRemove={() => selection && remove(selection.lumenId)}
            onDuplicate={() => selection && duplicate(selection.lumenId)}
            onRewrite={async (instruction) => {
              if (selection) await rewrite(selection.lumenId, instruction);
            }}
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

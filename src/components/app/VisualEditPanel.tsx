'use client';

import { useEffect, useState, type RefObject } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/components/ui/cn';
import { LayersPanel } from '@/components/app/editor/LayersPanel';
import { Inspector } from '@/components/app/editor/Inspector';
import { ThemePanel } from '@/components/app/editor/ThemePanel';
import { AddSection } from '@/components/app/editor/AddSection';
import { useSiteEditing } from '@/components/app/editor/useSiteEditing';
import type { BlockMenuItem } from '@/components/app/editor/EditorWorkspace';
import { describeEdit } from '@/lib/generation/html-edit';

/**
 * Point-and-click editing, in the workspace's own side panel.
 *
 * It is the editor at /app/project/[id]/editor, driving the preview that is
 * already on screen — the same hook, the same components, the same save. What
 * used to be here was a second, thinner editor that listened for a selection
 * and never asked the page for anything: no list of blocks, no palette, and a
 * single unprompted push from the page that could easily land before the
 * listener existed. So the panel opened empty, and clicking the preview often
 * left it empty, which is exactly how it looked from the outside — a tab with
 * nothing in it.
 *
 * Three columns will not fit in 380px, so they become three tabs. Blocks is
 * first because it is the one that is populated the moment the panel opens, and
 * a panel that shows you the page is a panel you can tell is working.
 */
export function VisualEditPanel({
  projectId,
  projectName,
  page,
  pages,
  blockMenu,
  frameRef,
  frameLoad,
  reloadToken,
  onReload,
}: {
  projectId: string;
  projectName: string;
  page: string;
  pages: string[];
  blockMenu: BlockMenuItem[];
  frameRef: RefObject<HTMLIFrameElement | null>;
  /**
   * Somewhere to leave "ask the page for its outline", so the frame's own load
   * event can call it. The timed retries below cover a frame that is already
   * up; this covers one that takes longer to load than they run for.
   */
  frameLoad: RefObject<(() => void) | null>;
  reloadToken: number;
  onReload: () => void;
}) {
  const [tab, setTab] = useState<'blocks' | 'edit' | 'design'>('blocks');
  const [adding, setAdding] = useState(false);

  const editing = useSiteEditing({ projectId, page, frameRef, reloadToken, onReload });
  const { blocks, selection, palette, pending, saving, notice, error, requestState } = editing;

  useEffect(() => {
    frameLoad.current = requestState;
    return () => {
      frameLoad.current = null;
    };
  }, [frameLoad, requestState]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1 border-b border-hairline p-2">
        {(
          [
            { id: 'blocks', label: `Blocks${blocks.length > 0 ? ` (${blocks.length})` : ''}` },
            { id: 'edit', label: 'Edit' },
            { id: 'design', label: 'Design' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'flex-1 rounded-[8px] px-2 py-1.5 text-[11.5px] transition',
              tab === item.id ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:text-ink-primary',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="shrink-0 border-b border-hairline px-4 py-2.5 text-[12px] leading-relaxed text-ink-muted">
        Click anything in <strong className="text-ink-secondary">{projectName}</strong> to select it, or
        pick a block below. Nothing is written to your site until you save.
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'blocks' ? (
          <>
            <LayersPanel
              blocks={blocks}
              selected={selection?.lumenId ?? null}
              onSelect={(lumenId) => {
                editing.select(lumenId);
                // Selecting with nothing visibly happening in this column reads
                // as the tap not working.
                setTab('edit');
              }}
              onMove={editing.move}
              onMoveTo={editing.moveTo}
              onDuplicate={editing.duplicate}
              onRemove={editing.remove}
              onAdd={() => setAdding((value) => !value)}
              loading={editing.awaitingOutline}
            />
            {adding ? (
              <AddSection
                blocks={blockMenu}
                projectId={projectId}
                belowLabel={selection?.label ?? null}
                onAdd={(blockId, options) => {
                  setAdding(false);
                  void editing.addBlock(blockId, options);
                }}
                onCancel={() => setAdding(false)}
              />
            ) : null}
          </>
        ) : null}

        {tab === 'edit' ? (
          <Inspector
            selection={selection}
            projectId={projectId}
            palette={palette}
            pages={pages}
            onText={editing.editText}
            onStyle={editing.editStyle}
            onImage={editing.editImage}
            onLink={editing.editLink}
            onRemove={() => selection && editing.remove(selection.lumenId)}
            onDuplicate={() => selection && editing.duplicate(selection.lumenId)}
            onRewrite={async (instruction) => {
              if (selection) await editing.rewrite(selection.lumenId, instruction);
            }}
          />
        ) : null}

        {tab === 'design' ? (
          <ThemePanel
            palette={palette}
            onToken={editing.editToken}
            onFont={editing.editFont}
            loading={editing.awaitingOutline}
            projectId={projectId}
            onLookApplied={() => {
              // Saved on the server already, so the queue knows nothing about
              // it — the frame has to be reloaded rather than nudged.
              editing.setNotice('New look applied and saved.');
              onReload();
            }}
          />
        ) : null}

        {pending.length > 0 ? (
          <div className="border-t border-hairline p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Not saved yet</p>
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

      <div className="flex shrink-0 items-center gap-2 border-t border-hairline p-3">
        {pending.length > 0 ? (
          <Badge tone="accent">{pending.length} unsaved</Badge>
        ) : notice ? (
          <span className="truncate text-[11.5px] text-accent">{notice}</span>
        ) : null}
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={editing.discard}
            disabled={saving || pending.length === 0}
          >
            Discard
          </Button>
          <Button size="sm" onClick={() => void editing.save()} disabled={saving || pending.length === 0}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { cn } from '@/components/ui/cn';
import { Button } from '@/components/ui/Button';

export interface OutlineBlock {
  lumenId: string;
  tag: string;
  label: string;
}

/**
 * The page as a list of blocks, reorderable by dragging.
 *
 * Drag uses the native HTML5 API rather than a library: the list is short, the
 * rows are plain elements, and a dependency here would be all cost.
 */
export function LayersPanel({
  blocks,
  selected,
  onSelect,
  onMove,
  onDuplicate,
  onRemove,
  onAdd,
  loading,
}: {
  blocks: OutlineBlock[];
  loading?: boolean;
  selected: string | null;
  onSelect: (lumenId: string) => void;
  onMove: (lumenId: string, direction: 'up' | 'down') => void;
  onDuplicate: (lumenId: string) => void;
  onRemove: (lumenId: string) => void;
  onAdd: () => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  /** Dropping onto a row moves the dragged block to that row's position. */
  function drop(targetId: string) {
    if (!dragging || dragging === targetId) return;
    const from = blocks.findIndex((block) => block.lumenId === dragging);
    const to = blocks.findIndex((block) => block.lumenId === targetId);
    if (from === -1 || to === -1) return;

    const direction = to > from ? 'down' : 'up';
    for (let step = 0; step < Math.abs(to - from); step += 1) {
      onMove(dragging, direction);
    }
    setDragging(null);
    setOver(null);
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <span className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Blocks</span>
        <Button size="sm" variant="secondary" onClick={onAdd}>
          + Add
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {blocks.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12.5px] text-ink-muted">
            {loading ? 'Reading the page…' : 'No editable blocks on this page.'}
          </p>
        ) : (
          blocks.map((block, index) => (
            <div
              key={block.lumenId}
              draggable
              onDragStart={() => setDragging(block.lumenId)}
              onDragEnd={() => {
                setDragging(null);
                setOver(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setOver(block.lumenId);
              }}
              onDrop={(event) => {
                event.preventDefault();
                drop(block.lumenId);
              }}
              onClick={() => onSelect(block.lumenId)}
              className={cn(
                'group cursor-grab rounded-[9px] border px-2.5 py-2 transition active:cursor-grabbing',
                selected === block.lumenId
                  ? 'border-accent/45 bg-accent-soft'
                  : 'border-transparent hover:bg-white/5',
                over === block.lumenId && dragging !== block.lumenId && 'border-accent/60',
                dragging === block.lumenId && 'opacity-40',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="select-none text-[12px] leading-none text-ink-muted" aria-hidden>
                  ⠿
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-[12.5px]',
                    selected === block.lumenId ? 'text-accent' : 'text-ink-secondary',
                  )}
                >
                  {block.label}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-ink-muted">{block.tag}</span>
              </div>

              <div className="mt-1.5 hidden gap-1 group-hover:flex">
                <RowAction label="↑" title="Move up" disabled={index === 0} onClick={() => onMove(block.lumenId, 'up')} />
                <RowAction
                  label="↓"
                  title="Move down"
                  disabled={index === blocks.length - 1}
                  onClick={() => onMove(block.lumenId, 'down')}
                />
                <RowAction label="⧉" title="Duplicate" onClick={() => onDuplicate(block.lumenId)} />
                <RowAction label="✕" title="Delete" danger onClick={() => onRemove(block.lumenId)} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RowAction({
  label,
  title,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        'rounded-[6px] border border-hairline px-1.5 py-0.5 text-[11px] leading-none transition disabled:opacity-30',
        danger ? 'text-[#e5735a] hover:bg-[#e5735a]/10' : 'text-ink-muted hover:bg-white/5 hover:text-ink-primary',
      )}
    >
      {label}
    </button>
  );
}
